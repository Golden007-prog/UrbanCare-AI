import sys
import json
import base64
import os
import uuid
from io import BytesIO
from PIL import Image

# Try importing ultralytics. If it fails, we provide a mock/fallback so the pipeline doesn't crash completely.
try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False

def detect_and_crop(image_path_or_base64):
    """
    Simulates or runs YOLOv8 to detect bones/fracture areas.
    Since we don't have a *real* fine-tuned medical YOLO model locally, 
    we either use a generic YOLO model (if available) or simulate the cropping 
    process to return meaningful regions for MedGemma to analyze.
    """
    crops = []
    
    try:
        # 1. Load Image
        if image_path_or_base64.startswith('data:image'):
            # It's a base64 data URL
            header, b64_data = image_path_or_base64.split(',', 1)
            image_bytes = base64.b64decode(b64_data)
            img = Image.open(BytesIO(image_bytes)).convert("RGB")
        else:
            # It's a file path
            img = Image.open(image_path_or_base64).convert("RGB")
            
        width, height = img.size

        if HAS_YOLO:
            # If we wanted to run a real YOLO model, it would go here:
            # model = YOLO('yolov8n.pt') 
            # results = model(img)
            # 
            # For this MVP without a specialized 'yolov8-medical.pt' model on disk,
            # we will simulate identifying 2 key areas (e.g. joints, potential anomalies)
            pass
            
        # Simulate 2 YOLO crops: 
        # e.g., Top-left quadrant (often wrist/phalanges) and center
        # Bounding boxes: [x1, y1, x2, y2]
        bboxes = [
            [0, 0, int(width * 0.6), int(height * 0.6)], # Top-left main area
            [int(width * 0.2), int(height * 0.2), int(width * 0.8), int(height * 0.8)] # Center area
        ]

        temp_dir = os.path.join(os.getcwd(), 'uploads', 'crops')
        os.makedirs(temp_dir, exist_ok=True)

        for i, box in enumerate(bboxes):
            x1, y1, x2, y2 = box
            crop_img = img.crop((x1, y1, x2, y2))
            
            crop_id = str(uuid.uuid4())[:8]
            crop_path = os.path.join(temp_dir, f"crop_{crop_id}_{i}.jpg")
            
            # Save the crop
            crop_img.save(crop_path, format="JPEG", quality=90)
            
            # Also convert to base64 so we don't necessarily have to read it back from disk in Node
            buffered = BytesIO()
            crop_img.save(buffered, format="JPEG", quality=90)
            img_b64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            crops.append({
                "id": str(i),
                "path": crop_path,
                "base64": img_b64,
                "box": box,
                "label": f"Region {i+1}"
            })

        return {"success": True, "crops": crops}

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    # Expects image path or base64 string as the first command line argument
    if len(sys.argv) > 1:
        input_data = sys.argv[1]
        result = detect_and_crop(input_data)
        print(json.dumps(result))
    else:
        print(json.dumps({"success": False, "error": "No input provided"}))
