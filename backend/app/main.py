from flask import Flask, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

# Imports for pose estimation
import cv2
import mediapipe as mp
import numpy as np
import tempfile

import time

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev_secret_key_change_me")
CORS(app)

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

# --------------- Pose Estimation ---------------
# Exercise limit default setting variables
DEFAULT_RECOVERY_THRESHOLD_ANGLE = 160 # Note: This angle is where user will return/at resting position
DEFAULT_ENGAGED_THRESHOLD_ANGLE = 140 # Note: This angle is where user will get into exercise position

# Feedback Varaibles
feedback = ""
COOLDOWN_SECONDS = 10
mp_pose = mp.solutions.pose

# Get coordinates from 3 joints/points
def get3Cord(landmarks, mp_pose, startJoint, midJoint, endJoint):
    firstLandmark_enum = getattr(mp_pose.PoseLandmark, startJoint)
    secondLandmark_enum = getattr(mp_pose.PoseLandmark, midJoint)
    thirdLandmark_enum = getattr(mp_pose.PoseLandmark, endJoint)
    firstJointCord = [landmarks[firstLandmark_enum.value].x, landmarks[firstLandmark_enum.value].y]
    secondJointCord = [landmarks[secondLandmark_enum.value].x, landmarks[secondLandmark_enum.value].y]
    thirdJointCord = [landmarks[thirdLandmark_enum.value].x, landmarks[thirdLandmark_enum.value].y]
    return (firstJointCord, secondJointCord, thirdJointCord)

# Calculate angle function (3 points)
def calculate_angle(first, mid, end):
    a = np.array(first)
    b = np.array(mid)
    c = np.array(end)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    if angle > 180.0:
        angle = 360-angle
    return angle

# Calculation for back leaning angle (2 points compared with 1 point vertically up) 
def calculate_back_angle(shoulder, hip):
    # Vector from hip to shoulder (torso direction)
    torso_vec = np.array([
        shoulder.x - hip.x,
        shoulder.y - hip.y
    ])

    # Vertical vector (straight up from hip)
    vertical_vec = np.array([0, -1])  # y-axis points downward in image coords

    # Normalize vectors
    torso_vec = torso_vec / np.linalg.norm(torso_vec)
    vertical_vec = vertical_vec / np.linalg.norm(vertical_vec)

    # Calculate angle in radians, then convert to degrees
    dot_product = np.dot(torso_vec, vertical_vec)
    angle_rad = np.arccos(dot_product)
    angle_deg = np.degrees(angle_rad)

    return angle_deg

@app.route("/pose", methods=["POST"])
def pose_estimation():
    # Initialize session variables if they don't exist
    if 'counter' not in session:
        # Exervise counter variables
        session['counter'] = 0
        session['stage'] = None
        # Exercise limit setting variables
        session['trackedAngle'] = 160
        session['engagedThreshholdAngle1'] = []
        session['avgAngle'] = None
        # Feedback Varaibles
        session['last_feedback'] = ""
        session['last_spoken_time'] = 0

    if "image" not in request.files:
        return {"error": "No image uploaded"}, 400
    file = request.files["image"]
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp:
        file.save(temp.name)
        image_path = temp.name

    image = cv2.imread(image_path)
    if image is None:
        return {"error": "Invalid image"}, 400

    # Recolour image to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    with mp_pose.Pose(static_image_mode=True) as pose:
        # Make detection
        results = pose.process(image_rgb)
        if not results.pose_landmarks:
            return {"error": "No pose detected"}, 200

        # Extract Landmarks
        landmarks = results.pose_landmarks.landmark
        try:
            # Get coordinates
            # (Knee)
            startPoint, midPoint, endPoint = get3Cord(
                landmarks, mp_pose, "LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"
            )
            # (Hip)
            startPoint2, midPoint2, endPoint2 = get3Cord(
                landmarks, mp_pose, "LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"
            )

            # Calculate Angle
            kneeAngle = calculate_angle(startPoint, midPoint, endPoint)
            hipAngle = calculate_angle(startPoint2, midPoint2, endPoint2)
            left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            back_angle = calculate_back_angle(left_shoulder, left_hip)

            # Threshhold setting logic
            if session['counter'] < 2:
                if kneeAngle > DEFAULT_RECOVERY_THRESHOLD_ANGLE: 
                    # Check if user did a cycle and record his max angle motion 
                    if session['stage'] == "Down": 
                        # Convert to list if needed (sessions can't store arrays)
                        engagedThreshholdAngle1 = session.get('engagedThreshholdAngle1', [])
                        engagedThreshholdAngle1.append(session['trackedAngle'])
                        session['engagedThreshholdAngle1'] = engagedThreshholdAngle1
                        session['trackedAngle'] = 160 # Reset angle
                        session['counter'] += 1
                    session['stage'] = "Up"
                if kneeAngle < DEFAULT_ENGAGED_THRESHOLD_ANGLE:
                    session['stage'] = "Down"
                    if session['trackedAngle'] > kneeAngle:
                        session['trackedAngle'] = kneeAngle
            # Calc avg angle
            else:
                if session['avgAngle'] is None:
                    engagedThreshholdAngle1 = session.get('engagedThreshholdAngle1', [])
                    if engagedThreshholdAngle1:
                        session['avgAngle'] = sum(engagedThreshholdAngle1) / len(engagedThreshholdAngle1)
                    else:
                        session['avgAngle'] = DEFAULT_ENGAGED_THRESHOLD_ANGLE
                
                # Exercise counter logic
                if kneeAngle > DEFAULT_RECOVERY_THRESHOLD_ANGLE: # Note: leeway given as we might not always get exact deg (Also front/side perspective is diff)
                    session['stage'] = "Up"
                if kneeAngle < session['avgAngle'] and session['stage'] == "Up":
                    session['stage'] = "Down"
                    session['counter'] += 1
                    print(session['counter']) 

            # Posture checking logic
            feedback = ""
            if session['stage'] == "Down":
                # Back posture check
                if back_angle < 20:
                    feedback = "Lean forward slightly more."
                elif back_angle > 45:
                    feedback = "Keep your back more upright."
                else:
                    feedback = "Good posture!"
            elif session['counter'] < 2:
                feedback = "Need to personalise your avg."
            else:
                feedback = "You can do this! :)"
                
            # Readtime audio feedback w/ logic to check if last spoken feedback is the same so as not to keep repeating 
            if feedback != session['last_feedback'] and feedback != "":
                current_time = time.time()
                if current_time - session['last_spoken_time'] > COOLDOWN_SECONDS:
                    # speak(feedback)
                    session['last_feedback'] = feedback
                    session['last_spoken_time'] = current_time
                    
        except Exception as e:
            return {"error": f"Failed to calculate angles: {str(e)}"}, 500

        # Force session to save
        session.modified = True
        
        return {
            "reps": session['counter'],
            "stage": session['stage'],
            "avg_angle": session['avgAngle'],
            "knee_angle": round(kneeAngle, 2),
            "hip_angle": round(hipAngle, 2),
            "back_angle": round(back_angle, 2),
            "feedback": feedback
        }
    
# Add this endpoint to reset the session
@app.route("/reset_pose_session", methods=["POST"])
def reset_pose_session():
    # Reset all the session variables
    session['counter'] = 0
    session['stage'] = None
    session['trackedAngle'] = 160
    session['engagedThreshholdAngle1'] = []
    session['avgAngle'] = None
    session['last_feedback'] = ""
    session['last_spoken_time'] = 0
    session.modified = True
    
    return {
        "message": "Session reset successfully",
        "reps": session['counter'],
        "stage": session['stage'],
        "avg_angle": session['avgAngle']
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)