# ml/app.py
from __future__ import annotations

import io
import json
import os
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from PIL import Image
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient

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
WALL_PROJECT = os.getenv("WALL_PROJECT", "")  # mytoolllaw-6vckj
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

WALL_MODEL_ID = ""
if WALL_PROJECT and WALL_VERSION:
    WALL_MODEL_ID = f"{WALL_PROJECT}/{WALL_VERSION}"

DOORWINDOW_MODEL_ID = ""
if DOORWINDOW_PROJECT and DOORWINDOW_VERSION:
    DOORWINDOW_MODEL_ID = f"{DOORWINDOW_PROJECT}/{DOORWINDOW_VERSION}"

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/opt/render/project/src/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ------------------------------------------------------------------------------
# App
# ------------------------------------------------------------------------------

app = FastAPI(title="AIEstimAgent — ML API", version="1.0.0")

# CORS configuration for production
allowed_origins = [
    "https://estimagent.vercel.app",
    "http://localhost:5173",
    "http://localhost:5001"
]

# Use environment variable if set, otherwise use default allowed origins
cors_origins = os.getenv("CORS_ALLOW_ORIGINS")
if cors_origins:
    allowed_origins = cors_origins.split(",")

print(f"[ML] CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

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
    with Image.open(io.BytesIO(data)) as im:
        return im.width, im.height

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
                
                # Add display metrics based on detection type
                if class_name and "room" in class_name.lower():
                    # For rooms: area_sqft and perimeter_ft
                    item["display"].update({
                        "area_sqft": _convert_to_real_units(pixel_area, scale, "sq ft"),
                        "perimeter_ft": _convert_to_real_units(pixel_perimeter, scale, "ft"),
                    })
                elif class_name and "wall" in class_name.lower():
                    # For walls: perimeter_ft (length) and area_sqft
                    # Perimeter represents the wall length (Linear Feet)
                    # Area can be used for wall surface area calculations
                    perimeter_ft = _convert_to_real_units(pixel_perimeter, scale, "ft")
                    area_sqft = _convert_to_real_units(pixel_area, scale, "sq ft")
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
    return client.infer(image_path, model_id=model_id, **kwargs)

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
        
        # Read and save image
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty upload.")

        img_w, img_h = _image_size_from_bytes(data)

        ext = os.path.splitext(file.filename or "")[-1].lower() or ".jpg"
        temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{ext}")
        with open(temp_path, "wb") as f:
            f.write(data)

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
                    results["predictions"]["rooms"] = _normalize_predictions(raw, img_w, img_h, scale=scale)
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

        # Run door/window detection (filter out rooms and walls from this model)
        if detect_doors_windows:
            if not DOORWINDOW_MODEL_ID:
                errors["openings"] = "doors/windows model not configured"
            else:
                try:
                    raw = _infer_image(temp_path, model_id=DOORWINDOW_MODEL_ID, api_key=DOORWINDOW_API_KEY, **infer_kwargs)
                    # Filter to only include door and window classes
                    door_window_preds = _normalize_predictions(raw, img_w, img_h, filter_classes=["door", "window", "Door", "Window"], scale=scale)
                    results["predictions"]["openings"] = door_window_preds
                except Exception as e:
                    errors["openings"] = str(e)

        if errors:
            results["errors"] = errors

        return results

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Convenience: allow Render’s periodic HEAD health probe on /analyze (return 200 quickly)
@app.head("/analyze", response_class=PlainTextResponse)
def head_analyze():
    return PlainTextResponse("ok", status_code=200)
