import os
import sys
import time
import signal
import traceback
import logging
import cv2
import numpy as np
from flask import Flask, Response, jsonify, stream_with_context
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
import mediapipe as mp

# === Configuration ===
MODEL_PATH = r'C:\Users\Vigneshkumaran\VSCode_Programs\MERN Stack\React\wsasystem\src\projects\gender_detection.h5'
PROTOTXT_PATH = r'C:\Users\Vigneshkumaran\VSCode_Programs\MERN Stack\React\wsasystem\src\projects\deploy.prototxt'
CAFFEMODEL_PATH = r'C:\Users\Vigneshkumaran\VSCode_Programs\MERN Stack\React\wsasystem\src\projects\res10_300x300_ssd_iter_140000.caffemodel'
CONFIDENCE_THRESHOLD = 0.5
FRAME_SKIP = 2
GENDER_CLASSES = ['Male', 'Female', 'Unknown']
GENDER_COLORS = {'Male': (245, 209, 144), 'Female': (220, 186, 218), 'Unknown': (0, 255, 255)}

# === Globals ===
should_stop = False
cap = None
live_gesture_state = {"pinch": False}
live_gender_counts = {"Male": 0, "Female": 0, "Unknown": 0, "Total": 0}
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

# === Load Models ===
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Gender model '{MODEL_PATH}' not found.")
model = load_model(MODEL_PATH)

if not os.path.exists(PROTOTXT_PATH) or not os.path.exists(CAFFEMODEL_PATH):
    raise FileNotFoundError("Face detection model files missing.")
face_net = cv2.dnn.readNetFromCaffe(PROTOTXT_PATH, CAFFEMODEL_PATH)

# === Gesture Detector ===
class GestureDetector:
    def __init__(self, mode=False, max_hands=2, detection_con=0.5, track_con=0.5):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=mode,
            max_num_hands=max_hands,
            min_detection_confidence=detection_con,
            min_tracking_confidence=track_con
        )
        self.mp_draw = mp.solutions.drawing_utils


    def process(self, img):
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_img)

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                self.mp_draw.draw_landmarks(img, hand_landmarks, self.mp_hands.HAND_CONNECTIONS)

                landmarks = []
                h, w, _ = img.shape
                for lm in hand_landmarks.landmark:
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    landmarks.append((cx, cy))

                if len(landmarks) >= 9:
                    self.detect_gesture(landmarks)
        return img

    def detect_gesture(self, landmarks):
        global live_gesture_state
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        dist = ((thumb_tip[0] - index_tip[0])**2 + (thumb_tip[1] - index_tip[1])**2)**0.5
        if dist < 30:
            live_gesture_state["pinch"] = True
        else:
            live_gesture_state["pinch"] = False


gesture_detector = GestureDetector()

# === Flask Setup ===
app = Flask(__name__)
CORS(app)

# === Signal Cleanup ===
def signal_handler(sig, frame):
    global cap
    if cap and cap.isOpened():
        cap.release()
    cv2.destroyAllWindows()
    print("Server terminated. Camera released.")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# === Gender Classification ===
def classify_gender(face_roi):
    try:
        face = cv2.resize(face_roi, (96, 96))
        face = img_to_array(face) / 255.0
        face = np.expand_dims(face, axis=0)
        preds = model.predict(face, verbose=0)[0]
        max_idx = np.argmax(preds)
        return (GENDER_CLASSES[max_idx], preds[max_idx]) if preds[max_idx] >= 0.7 else ("Unknown", preds[max_idx])
    except:
        return "Unknown", 0.0

cap = cv2.VideoCapture(0)

# === Frame Generator ===
def gen_frames():
    global cap, live_gender_counts, should_stop
    should_stop = False
    print("Opening webcam...")

    if not cap or not cap.isOpened():
        cap = cv2.VideoCapture(0)

    if not cap or not cap.isOpened():
        print("Error: Could not access the camera.")
        return

    print("Camera started. Flushing initial frames...")
    for _ in range(10):
        cap.read()

    frame_count = 0

    try:
        while True:
            if should_stop:
                break

            success, frame = cap.read()
            if not success:
                break

            frame_count += 1
            if frame_count % FRAME_SKIP != 0:
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            gray = clahe.apply(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
            h, w = frame.shape[:2]

            blob = cv2.dnn.blobFromImage(cv2.resize(frame, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
            face_net.setInput(blob)
            detections = face_net.forward()

            counts = {"Male": 0, "Female": 0, "Unknown": 0, "Total": 0}

            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence < CONFIDENCE_THRESHOLD:
                    continue

                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                startX, startY, endX, endY = box.astype("int")
                startX, startY = max(0, startX), max(0, startY)
                endX, endY = min(w - 1, endX), min(h - 1, endY)

                face_roi = rgb[startY:endY, startX:endX]
                if face_roi.size == 0:
                    continue

                gender, conf = classify_gender(face_roi)
                counts[gender] += 1
                counts["Total"] += 1

                color = GENDER_COLORS[gender]
                cv2.rectangle(frame, (startX, startY), (endX, endY), color, 1)
                cv2.putText(frame, gender, (startX, startY - 10 if startY > 20 else startY + 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1, cv2.LINE_AA)

            live_gender_counts = counts

            # Apply gesture detection
            frame = gesture_detector.process(frame)

            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    except GeneratorExit:
        print("Video stream closed by client.")

# === Flask Routes ===
@app.route('/ping')
def ping():
    return jsonify({"status": "ok"})

@app.route('/shutdown', methods=['GET'])
def shutdown_feed():
    global should_stop, cap, live_gender_counts
    should_stop = True
    live_gender_counts = {"Male": 0, "Female": 0, "Unknown": 0, "Total": 0}
    if cap and cap.isOpened():
        cap.release()
        cap = None
    cv2.destroyAllWindows()
    print("Stopped and Camera released.")
    return jsonify({"message": "Shutdown done."})

@app.route('/video')
def video_feed():
    return Response(stream_with_context(gen_frames()), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stats')
def get_stats():
    return jsonify(live_gender_counts)

@app.route('/gesture')
def get_gesture():
    return jsonify(live_gesture_state)

# === Start Server ===
cli = sys.modules.get('flask.cli')
if cli:
    cli.show_server_banner = lambda *x: None

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

try:
    if __name__ == '__main__':
        print("Running on http://0.0.0.0:7000")
        app.run(host='0.0.0.0', port=7000, debug=False, use_reloader=False)
except Exception as e:
    print("❗ Flask crashed:", e)
    traceback.print_exc()
