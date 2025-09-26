# ml/app.py - UPDATED

import os
import shutil
import json
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:5001"], # Added new frontend port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load all model configurations from .env ---
ROOM_API_KEY = os.getenv("ROOM_API_KEY")
ROOM_WORKSPACE = os.getenv("ROOM_WORKSPACE")
ROOM_PROJECT = os.getenv("ROOM_PROJECT")
ROOM_VERSION = os.getenv("ROOM_VERSION")

WALL_API_KEY = os.getenv("WALL_API_KEY")
WALL_WORKSPACE = os.getenv("WALL_WORKSPACE")
WALL_PROJECT = os.getenv("WALL_PROJECT")
WALL_VERSION = os.getenv("WALL_VERSION")

DOORWINDOW_API_KEY = os.getenv("DOORWINDOW_API_KEY")
DOORWINDOW_WORKSPACE = os.getenv("DOORWINDOW_WORKSPACE")
DOORWINDOW_PROJECT = os.getenv("DOORWINDOW_PROJECT")
DOORWINDOW_VERSION = os.getenv("DOORWINDOW_VERSION")


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def run_inference(api_key: str, workspace: str, project: str, version: str, image_path: str):
    """Run inference with inference-sdk on a local file."""
    if not all([api_key, workspace, project, version]):
        print(f"[ERROR] Missing API configuration for project {project}")
        return [], f"API configuration for project {project} is missing."
    try:
        client = InferenceHTTPClient(
            api_url="https://detect.roboflow.com",
            api_key=api_key
        )
        model_id = f"{workspace}/{project}/{version}"
        print(f"[DEBUG] Running model: {model_id}")
        result = client.infer(image_path, model_id=model_id)
        return result.get("predictions", []), None
    except Exception as e:
        print(f"[ERROR] Inference failed for {project}:", e)
        return [], str(e)


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), types: str = Form(...)):
    selected_types = json.loads(types)
    
    path = os.path.join(UPLOAD_DIR, file.filename)
    with open(path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    print(f"[/analyze] Saved file: {path}")
    print(f"[/analyze] Requested types: {selected_types}")

    predictions = {}
    errors = {}

    # Conditionally run models based on the types sent from the frontend
    if "openings" in selected_types: # ID for "Doors & Windows"
        preds, err = run_inference(DOORWINDOW_API_KEY, DOORWINDOW_WORKSPACE, DOORWINDOW_PROJECT, DOORWINDOW_VERSION, path)
        predictions["openings"] = preds
        errors["openings"] = err

    if "flooring" in selected_types: # ID for "Flooring & Rooms"
        preds, err = run_inference(ROOM_API_KEY, ROOM_WORKSPACE, ROOM_PROJECT, ROOM_VERSION, path)
        predictions["rooms"] = preds
        errors["rooms"] = err

    if "walls" in selected_types:
        preds, err = run_inference(WALL_API_KEY, WALL_WORKSPACE, WALL_PROJECT, WALL_VERSION, path)
        predictions["walls"] = preds
        errors["walls"] = err

    print(f"[/analyze] Predictions generated for: {list(predictions.keys())}")

    return JSONResponse({
        "filename": file.filename,
        "predictions": predictions,
        "errors": errors
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)