# ml/app.py
from __future__ import annotations

import io
import json
import os
import uuid
import shutil
import base64
import requests
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient
import torch
from ultralytics import YOLO
import numpy as np
from pdf_processor import PDFProcessor

# ------------------------------------------------------------------------------
# Env & constants
# ------------------------------------------------------------------------------

load_dotenv()

# Room Detection Model - detects only rooms
ROOM_API_KEY = os.getenv("ROOM_API_KEY", "")
ROOM_WORKSPACE = os.getenv("ROOM_WORKSPACE", "")
ROOM_PROJECT = os.getenv("ROOM_PROJECT", "")  # room-detection-r0fta
ROOM_VERSION = os.getenv("ROOM_VERSION", "")

# Wall Detection Model - detects only walls
WALL_API_KEY = os.getenv("WALL_API_KEY", "")
WALL_WORKSPACE = os.getenv("WALL_WORKSPACE", "")
WALL_PROJECT = os.getenv("WALL_PROJECT", "")  
WALL_VERSION = os.getenv("WALL_VERSION", "")

# Door & Window Model - detects doors and windows (filters out room/wall from this model)
DOORWINDOW_API_KEY = os.getenv("DOORWINDOW_API_KEY", "")
DOORWINDOW_WORKSPACE = os.getenv("DOORWINDOW_WORKSPACE", "")
DOORWINDOW_PROJECT = os.getenv("DOORWINDOW_PROJECT", "")  # mytool-i6igr
DOORWINDOW_VERSION = os.getenv("DOORWINDOW_VERSION", "")

# Construct model IDs from environment variables
# Format: "project_id/model_version_id" (as expected by the API)
ROOM_MODEL_ID = ""
if ROOM_PROJECT and ROOM_VERSION:
    ROOM_MODEL_ID = f"{ROOM_PROJECT}/{ROOM_VERSION}"

# Load custom room detection model if available
CUSTOM_ROOM_MODEL = None
CUSTOM_ROOM_MODEL_PATH = os.getenv("CUSTOM_ROOM_MODEL_PATH")
if CUSTOM_ROOM_MODEL_PATH and os.path.exists(CUSTOM_ROOM_MODEL_PATH):
    try:
        CUSTOM_ROOM_MODEL = YOLO(CUSTOM_ROOM_MODEL_PATH)
        print(f"[ML] Loaded custom room detection model from {CUSTOM_ROOM_MODEL_PATH}")
    except Exception as e:
        print(f"[WARNING] Failed to load custom room detection model: {e}")

WALL_MODEL_ID = ""
if WALL_PROJECT and WALL_VERSION:
    WALL_MODEL_ID = f"{WALL_PROJECT}/{WALL_VERSION}"

DOORWINDOW_MODEL_ID = ""
if DOORWINDOW_PROJECT and DOORWINDOW_VERSION:
    DOORWINDOW_MODEL_ID = f"{DOORWINDOW_PROJECT}/{DOORWINDOW_VERSION}"

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/opt/render/project/src/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# PDF uploads directory
PDF_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "pdfs")
os.makedirs(PDF_UPLOAD_DIR, exist_ok=True)

# Page Classification Model Configuration (Roboflow)
PAGE_API_KEY = os.getenv("PAGE_API_KEY", "")
PAGE_PROJECT = os.getenv("PAGE_PROJECT", "")
PAGE_VERSION = os.getenv("PAGE_VERSION", "")

# Initialize PDF processor (will be configured with classify_fn after _classify_image is defined)
pdf_processor = None

# Custom YOLO model for ensemble learning (optional)
CUSTOM_WINDOW_MODEL_PATH = os.getenv("CUSTOM_WINDOW_MODEL_PATH", "")
CUSTOM_WINDOW_MODEL = None

# Try to load custom YOLO model if path is provided
print(f"[ML] DEBUG: CUSTOM_WINDOW_MODEL_PATH = {CUSTOM_WINDOW_MODEL_PATH}")
print(f"[ML] DEBUG: Path exists? {os.path.exists(CUSTOM_WINDOW_MODEL_PATH) if CUSTOM_WINDOW_MODEL_PATH else 'No path set'}")

if CUSTOM_WINDOW_MODEL_PATH and os.path.exists(CUSTOM_WINDOW_MODEL_PATH):
    try:
        import time
        start_time = time.time()
        from ultralytics import YOLO
        CUSTOM_WINDOW_MODEL = YOLO(CUSTOM_WINDOW_MODEL_PATH)
        load_time = time.time() - start_time
        print(f"[ML] SUCCESS: Loaded custom window model from: {CUSTOM_WINDOW_MODEL_PATH}")
        print(f"[ML] Model loading took {load_time:.2f} seconds")
    except Exception as e:
        print(f"[ML] WARNING: Failed to load custom window model: {e}")
        CUSTOM_WINDOW_MODEL = None
else:
    print("[ML] INFO: Custom window model not configured (set CUSTOM_WINDOW_MODEL_PATH in .env)")
    if CUSTOM_WINDOW_MODEL_PATH:
        print(f"[ML] ERROR: Path set but file not found: {CUSTOM_WINDOW_MODEL_PATH}")

# ------------------------------------------------------------------------------
# App
# ------------------------------------------------------------------------------

app = FastAPI(title="AIEstimAgent — ML API", version="1.0.0")

# CORS configuration for production
default_origins = [
    "https://estimagent.vercel.app",
    "http://localhost:5173",
    "http://localhost:5001",
    "http://localhost:8000",
    "https://aiestimagent-api.onrender.com"
]

# Use environment variable if set, otherwise use default allowed origins
cors_origins = os.getenv("CORS_ALLOW_ORIGINS")
if cors_origins:
    # Parse from env and merge with defaults to ensure Vercel is always included
    env_origins = [origin.strip() for origin in cors_origins.split(",")]
    allowed_origins = list(set(default_origins + env_origins))  # Remove duplicates
else:
    allowed_origins = default_origins

print(f"[ML] CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Mount PDF uploads directory for serving images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Startup event
@app.on_event("startup")
async def startup_event():
    print("[ML] 🚀 ML Service starting up...")
    print(f"[ML] 📁 Upload directory: {UPLOAD_DIR}")
    print(f"[ML] 📄 PDF upload directory: {PDF_UPLOAD_DIR}")
    print(f"[ML] 🏠 Room model: {ROOM_MODEL_ID or 'Custom YOLO'}")
    print(f"[ML] 🧱 Wall model: {WALL_MODEL_ID or 'Not configured'}")
    print(f"[ML] 🚪 Door/Window model: {DOORWINDOW_MODEL_ID or 'Not configured'}")
    print(f"[ML] 📋 Page classifier: {PAGE_PROJECT or 'Not configured'}")
    print("[ML] ✅ ML Service ready!")

# ------------------------------------------------------------------------------
# Utilities
# ------------------------------------------------------------------------------

def _get_client(api_key: Optional[str] = None) -> InferenceHTTPClient:
    """Get Roboflow inference client with API key."""
    key = (api_key or ROOM_API_KEY or WALL_API_KEY or DOORWINDOW_API_KEY or "").strip()
    if not key:
        raise RuntimeError(
            "Missing API KEY. Set ROOM_API_KEY, WALL_API_KEY, or DOORWINDOW_API_KEY in your .env file."
        )
    return InferenceHTTPClient(
        api_url="https://detect.roboflow.com",
        api_key=key,
    )


def _image_size_from_bytes(data: bytes) -> tuple[int, int]:
    """Get image dimensions from bytes with robust error handling."""
    try:
        # Create BytesIO object and ensure it's at the beginning
        img_buffer = io.BytesIO(data)
        img_buffer.seek(0)
        
        # Try to open and verify the image
        with Image.open(img_buffer) as im:
            # Verify the image by loading it
            im.verify()
            
        # Reopen for actual size reading (verify() closes the image)
        img_buffer.seek(0)
        with Image.open(img_buffer) as im:
            width, height = im.size
            if width <= 0 or height <= 0:
                raise ValueError(f"Invalid image dimensions: {width}x{height}")
            return width, height
            
    except Exception as e:
        # Log the error for debugging
        print(f"[ERROR] Failed to read image: {str(e)}")
        print(f"[ERROR] Data length: {len(data)} bytes")
        print(f"[ERROR] First 20 bytes: {data[:20]}")
        raise HTTPException(
            status_code=400,
            detail=f"Cannot identify image file. Please ensure the file is a valid image (PNG, JPG, etc.). Error: {str(e)}"
        )

def _calculate_polygon_area(points: List[Dict[str, float]]) -> float:
    """Calculate area of a polygon using the shoelace formula."""
    if len(points) < 3:
        return 0.0
    
    area = 0.0
    n = len(points)
    for i in range(n):
        j = (i + 1) % n
        area += points[i]["x"] * points[j]["y"]
        area -= points[j]["x"] * points[i]["y"]
    return abs(area) / 2.0

def _calculate_polygon_perimeter(points: List[Dict[str, float]]) -> float:
    """Calculate perimeter of a polygon."""
    if len(points) < 2:
        return 0.0
    
    perimeter = 0.0
    n = len(points)
    for i in range(n):
        j = (i + 1) % n
        dx = points[j]["x"] - points[i]["x"]
        dy = points[j]["y"] - points[i]["y"]
        perimeter += (dx * dx + dy * dy) ** 0.5
    return perimeter

def _convert_to_real_units(pixel_value: float, scale: Optional[float], unit: str = "sq ft") -> float:
    """Convert pixel measurements to real-world units using scale factor.
    
    Scale represents the drawing scale factor:
    - For 1/4" = 1' scale: scale = 0.25 (1/4 inch on drawing = 1 foot in reality)
    
    Assumption: The drawing is scanned/uploaded at approximately 96 DPI (standard screen resolution)
    - At 96 DPI: 1 inch on drawing = 96 pixels
    - For 1/4" = 1' scale: 1 foot in reality = 0.25" on drawing = 24 pixels
    - Therefore: 1 pixel = 1/(96 * scale) feet = 1/24 feet ≈ 0.042 feet for 1/4" scale
    """
    if not scale or scale <= 0:
        return pixel_value
    
    # Assume 96 DPI (pixels per inch) for scanned drawings
    # This is a reasonable default for screen-resolution images
    DPI = 96.0
    
    # Calculate feet per pixel:
    # - scale is in inches per foot (e.g., 0.25 for 1/4" = 1')
    # - scale * DPI gives pixels per foot
    # - 1 / (scale * DPI) gives feet per pixel
    pixels_per_foot = scale * DPI
    feet_per_pixel = 1.0 / pixels_per_foot if pixels_per_foot > 0 else 0.0
    
    if unit == "sq ft":
        # For area: square the conversion factor
        return pixel_value * (feet_per_pixel ** 2)
    else:  # linear measurements (perimeter, length, width, height)
        # For length: direct multiplication
        return pixel_value * feet_per_pixel

def _normalize_predictions(
    raw: Dict[str, Any],
    img_w: int,
    img_h: int,
    filter_classes: Optional[List[str]] = None,
    scale: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Normalize Roboflow predictions and optionally filter by class names.
    
    Args:
        raw: Raw response from Roboflow API
        img_w: Image width
        img_h: Image height
        filter_classes: If provided, only include predictions with these class names
        scale: Scale factor for converting pixels to real-world units
    """
    preds = raw.get("predictions", []) or raw.get("data", {}).get("predictions", [])
    out: List[Dict[str, Any]] = []
    
    for p in preds:
        class_name = p.get("class") or p.get("label")
        
        # Filter by class if specified
        if filter_classes and class_name not in filter_classes:
            continue
            
        # Generate unique ID for this detection
        item_id = str(uuid.uuid4())
        
        item: Dict[str, Any] = {
            "id": item_id,
            "class": class_name,
            "confidence": float(p.get("confidence", 0.0)),
            "category": class_name.lower() if class_name else "unknown",
            "metrics": {},
            "mask": [],
            "display": {},  # Initialize display object
        }

        # Bounding box variant (for doors, windows, etc.)
        if all(k in p for k in ("x", "y", "width", "height")):
            x = float(p["x"])
            y = float(p["y"])
            w = float(p["width"])
            h = float(p["height"])
            
            # Calculate bbox corners (x, y is center in Roboflow format)
            x1 = x - w / 2
            y1 = y - h / 2
            x2 = x + w / 2
            y2 = y + h / 2
            
            item.update(
                {
                    "bbox": {"x": x, "y": y, "w": w, "h": h},
                    "bbox_norm": {
                        "x": x / img_w if img_w else 0.0,
                        "y": y / img_h if img_h else 0.0,
                        "w": w / img_w if img_w else 0.0,
                        "h": h / img_h if img_h else 0.0,
                    },
                }
            )
            
            # Convert bounding box to polygon mask (4 corners)
            item["mask"] = [
                {"x": x1, "y": y1},  # Top-left
                {"x": x2, "y": y1},  # Top-right
                {"x": x2, "y": y2},  # Bottom-right
                {"x": x1, "y": y2},  # Bottom-left
            ]
            item["points"] = item["mask"]
            item["points_norm"] = [
                {"x": x1 / img_w, "y": y1 / img_h},
                {"x": x2 / img_w, "y": y1 / img_h},
                {"x": x2 / img_w, "y": y2 / img_h},
                {"x": x1 / img_w, "y": y2 / img_h},
            ]
            
            # Add display metrics for openings (doors/windows)
            if class_name and class_name.lower() in ["door", "window"]:
                item["display"].update({
                    "width": _convert_to_real_units(w, scale, "ft"),
                    "height": _convert_to_real_units(h, scale, "ft"),
                })

        # Polygon variant (for rooms, walls)
        if "points" in p and isinstance(p["points"], list):
            pts = p["points"]
            item["points"] = pts
            item["points_norm"] = [
                {"x": pt["x"] / img_w, "y": pt["y"] / img_h}
                for pt in pts
                if isinstance(pt, dict) and "x" in pt and "y" in pt and img_w and img_h
            ]
            # Convert points to mask format expected by frontend
            item["mask"] = [
                {"x": pt["x"], "y": pt["y"]}
                for pt in pts
                if isinstance(pt, dict) and "x" in pt and "y" in pt
            ]
            
            # Calculate area and perimeter for polygon detections
            if len(item["mask"]) >= 3:
                # Calculate in pixels first
                pixel_area = _calculate_polygon_area(item["mask"])
                pixel_perimeter = _calculate_polygon_perimeter(item["mask"])
                
                # Debug logging for room calculations
                if class_name and "room" in class_name.lower():
                    print(f"[ML] Room '{class_name}' calculation:")
                    print(f"  - Pixel area: {pixel_area:.2f} px²")
                    print(f"  - Pixel perimeter: {pixel_perimeter:.2f} px")
                    print(f"  - Scale factor: {scale}")
                    print(f"  - Pixels per foot: {scale * 96 if scale else 'N/A'}")
                
                # Add display metrics based on detection type
                if class_name and "room" in class_name.lower():
                    # For rooms: area_sqft and perimeter_ft
                    area_sqft = _convert_to_real_units(pixel_area, scale, "sq ft")
                    perimeter_ft = _convert_to_real_units(pixel_perimeter, scale, "ft")
                    
                    print(f"  - Converted area: {area_sqft:.2f} sq ft")
                    print(f"  - Converted perimeter: {perimeter_ft:.2f} ft")
                    
                    item["display"].update({
                        "area_sqft": area_sqft,
                        "perimeter_ft": perimeter_ft,
                    })
                elif class_name and "wall" in class_name.lower():
                    # Normalize wall class names for frontend
                    if "external" in class_name.lower() or class_name == "External_Wall":
                        item["class"] = "exterior_wall"
                        item["category"] = "exterior_wall"
                    elif "internal" in class_name.lower() or class_name == "Internal_Wall":
                        item["class"] = "interior_wall"
                        item["category"] = "interior_wall"
                    elif "exterior" in class_name.lower():
                        item["class"] = "exterior_wall"
                        item["category"] = "exterior_wall"
                    elif "interior" in class_name.lower():
                        item["class"] = "interior_wall"
                        item["category"] = "interior_wall"
                    else:
                        # Default to interior wall if type not specified
                        item["class"] = "interior_wall"
                        item["category"] = "interior_wall"
                    
                    # For walls: perimeter_ft (length) and area_sqft
                    # Perimeter represents the wall length (Linear Feet)
                    # Area can be used for wall surface area calculations
                    perimeter_ft = _convert_to_real_units(pixel_perimeter, scale, "ft")
                    area_sqft = _convert_to_real_units(pixel_area, scale, "sq ft")
                    
                    print(f"  - Wall type: {item['class']}")
                    print(f"  - Converted length: {perimeter_ft:.2f} ft")
                    print(f"  - Converted area: {area_sqft:.2f} sq ft")
                    
                    item["display"].update({
                        "perimeter_ft": perimeter_ft,
                        "area_sqft": area_sqft,
                        # Keep legacy fields for backward compatibility
                        "inner_perimeter": perimeter_ft,
                        "outer_perimeter": perimeter_ft,
                    })
                else:
                    # Generic polygon - provide both area and perimeter
                    item["display"].update({
                        "area_sqft": _convert_to_real_units(pixel_area, scale, "sq ft"),
                        "perimeter_ft": _convert_to_real_units(pixel_perimeter, scale, "ft"),
                    })
                
                # Also add to metrics for consistency
                item["metrics"].update({
                    "area_pixels": pixel_area,
                    "perimeter_pixels": pixel_perimeter,
                    "area_sqft": item["display"].get("area_sqft", 0.0),
                    "perimeter_ft": item["display"].get("perimeter_ft", 0.0),
                })

        out.append(item)
    return out

def _infer_image(
    image_path: str,
    model_id: str,
    api_key: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Calls Roboflow Inference API for a single model_id.
    `model_id` format: "workspace/project:version"
    """
    client = _get_client(api_key)
    # You can pass extra params like `confidence`, `overlap`, `visualize`, etc. via kwargs.
    try:
        return client.infer(image_path, model_id=model_id, **kwargs)
    except TypeError as exc:
        # Some versions of the Roboflow client don't accept confidence/overlap kwargs.
        if kwargs and "unexpected keyword argument" in str(exc):
            print(
                f"[ML] Warning: inference client rejected extra kwargs {list(kwargs.keys())}; "
                "retrying without them."
            )
            return client.infer(image_path, model_id=model_id)
        raise

def _classify_image(
    image_path: str,
    project_id: str,
    version: str,
    api_key: str,
    workspace: str = None,
) -> Dict[str, Any]:
    """
    Calls Roboflow Classification using InferenceHTTPClient with serverless endpoint.
    Returns classification result with top class and confidence.
    """
    from inference_sdk import InferenceHTTPClient
    
    if not api_key:
        raise ValueError("API key is required for classification")
    
    # Initialize client with serverless endpoint
    client = InferenceHTTPClient(
        api_url="https://serverless.roboflow.com",
        api_key=api_key
    )
    
    # Model ID format: project_id/version
    model_id = f"{project_id}/{version}"
    
    # Run inference
    result = client.infer(image_path, model_id=model_id)
    
    return result

# Initialize PDF processor with classification function (now that _classify_image is defined)
if PAGE_API_KEY and PAGE_PROJECT and PAGE_VERSION:
    pdf_processor = PDFProcessor(classify_fn=_classify_image)
    print(f"[ML] PDF Processor initialized with Roboflow classification: {PAGE_PROJECT}/{PAGE_VERSION}")
else:
    pdf_processor = PDFProcessor()
    print("[ML] PDF Processor initialized without classification (missing config)")

def _calculate_iou(box1: Dict[str, float], box2: Dict[str, float]) -> float:
    """
    Calculate Intersection over Union (IoU) between two bounding boxes.
    Boxes are in format: {"x": center_x, "y": center_y, "w": width, "h": height}
    """
    # Convert center format to corner format
    box1_x1 = box1["x"] - box1["w"] / 2
    box1_y1 = box1["y"] - box1["h"] / 2
    box1_x2 = box1["x"] + box1["w"] / 2
    box1_y2 = box1["y"] + box1["h"] / 2
    
    box2_x1 = box2["x"] - box2["w"] / 2
    box2_y1 = box2["y"] - box2["h"] / 2
    box2_x2 = box2["x"] + box2["w"] / 2
    box2_y2 = box2["y"] + box2["h"] / 2
    
    # Calculate intersection
    x1 = max(box1_x1, box2_x1)
    y1 = max(box1_y1, box2_y1)
    x2 = min(box1_x2, box2_x2)
    y2 = min(box1_y2, box2_y2)
    
    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    
    # Calculate union
    box1_area = box1["w"] * box1["h"]
    box2_area = box2["w"] * box2["h"]
    union = box1_area + box2_area - intersection
    
    return intersection / union if union > 0 else 0.0

def _ensemble_door_window_predictions(
    roboflow_preds: List[Dict[str, Any]],
    custom_preds: List[Dict[str, Any]],
    iou_threshold: float = 0.4
) -> List[Dict[str, Any]]:
    """
    Combine predictions from Roboflow and custom YOLO model using ensemble learning.
    
    Strategy:
    1. For overlapping detections (IoU > threshold), keep the one with higher confidence
    2. Add non-overlapping detections from both models
    3. Apply NMS to remove final duplicates
    
    Args:
        roboflow_preds: Predictions from Roboflow model
        custom_preds: Predictions from custom YOLO model
        iou_threshold: IoU threshold for considering detections as overlapping
    
    Returns:
        Combined list of predictions
    """
    print(f"[ML] Ensemble: Roboflow={len(roboflow_preds)}, Custom={len(custom_preds)}")
    
    if not custom_preds:
        print("[ML] Ensemble: No custom predictions, returning Roboflow only")
        return roboflow_preds
    
    if not roboflow_preds:
        print("[ML] Ensemble: No Roboflow predictions, returning custom only")
        return custom_preds
    
    combined = []
    used_roboflow = set()
    used_custom = set()
    
    # Find overlapping detections and keep the one with higher confidence
    for i, custom_pred in enumerate(custom_preds):
        if "bbox" not in custom_pred:
            continue
            
        best_match_idx = None
        max_iou = iou_threshold
        
        for j, robo_pred in enumerate(roboflow_preds):
            if j in used_roboflow or "bbox" not in robo_pred:
                continue
            
            iou = _calculate_iou(custom_pred["bbox"], robo_pred["bbox"])
            if iou > max_iou:
                max_iou = iou
                best_match_idx = j
        
        if best_match_idx is not None:
            # Overlapping detection found - use higher confidence
            robo_pred = roboflow_preds[best_match_idx]
            if custom_pred["confidence"] > robo_pred["confidence"]:
                combined.append(custom_pred)
                print(f"[ML] Ensemble: Using custom (conf={custom_pred['confidence']:.2f}) over Roboflow (conf={robo_pred['confidence']:.2f})")
            else:
                combined.append(robo_pred)
                print(f"[ML] Ensemble: Using Roboflow (conf={robo_pred['confidence']:.2f}) over custom (conf={custom_pred['confidence']:.2f})")
            used_roboflow.add(best_match_idx)
            used_custom.add(i)
        else:
            # No overlap - add custom prediction
            combined.append(custom_pred)
            used_custom.add(i)
            print(f"[ML] Ensemble: Added unique custom detection (conf={custom_pred['confidence']:.2f})")
    
    # Add remaining Roboflow predictions that weren't matched
    for j, robo_pred in enumerate(roboflow_preds):
        if j not in used_roboflow:
            combined.append(robo_pred)
            print(f"[ML] Ensemble: Added unique Roboflow detection (conf={robo_pred['confidence']:.2f})")
    
    print(f"[ML] Ensemble: Combined total = {len(combined)} detections")
    return combined

def _run_custom_room_model(
    image_path: str,
    img_w: int,
    img_h: int,
    confidence: float = 0.3,
    scale: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    Run custom YOLO model for room detection and convert to standard format.
    
    Args:
        image_path: Path to image file
        img_w: Image width
        img_h: Image height
        confidence: Confidence threshold
        scale: Scale factor for real-world units
    
    Returns:
        List of predictions in standard format
    """
    if not CUSTOM_ROOM_MODEL:
        return []
    
    try:
        # Run inference
        results = CUSTOM_ROOM_MODEL(image_path, conf=confidence, iou=0.5)
        
        predictions = []
        for result in results:
            for i, box in enumerate(result.boxes):
                # Convert box to [x1, y1, x2, y2, conf, cls]
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = box.conf.item()
                cls_id = int(box.cls.item())
                cls_name = result.names[cls_id]
                
                # Calculate center, width, height
                w = x2 - x1
                h = y2 - y1
                x = x1 + w / 2
                y = y1 + h / 2
                
                # Convert to percentage of image dimensions
                x_pct = x / img_w
                y_pct = y / img_h
                w_pct = w / img_w
                h_pct = h / img_h
                
                # Convert to absolute coordinates
                x_abs = x_pct * img_w
                y_abs = y_pct * img_h
                w_abs = w_pct * img_w
                h_abs = h_pct * img_h
                
                # Create prediction in Roboflow format
                pred = {
                    "x": x_abs,
                    "y": y_abs,
                    "width": w_abs,
                    "height": h_abs,
                    "confidence": conf,
                    "class": cls_name,
                    "class_id": cls_id,
                }
                
                # Add points for polygon (as a rectangle for now)
                points = [
                    {"x": x1, "y": y1},
                    {"x": x2, "y": y1},
                    {"x": x2, "y": y2},
                    {"x": x1, "y": y2}
                ]
                
                # Calculate area and perimeter if scale is provided
                if scale is not None:
                    area_px = w_abs * h_abs
                    perimeter_px = 2 * (w_abs + h_abs)
                    
                    pred["area_px2"] = area_px
                    pred["perimeter_px"] = perimeter_px
                    
                    # Convert to real-world units
                    area_sqft = _convert_to_real_units(area_px, scale, "sq ft")
                    perimeter_ft = _convert_to_real_units(perimeter_px, scale, "ft")
                    
                    pred["display"] = {
                        "area_sqft": area_sqft,
                        "perimeter_ft": perimeter_ft
                    }
                
                pred["points"] = points
                predictions.append(pred)
        
        return predictions
        
    except Exception as e:
        print(f"[ERROR] Error running custom room model: {e}")
        return []


def _run_custom_yolo_model(
    image_path: str,
    img_w: int,
    img_h: int,
    confidence: float = 0.3,
    scale: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    Run custom YOLO model on image and convert to standard format.
    
    Args:
        image_path: Path to image file
        img_w: Image width
        img_h: Image height
        confidence: Confidence threshold
        scale: Scale factor for real-world units
    
    Returns:
        List of predictions in standard format
    """
    if not CUSTOM_WINDOW_MODEL:
        return []
    
    try:
        # Run inference
        results = CUSTOM_WINDOW_MODEL.predict(
            image_path,
            conf=confidence,
            iou=0.5,
            verbose=False
        )
        
        if not results or len(results) == 0:
            return []
        
        result = results[0]
        predictions = []
        
        # Convert YOLO format to standard format
        for box in result.boxes:
            # Get box coordinates (xyxy format)
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            
            # Convert to center format
            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2
            width = x2 - x1
            height = y2 - y1
            
            # Get class name (assume 0=window for custom model)
            class_id = int(box.cls[0])
            class_name = "window"  # Default to window
            
            # Try to get class name from model
            if hasattr(result, 'names') and class_id in result.names:
                class_name = result.names[class_id].lower()
            
            # Convert bounding box to polygon mask (4 corners)
            mask_points = [
                {"x": float(x1), "y": float(y1)},  # Top-left
                {"x": float(x2), "y": float(y1)},  # Top-right
                {"x": float(x2), "y": float(y2)},  # Bottom-right
                {"x": float(x1), "y": float(y2)},  # Bottom-left
            ]
            
            pred = {
                "id": str(uuid.uuid4()),
                "class": class_name,
                "confidence": float(box.conf[0]),
                "category": class_name,
                "bbox": {
                    "x": float(center_x),
                    "y": float(center_y),
                    "w": float(width),
                    "h": float(height)
                },
                "bbox_norm": {
                    "x": float(center_x / img_w) if img_w else 0.0,
                    "y": float(center_y / img_h) if img_h else 0.0,
                    "w": float(width / img_w) if img_w else 0.0,
                    "h": float(height / img_h) if img_h else 0.0,
                },
                "metrics": {},
                "mask": mask_points,
                "points": mask_points,
                "points_norm": [
                    {"x": float(x1 / img_w), "y": float(y1 / img_h)},
                    {"x": float(x2 / img_w), "y": float(y1 / img_h)},
                    {"x": float(x2 / img_w), "y": float(y2 / img_h)},
                    {"x": float(x1 / img_w), "y": float(y2 / img_h)},
                ],
                "display": {
                    "width": _convert_to_real_units(width, scale, "ft"),
                    "height": _convert_to_real_units(height, scale, "ft"),
                },
                "source": "custom_yolo"  # Mark as custom model prediction
            }
            predictions.append(pred)
        
        print(f"[ML] Custom YOLO model detected {len(predictions)} windows")
        return predictions
        
    except Exception as e:
        print(f"[ML] Error running custom YOLO model: {e}")
        return []

# ------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------

@app.get("/", response_class=JSONResponse)
def root() -> Dict[str, Any]:
    """
    Simple index so Render doesn't 404 and you get a quick health view.
    """
    return {
        "name": "AIEstimAgent — ML API",
        "status": "ok",
        "docs": "/docs",
        "endpoints": ["/healthz", "/analyze"],
    }

@app.options("/", response_class=PlainTextResponse)
def options_root():
    return PlainTextResponse("ok", status_code=200)

@app.head("/", response_class=PlainTextResponse)
def head_root():
    return PlainTextResponse("ok", status_code=200)

@app.get("/healthz", response_class=PlainTextResponse)
def healthz():
    return PlainTextResponse("ok", status_code=200)

@app.get("/config", response_class=JSONResponse)
def config() -> Dict[str, Any]:
    """
    Debug endpoint to check model configuration.
    """
    return {
        "room_model_id": ROOM_MODEL_ID or "NOT CONFIGURED",
        "wall_model_id": WALL_MODEL_ID or "NOT CONFIGURED",
        "doorwindow_model_id": DOORWINDOW_MODEL_ID or "NOT CONFIGURED",
        "has_room_api_key": bool(ROOM_API_KEY),
        "has_wall_api_key": bool(WALL_API_KEY),
        "has_doorwindow_api_key": bool(DOORWINDOW_API_KEY),
        "models": {
            "rooms": "Detects only room objects",
            "walls": "Detects only wall objects",
            "doors_windows": "Detects doors and windows (filters out rooms/walls)"
        }
    }

def convert_numpy_types(obj):
    """Recursively convert numpy types to native Python types for JSON serialization."""
    import numpy as np
    
    if isinstance(obj, (np.bool_, np.bool)):
        return bool(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_numpy_types(item) for item in obj]
    return obj

@app.post("/analyze", response_class=JSONResponse)
async def analyze(
    file: UploadFile = File(..., description="Image file (plans/photo)"),
    types: Optional[str] = Form(None, description="JSON array of types to analyze"),
    scale: Optional[float] = Form(None, description="Scale in units per pixel"),
    confidence: Optional[float] = Form(None),
    overlap: Optional[float] = Form(None),
) -> Dict[str, Any]:
    """
    Upload an image and run Roboflow inference for rooms, walls, doors, and windows.
    
    Models:
    - rooms: Uses ROOM_MODEL (detects only rooms)
    - walls: Uses WALL_MODEL (detects only walls)
    - doors/windows: Uses DOORWINDOW_MODEL (filters to only doors and windows)
    """
    import time
    request_start = time.time()
    print(f"[ML] === Analysis request started at {time.strftime('%H:%M:%S')} ===")
    try:
        # Parse types parameter (frontend sends JSON array)
        types_to_analyze = []
        if types:
            try:
                types_to_analyze = json.loads(types)
            except json.JSONDecodeError:
                types_to_analyze = []
        
        # Default to all types if none specified
        if not types_to_analyze:
            types_to_analyze = ["rooms", "walls", "doors", "windows"]
        
        # Determine which models to run
        detect_rooms = any(t in types_to_analyze for t in ["rooms", "floors", "flooring"])
        detect_walls = "walls" in types_to_analyze
        detect_doors_windows = any(t in types_to_analyze for t in ["doors", "windows", "columns", "openings"])
        
        # Read and validate image
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty upload.")
        
        # Validate minimum file size (at least 100 bytes for a valid image)
        if len(data) < 100:
            raise HTTPException(
                status_code=400, 
                detail=f"File too small ({len(data)} bytes). Please upload a valid image file."
            )
        
        # Check file signature (magic bytes) for common image formats
        file_signature = data[:8]
        valid_signatures = [
            b'\x89PNG\r\n\x1a\n',  # PNG
            b'\xff\xd8\xff',        # JPEG
            b'GIF87a',              # GIF
            b'GIF89a',              # GIF
            b'BM',                  # BMP
        ]
        
        is_valid_image = any(
            file_signature.startswith(sig) for sig in valid_signatures
        )
        
        if not is_valid_image:
            raise HTTPException(
                status_code=400,
                detail="Invalid image format. Please upload a PNG, JPEG, GIF, or BMP file."
            )

        # Get image dimensions with error handling
        original_img_w, original_img_h = _image_size_from_bytes(data)
        
        # Resize image to max 1536px to speed up Roboflow API
        # This significantly reduces upload time and processing time
        MAX_DIMENSION = 1536
        img = Image.open(io.BytesIO(data))
        
        # Calculate scaling factor
        scale_factor = 1.0
        if max(original_img_w, original_img_h) > MAX_DIMENSION:
            scale_factor = MAX_DIMENSION / max(original_img_w, original_img_h)
            new_w = int(original_img_w * scale_factor)
            new_h = int(original_img_h * scale_factor)
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            print(f"[ML] Resized image from {original_img_w}x{original_img_h} to {new_w}x{new_h} (factor: {scale_factor:.2f})")
        else:
            new_w, new_h = original_img_w, original_img_h
            print(f"[ML] Image size {original_img_w}x{original_img_h} is within limit, no resize needed")
        
        # Use resized dimensions for inference
        img_w, img_h = new_w, new_h

        ext = os.path.splitext(file.filename or "")[-1].lower() or ".jpg"
        temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{ext}")
        
        # Save resized image
        img.save(temp_path, quality=85, optimize=True)

        # Inference kwargs
        infer_kwargs: Dict[str, Any] = {}
        if confidence is not None:
            infer_kwargs["confidence"] = confidence
        if overlap is not None:
            infer_kwargs["overlap"] = overlap

        results = {
            "image": {"width": img_w, "height": img_h},
            "scale": scale,
            "filename": file.filename,
            "predictions": {},
        }
        errors: Dict[str, str] = {}

        # Run room detection
        if detect_rooms:
            if not ROOM_MODEL_ID:
                errors["rooms"] = "rooms model not configured"
            else:
                try:
                    raw = _infer_image(temp_path, model_id=ROOM_MODEL_ID, api_key=ROOM_API_KEY, **infer_kwargs)
                    roboflow_rooms = _normalize_predictions(raw, img_w, img_h, scale=scale)
                    
                    # Use custom room model as fallback only if Roboflow returns no results
                    if not roboflow_rooms and CUSTOM_ROOM_MODEL:
                        print("[ML] Roboflow returned no rooms, using custom room model as fallback")
                        roboflow_rooms = _run_custom_room_model(
                            temp_path,
                            img_w,
                            img_h,
                            confidence=confidence or 0.3,
                            scale=scale
                        )
                        print(f"[ML] Custom room model fallback detected {len(roboflow_rooms)} rooms")
                    
                    results["predictions"]["rooms"] = roboflow_rooms
                except Exception as e:
                    errors["rooms"] = str(e)

        # Run wall detection
        if detect_walls:
            if not WALL_MODEL_ID:
                errors["walls"] = "walls model not configured"
            else:
                try:
                    raw = _infer_image(temp_path, model_id=WALL_MODEL_ID, api_key=WALL_API_KEY, **infer_kwargs)
                    results["predictions"]["walls"] = _normalize_predictions(raw, img_w, img_h, scale=scale)
                except Exception as e:
                    errors["walls"] = str(e)

        # Run door/window detection with ensemble learning
        if detect_doors_windows:
            if not DOORWINDOW_MODEL_ID:
                errors["openings"] = "doors/windows model not configured"
            else:
                try:
                    # Run Roboflow model
                    raw = _infer_image(temp_path, model_id=DOORWINDOW_MODEL_ID, api_key=DOORWINDOW_API_KEY, **infer_kwargs)
                    # Filter to only include door and window classes
                    roboflow_preds = _normalize_predictions(raw, img_w, img_h, filter_classes=["door", "window", "Door", "Window"], scale=scale)
                    
                    # If custom YOLO model is available, run ensemble learning
                    if CUSTOM_WINDOW_MODEL:
                        print("[ML] Running ensemble learning for door/window detection")
                        # Run custom model
                        custom_preds = _run_custom_yolo_model(
                            temp_path,
                            img_w,
                            img_h,
                            confidence=confidence or 0.3,
                            scale=scale
                        )
                        
                        # Combine predictions using ensemble strategy
                        door_window_preds = _ensemble_door_window_predictions(
                            roboflow_preds,
                            custom_preds,
                            iou_threshold=0.4
                        )
                        print(f"[ML] Ensemble result: {len(door_window_preds)} total detections")
                    else:
                        # No custom model - use Roboflow only
                        door_window_preds = roboflow_preds
                        print(f"[ML] Using Roboflow only: {len(door_window_preds)} detections")
                    
                    results["predictions"]["openings"] = door_window_preds
                except Exception as e:
                    errors["openings"] = str(e)

        if errors:
            results["errors"] = errors

        total_time = time.time() - request_start
        print(f"[ML] === Analysis completed in {total_time:.2f}s ===")
        results["processing_time"] = f"{total_time:.2f}s"
        
        # Convert numpy types to native Python types for JSON serialization
        results = convert_numpy_types(results)
        
        return results

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Convenience: allow Render's periodic HEAD health probe on /analyze (return 200 quickly)
@app.head("/analyze", response_class=PlainTextResponse)
def head_analyze():
    return PlainTextResponse("ok", status_code=200)

@app.options("/analyze", response_class=PlainTextResponse)
def options_analyze():
    """Handle CORS preflight requests for /analyze endpoint."""
    return PlainTextResponse("ok", status_code=200)


# ------------------------------------------------------------------------------
# PDF Processing Endpoints
# ------------------------------------------------------------------------------

@app.get("/test")
async def test_endpoint():
    """Test endpoint to verify ML service is running"""
    print("[ML] 🧪 Test endpoint called!")
    return {"status": "ok", "message": "ML service is running"}


@app.options("/upload-pdf", response_class=PlainTextResponse)
def options_upload_pdf():
    """Handle CORS preflight requests for /upload-pdf endpoint."""
    return PlainTextResponse("ok", status_code=200)

@app.post("/upload-pdf", response_class=JSONResponse)
async def upload_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Upload and process a multi-page PDF.
    Returns page classifications and thumbnails.
    """
    # Force UTF-8 encoding for stdout
    import sys
    import codecs
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    
    # Write to log file to debug
    try:
        with open("upload_log.txt", "a", encoding='utf-8') as f:
            f.write(f"\n{'='*80}\n")
            f.write(f"PDF UPLOAD RECEIVED at {datetime.now()}\n")
            f.write(f"Filename: {file.filename}\n")
            f.write(f"{'='*80}\n")
    except Exception as e:
        print(f"[WARNING] Failed to write to log file: {e}")
    
    sys.stdout.flush()
    sys.stderr.flush()
    
    try:
        # Validate file type
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload a PDF file."
            )
        
        # Generate unique ID for this upload
        upload_id = str(uuid.uuid4())
        upload_dir = os.path.join(PDF_UPLOAD_DIR, upload_id)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save uploaded PDF
        pdf_path = os.path.join(upload_dir, file.filename)
        try:
            # Read the file content first
            file_content = await file.read()
            # Then write it to disk
            with open(pdf_path, "wb") as buffer:
                buffer.write(file_content)
        except Exception as e:
            error_msg = f"Error saving PDF file: {str(e)}"
            print(f"[ML] {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
        
        print("\n" + "="*80)
        print("[ML] PDF UPLOAD RECEIVED")
        print("="*80)
        print(f"[ML] Filename: {file.filename}")
        print(f"[ML] Upload ID: {upload_id}")
        print(f"[ML] PDF Path: {pdf_path}")
        print(f"[ML] Output Dir: {upload_dir}")
        print("[ML] Starting PDF processing...")
        print("="*80 + "\n")
        
        # Process PDF - extract pages and classify
        result = pdf_processor.process_pdf(pdf_path, upload_dir)
        
        # Add upload ID to result
        result['upload_id'] = upload_id
        
        print("\n" + "="*80)
        print("[ML] PDF PROCESSING COMPLETE")
        print("="*80)
        print(f"[ML] Total pages: {result['total_pages']}")
        analyzable_count = sum(1 for p in result['pages'] if p['analyzable'])
        print(f"[ML] Analyzable pages: {analyzable_count}/{result['total_pages']}")
        print("="*80 + "\n")
        
        # Convert numpy types to native Python types for JSON serialization
        result = convert_numpy_types(result)
        
        # Convert file paths to HTTP URLs for frontend access
        ml_base_url = os.getenv("ML_BASE_URL", "http://127.0.0.1:8001")
        for page in result['pages']:
            if 'image_path' in page and page['image_path']:
                # Convert absolute path to relative URL
                # e.g., /opt/render/project/src/uploads/pdfs/uuid/page_1.jpg 
                # becomes http://127.0.0.1:8001/uploads/pdfs/uuid/page_1.jpg
                rel_path = page['image_path'].replace(UPLOAD_DIR, '').lstrip('/')
                page['image_path'] = f"{ml_base_url}/uploads/{rel_path}"
                print(f"[ML] Converted image path to URL: {page['image_path']}")
        
        return {
            "success": True,
            "data": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"[ML] Error processing PDF: {error_msg}")
        # Ensure error message is clean and safe
        safe_error = error_msg.replace('\n', ' ').replace('\r', ' ')[:500]  # Limit length
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {safe_error}"
        )


@app.options("/analyze-pages", response_class=PlainTextResponse)
def options_analyze_pages():
    """Handle CORS preflight requests for /analyze-pages endpoint."""
    return PlainTextResponse("ok", status_code=200)

@app.post("/analyze-pages", response_class=JSONResponse)
async def analyze_pages(
    upload_id: str = Form(...),
    page_numbers: str = Form(...),  # JSON array of page numbers
    takeoff_types: str = Form(...),  # JSON array of takeoff types
    scale: Optional[float] = Form(None),
    confidence: Optional[float] = Form(None),
) -> Dict[str, Any]:
    """
    Analyze selected pages from an uploaded PDF.
    
    Args:
        upload_id: UUID of the uploaded PDF
        page_numbers: JSON array of page numbers to analyze
        takeoff_types: JSON array of takeoff types (rooms, walls, doors, windows)
        scale: Scale factor for measurements
        confidence: Confidence threshold for detections
    """
    try:
        # Parse parameters
        try:
            pages_to_analyze = json.loads(page_numbers)
            types_list = json.loads(takeoff_types)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON in parameters: {str(e)}"
            )
        
        # Validate upload directory exists
        upload_dir = os.path.join(PDF_UPLOAD_DIR, upload_id)
        if not os.path.exists(upload_dir):
            raise HTTPException(
                status_code=404,
                detail=f"Upload ID not found: {upload_id}"
            )
        
        print(f"[ML] Analyzing {len(pages_to_analyze)} pages from upload {upload_id}")
        
        results = []
        
        for page_num in pages_to_analyze:
            image_path = os.path.join(upload_dir, f'page_{page_num}.jpg')
            
            if not os.path.exists(image_path):
                results.append({
                    'page_number': page_num,
                    'success': False,
                    'error': f'Page {page_num} not found'
                })
                continue
            
            try:
                # Get image dimensions
                with Image.open(image_path) as img:
                    img_w, img_h = img.size
                
                # Determine which models to run
                detect_rooms = any(t in types_list for t in ["rooms", "floors", "flooring"])
                detect_walls = "walls" in types_list
                detect_doors_windows = any(t in types_list for t in ["doors", "windows", "columns", "openings"])
                
                # Inference kwargs
                infer_kwargs: Dict[str, Any] = {}
                if confidence is not None:
                    infer_kwargs["confidence"] = confidence
                
                page_predictions = {}
                page_errors = {}
                
                # Run room detection if requested
                if detect_rooms:
                    room_predictions = []
                    
                    # 1. Run Roboflow room detection
                    if ROOM_MODEL_ID:
                        try:
                            raw = _infer_image(image_path, model_id=ROOM_MODEL_ID, api_key=ROOM_API_KEY, **infer_kwargs)
                            roboflow_rooms = _normalize_predictions(raw, img_w, img_h, scale=scale)
                            room_predictions.extend(roboflow_rooms)
                            print(f"[ML] Roboflow room detection found {len(roboflow_rooms)} rooms")
                        except Exception as e:
                            page_errors["rooms_roboflow"] = str(e)
                    
                    # 2. Run custom room detection model if available
                    if CUSTOM_ROOM_MODEL:
                        try:
                            custom_rooms = _run_custom_room_model(image_path, img_w, img_h, 
                                                              confidence=confidence, scale=scale)
                            # Convert to normalized format
                            custom_rooms_normalized = _normalize_predictions(
                                {"predictions": custom_rooms}, 
                                img_w, 
                                img_h, 
                                scale=scale
                            )
                            room_predictions.extend(custom_rooms_normalized)
                            print(f"[ML] Custom room detection found {len(custom_rooms_normalized)} rooms")
                        except Exception as e:
                            page_errors["rooms_custom"] = str(e)
                    
                    # 3. Apply ensemble method (simple merge for now, can be improved with NMS)
                    if room_predictions:
                        # For now, just take unique predictions based on class and position
                        # In a production environment, you might want to implement NMS here
                        unique_rooms = {}
                        for room in room_predictions:
                            # Create a unique key based on class and position
                            key = f"{room.get('class', 'room')}_{room.get('x', 0):.0f}_{room.get('y', 0):.0f}"
                            # Keep the one with higher confidence if duplicate
                            if key not in unique_rooms or room.get('confidence', 0) > unique_rooms[key].get('confidence', 0):
                                unique_rooms[key] = room
                        
                        page_predictions["rooms"] = list(unique_rooms.values())
                        print(f"[ML] Combined room detection found {len(unique_rooms)} unique rooms")
                
                # Run wall detection
                if detect_walls and WALL_MODEL_ID:
                    try:
                        raw = _infer_image(image_path, model_id=WALL_MODEL_ID, api_key=WALL_API_KEY, **infer_kwargs)
                        page_predictions["walls"] = _normalize_predictions(raw, img_w, img_h, scale=scale)
                    except Exception as e:
                        page_errors["walls"] = str(e)
                
                # Run door/window detection
                if detect_doors_windows and DOORWINDOW_MODEL_ID:
                    try:
                        raw = _infer_image(image_path, model_id=DOORWINDOW_MODEL_ID, api_key=DOORWINDOW_API_KEY, **infer_kwargs)
                        roboflow_preds = _normalize_predictions(raw, img_w, img_h, filter_classes=["door", "window", "Door", "Window"], scale=scale)
                        
                        # Ensemble learning if custom model available
                        if CUSTOM_WINDOW_MODEL:
                            custom_preds = _run_custom_yolo_model(image_path, img_w, img_h, confidence=confidence or 0.3, scale=scale)
                            door_window_preds = _ensemble_door_window_predictions(roboflow_preds, custom_preds, iou_threshold=0.4)
                        else:
                            door_window_preds = roboflow_preds
                        
                        page_predictions["openings"] = door_window_preds
                    except Exception as e:
                        page_errors["openings"] = str(e)
                
                results.append({
                    'page_number': page_num,
                    'success': True,
                    'image': {'width': img_w, 'height': img_h},
                    'predictions': page_predictions,
                    'errors': page_errors if page_errors else None
                })
                
                print(f"[ML] Page {page_num} analyzed successfully")
                
            except Exception as e:
                print(f"[ML] Error analyzing page {page_num}: {str(e)}")
                results.append({
                    'page_number': page_num,
                    'success': False,
                    'error': str(e)
                })
        
        return {
            "success": True,
            "upload_id": upload_id,
            "results": results
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ML] Error in analyze_pages: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze pages: {str(e)}"
        )


@app.options("/upload-pdf", response_class=PlainTextResponse)
def options_upload_pdf():
    """Handle CORS preflight for PDF upload."""
    return PlainTextResponse("ok", status_code=200)


@app.options("/analyze-pages", response_class=PlainTextResponse)
def options_analyze_pages():
    """Handle CORS preflight for page analysis."""
    return PlainTextResponse("ok", status_code=200)
