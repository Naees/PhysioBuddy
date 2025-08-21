from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

# Imports for pose estimation
import cv2
import mediapipe as mp
import numpy as np
import tempfile

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))

@app.route("/")
def index():
    return jsonify({"message": "Flask connected to PostgreSQL!"})

@app.route("/users") # testing flask < > backend
def get_users():
    users = User.query.all()
    return jsonify([{"id": u.id, "name": u.name} for u in users])

@app.route("/ping") # testing frontend < > db
def ping():
    return {"message": "pong"}

# --- Pose Estimation ---
mp_pose = mp.solutions.pose

def get3Cord(landmarks, mp_pose, startJoint, midJoint, endJoint):
    firstLandmark_enum = getattr(mp_pose.PoseLandmark, startJoint)
    secondLandmark_enum = getattr(mp_pose.PoseLandmark, midJoint)
    thirdLandmark_enum = getattr(mp_pose.PoseLandmark, endJoint)
    firstJointCord = [landmarks[firstLandmark_enum.value].x, landmarks[firstLandmark_enum.value].y]
    secondJointCord = [landmarks[secondLandmark_enum.value].x, landmarks[secondLandmark_enum.value].y]
    thirdJointCord = [landmarks[thirdLandmark_enum.value].x, landmarks[thirdLandmark_enum.value].y]
    return (firstJointCord, secondJointCord, thirdJointCord)

def calculate_angle(first, mid, end):
    a = np.array(first)
    b = np.array(mid)
    c = np.array(end)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    if angle > 180.0:
        angle = 360-angle
    return angle

@app.route("/pose", methods=["POST"])
def pose_estimation():
    if "image" not in request.files:
        return {"error": "No image uploaded"}, 400
    file = request.files["image"]
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp:
        file.save(temp.name)
        image_path = temp.name

    image = cv2.imread(image_path)
    if image is None:
        return {"error": "Invalid image"}, 400

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    with mp_pose.Pose(static_image_mode=True) as pose:
        results = pose.process(image_rgb)
        if not results.pose_landmarks:
            return {"error": "No pose detected"}, 200

        landmarks = results.pose_landmarks.landmark
        try:
            startPoint, midPoint, endPoint = get3Cord(
                landmarks, mp_pose, "LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"
            )
            kneeAngle = calculate_angle(startPoint, midPoint, endPoint)
        except Exception as e:
            return {"error": f"Failed to calculate angles: {str(e)}"}, 500

        return {
            "knee_angle": round(kneeAngle, 2),
            "message": "Pose detected"
        }
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)