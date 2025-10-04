# ML API Model Configuration

## Overview
The ML API now correctly uses three separate Roboflow models to detect different architectural elements from floor plan drawings.

## Models

### 1. Room Detection Model
- **Project**: `room-detection-r0fta`
- **Detects**: Only room objects
- **Environment Variables**:
  - `ROOM_API_KEY`
  - `ROOM_WORKSPACE`
  - `ROOM_PROJECT`
  - `ROOM_VERSION`
- **Model ID Format**: `{ROOM_PROJECT}/{ROOM_VERSION}`

### 2. Wall Detection Model
- **Project**: `wall-detection-qpxun-rwqqb`
- **Detects**: Only wall objects
- **Environment Variables**:
  - `WALL_API_KEY`
  - `WALL_WORKSPACE`
  - `WALL_PROJECT`
  - `WALL_VERSION`
- **Model ID Format**: `{WALL_PROJECT}/{WALL_VERSION}`

### 3. Door & Window Detection Model
- **Project**: `mytool-i6igr`
- **Detects**: Doors, windows, rooms, and walls (but we filter to only doors and windows)
- **Environment Variables**:
  - `DOORWINDOW_API_KEY`
  - `DOORWINDOW_WORKSPACE`
  - `DOORWINDOW_PROJECT`
  - `DOORWINDOW_VERSION`
- **Model ID Format**: `{DOORWINDOW_PROJECT}/{DOORWINDOW_VERSION}`
- **Note**: This model detects multiple classes, but the API filters results to only include "door" and "window" classes

## API Endpoints

### GET /config
Returns the current model configuration and status:
```json
{
  "room_model_id": "room-detection-r0fta/1",
  "wall_model_id": "wall-detection-qpxun-rwqqb/1",
  "doorwindow_model_id": "mytool-i6igr/1",
  "has_room_api_key": true,
  "has_wall_api_key": true,
  "has_doorwindow_api_key": true,
  "models": {
    "rooms": "Detects only room objects",
    "walls": "Detects only wall objects",
    "doors_windows": "Detects doors and windows (filters out rooms/walls)"
  }
}
```

### POST /analyze
Analyzes an uploaded floor plan image.

**Parameters**:
- `file`: Image file (required)
- `types`: JSON array of types to analyze (optional, defaults to all)
  - Example: `["rooms", "walls", "doors", "windows"]`
- `scale`: Scale in units per pixel (optional)
- `confidence`: Confidence threshold (optional)
- `overlap`: Overlap threshold (optional)

**Response**:
```json
{
  "image": {
    "width": 1920,
    "height": 1080
  },
  "scale": 0.25,
  "filename": "floorplan.jpg",
  "models": {
    "rooms": [...predictions...],
    "walls": [...predictions...],
    "doors_windows": [...predictions...]
  },
  "errors": {}
}
```

## Key Changes Made

1. **Removed Column Detection**: There are no columns in the models, so all column-related code was removed
2. **Renamed Variables**: Changed from `FLOOR_MODEL_ID`, `COLUMN_MODEL_ID` to `ROOM_MODEL_ID`, `DOORWINDOW_MODEL_ID`
3. **Added Class Filtering**: The door/window model now filters predictions to only include door and window classes
4. **Simplified API**: Removed unnecessary parameters and code
5. **Better Error Messages**: Clear error messages when models are not configured
6. **Type Mapping**: Frontend can send "floors" or "columns" and they map to "rooms" and "doors_windows" respectively

## Testing

To test the configuration:
```bash
# Start the ML service
cd ml
uvicorn app:app --host 127.0.0.1 --port 8000 --reload

# Check configuration
curl http://127.0.0.1:8000/config

# Test analysis
curl -X POST http://127.0.0.1:8000/analyze \
  -F "file=@path/to/floorplan.jpg" \
  -F "types=[\"rooms\",\"walls\",\"doors\",\"windows\"]" \
  -F "scale=0.25"
```
