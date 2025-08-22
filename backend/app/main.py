from flask import Flask, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import text
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Imports for pose estimation
import cv2
import mediapipe as mp
import numpy as np
import tempfile
import time

# Import for TTS
import requests
from flask import send_file


app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev_secret_key_change_me")
CORS(app)

db = SQLAlchemy(app)

@app.route("/")
def index():
    return jsonify({"message": "Flask connected to PostgreSQL!"})

@app.route("/patients")
def get_all_patients():
    try:
        result = db.session.execute(
            text("SELECT id, first_name, last_name, email FROM patients ORDER BY id")
        ).fetchall()
        
        return jsonify([{
            "id": row[0],
            "name": f"{row[1]} {row[2]}",
            "first_name": row[1],
            "last_name": row[2],
            "email": row[3]
        } for row in result])
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/patients/<int:patient_id>")
def get_patient(patient_id):
    try:
        # Fetch patient with medical info and treatment plan from database
        result = db.session.execute(
            text("SELECT p.id, p.first_name, p.last_name, p.email, p.age, "
            "mi.injury_type, mi.recovery_phase, mi.special_notes, "
            "tp.workouts_per_week "
            "FROM patients p "
            "LEFT JOIN medical_information mi ON p.id = mi.patient_id "
            "LEFT JOIN treatment_plans tp ON p.id = tp.patient_id AND tp.is_active = true "
            "WHERE p.id = :patient_id"),
            {"patient_id": patient_id}
        ).fetchone()
        
        if result:
            return jsonify({
                "id": result[0],
                "first_name": result[1],
                "last_name": result[2],
                "email": result[3],
                "age": result[4],
                "injury_type": result[5],
                "recovery_phase": result[6],
                "special_notes": result[7],
                "workouts_per_week": result[8]
            })
        else:
            return jsonify({"error": "Patient not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/patients/<int:patient_id>/pain-reports")
def get_pain_reports(patient_id):
    try:
        result = db.session.execute(
            text("SELECT report_date, pain_scale, pain_location, notes "
            "FROM daily_pain_reports "
            "WHERE patient_id = :patient_id "
            "ORDER BY report_date DESC LIMIT 7"),
            {"patient_id": patient_id}
        ).fetchall()
        
        return jsonify([{
            "date": row[0].strftime("%a").upper() if row[0] else "",
            "scale": row[1],
            "location": row[2],
            "notes": row[3]
        } for row in result])
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/patients/<int:patient_id>/progress")
def get_weekly_progress(patient_id):
    try:
        # Get weekly progress
        progress_result = db.session.execute(
            text("SELECT completion_percentage, exercises_completed, exercises_planned "
            "FROM weekly_progress "
            "WHERE patient_id = :patient_id "
            "ORDER BY week_start_date DESC LIMIT 1"),
            {"patient_id": patient_id}
        ).fetchone()
        
        # Get treatment plan for weekly target
        treatment_result = db.session.execute(
            text("SELECT workouts_per_week, goals "
            "FROM treatment_plans "
            "WHERE patient_id = :patient_id AND is_active = true "
            "ORDER BY created_at DESC LIMIT 1"),
            {"patient_id": patient_id}
        ).fetchone()
        
        if progress_result:
            completion = float(progress_result[0]) if progress_result[0] else 42
            completed = progress_result[1] or 3
            planned = progress_result[2] or 6
        else:
            completion = 42
            completed = 3
            planned = 6
            
        weekly_target = treatment_result[0] if treatment_result else 6
        goals = treatment_result[1] if treatment_result else "Complete rehabilitation exercises"
        
        return jsonify({
            "completion_percentage": completion,
            "exercises_completed": completed,
            "exercises_planned": planned,
            "weekly_target": weekly_target,
            "goals": goals
        })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/patients/<int:patient_id>/exercises/today")
def get_today_exercises(patient_id):
    try:
        result = db.session.execute(
            text("SELECT e.id, e.name, e.description, e.instructions, e.difficulty_level, e.duration_minutes, "
            "pea.sets_assigned, pea.reps_assigned, "
            "CASE WHEN es.id IS NOT NULL THEN 'completed' "
            "     ELSE 'pending' END as status "
            "FROM patient_exercise_assignments pea "
            "JOIN exercises e ON pea.exercise_id = e.id "
            "LEFT JOIN exercise_sessions es ON pea.id = es.assignment_id AND es.session_date = CURRENT_DATE "
            "WHERE pea.patient_id = :patient_id AND pea.is_active = true"),
            {"patient_id": patient_id}
        ).fetchall()
        
        return jsonify([{
            "id": row[0],
            "name": row[1],
            "description": row[2] or "Therapeutic exercise for your rehabilitation program.",
            "instructions": row[3] or "Follow your physiotherapist's guidance",
            "difficulty": row[4] or "intermediate",
            "duration": row[5] or 8,
            "sets": row[6] or 3,
            "reps": row[7] or 10,
            "status": row[8]
        } for row in result])
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/patients/<int:patient_id>/appointments")
def get_patient_appointments(patient_id):
    try:
        result = db.session.execute(
            text("SELECT appointment_date, appointment_time, status, notes "
            "FROM appointments "
            "WHERE patient_id = :patient_id AND appointment_date >= CURRENT_DATE "
            "ORDER BY appointment_date, appointment_time LIMIT 1"),
            {"patient_id": patient_id}
        ).fetchone()
        
        if result:
            return jsonify({
                "date": result[0].strftime("%A, %d %B %Y") if result[0] else "",
                "time": result[1].strftime("%H:%M") if result[1] else "",
                "status": result[2],
                "notes": result[3]
            })
        else:
            return jsonify({"message": "No upcoming appointments"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/patients/<int:patient_id>/reflections", methods=["POST"])
def save_reflection(patient_id):
    try:
        data = request.get_json()
        reflection_text = data.get('reflection_text', '')
        
        # Always create a new reflection entry
        db.session.execute(
            text("INSERT INTO daily_reflections (patient_id, reflection_text, mood_rating, energy_level) "
            "VALUES (:patient_id, :reflection_text, 3, 3)"),
            {"patient_id": patient_id, "reflection_text": reflection_text}
        )
        db.session.commit()
        
        return jsonify({"message": "Reflection saved successfully"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/patients/<int:patient_id>/exercises/<int:exercise_id>/reps", methods=["GET"])
def get_exercise_reps(patient_id, exercise_id):
    try:
        result = db.session.execute(
            text("SELECT current_reps, target_reps, current_set, target_sets "
            "FROM exercise_rep_tracking "
            "WHERE patient_id = :patient_id AND exercise_id = :exercise_id AND is_active = true "
            "ORDER BY created_at DESC LIMIT 1"),
            {"patient_id": patient_id, "exercise_id": exercise_id}
        ).fetchone()
        
        if result:
            return jsonify({
                "current_reps": result[0],
                "target_reps": result[1],
                "current_set": result[2],
                "target_sets": result[3]
            })
        else:
            return jsonify({"current_reps": 0, "target_reps": 10, "current_set": 1, "target_sets": 3})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/patients/<int:patient_id>/exercises/<int:exercise_id>/reps", methods=["POST"])
def update_exercise_reps(patient_id, exercise_id):
    try:
        data = request.get_json()
        action = data.get('action')  # 'increment' or 'reset'
        
        if action == 'increment':
            db.session.execute(
                text("UPDATE exercise_rep_tracking SET current_reps = current_reps + 1, updated_at = CURRENT_TIMESTAMP "
                "WHERE patient_id = :patient_id AND exercise_id = :exercise_id AND is_active = true"),
                {"patient_id": patient_id, "exercise_id": exercise_id}
            )
        elif action == 'reset':
            db.session.execute(
                text("UPDATE exercise_rep_tracking SET current_reps = 0, updated_at = CURRENT_TIMESTAMP "
                "WHERE patient_id = :patient_id AND exercise_id = :exercise_id AND is_active = true"),
                {"patient_id": patient_id, "exercise_id": exercise_id}
            )
            
        db.session.commit()
        return jsonify({"message": "Reps updated successfully"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/patients/<int:patient_id>/exercises/<int:exercise_id>/complete", methods=["POST"])
def complete_exercise(patient_id, exercise_id):
    try:
        # Find the assignment ID
        assignment = db.session.execute(
            text("SELECT id FROM patient_exercise_assignments "
            "WHERE patient_id = :patient_id AND exercise_id = :exercise_id AND is_active = true"),
            {"patient_id": patient_id, "exercise_id": exercise_id}
        ).fetchone()
        
        if not assignment:
            return jsonify({"error": "Exercise assignment not found"}), 404
            
        # Record the completion
        db.session.execute(
            text("INSERT INTO exercise_sessions (patient_id, exercise_id, assignment_id, session_date, sets_completed, reps_completed, pain_rating, notes) "
            "VALUES (:patient_id, :exercise_id, :assignment_id, CURRENT_DATE, 3, 10, 2, 'Completed via app')"),
            {"patient_id": patient_id, "exercise_id": exercise_id, "assignment_id": assignment[0]}
        )
        
        # Deactivate rep tracking
        db.session.execute(
            text("UPDATE exercise_rep_tracking SET is_active = false "
            "WHERE patient_id = :patient_id AND exercise_id = :exercise_id AND is_active = true"),
            {"patient_id": patient_id, "exercise_id": exercise_id}
        )
        
        db.session.commit()
        return jsonify({"message": "Exercise completed successfully"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/ping")
def ping():
    return {"message": "pong"}

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        message = data.get('message', '')
        patient_id = data.get('patient_id')
        
        # Get patient context
        patient_context = ""
        if patient_id:
            patient_result = db.session.execute(
                text("SELECT first_name, injury_type, recovery_phase FROM patients p "
                "LEFT JOIN medical_information mi ON p.id = mi.patient_id "
                "WHERE p.id = :patient_id"),
                {"patient_id": patient_id}
            ).fetchone()
            if patient_result:
                patient_context = f"Patient: {patient_result[0]}, Injury: {patient_result[1]}, Phase: {patient_result[2]}"
        
        # Read API key from Docker secret
        try:
            with open('/run/secrets/gemini_api_key', 'r') as f:
                api_key = f.read().strip()
        except:
            api_key = os.getenv('GEMINI_API_KEY')  # Fallback for development
        
        # Gemini API call
        gemini_response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
            json={
                "contents": [{
                    "parts": [{
                        "text": f"You are a helpful physiotherapy assistant. {patient_context}\n\nPatient message: {message}\n\nProvide supportive, encouraging advice. Keep responses under 100 words."
                    }]
                }]
            }
        )
        
        if gemini_response.status_code == 200:
            response_data = gemini_response.json()
            bot_message = response_data["candidates"][0]["content"]["parts"][0]["text"]
            
            # Log usage
            print(f"Gemini API call successful - Patient: {patient_id}, Message length: {len(message)}")
            
            # Save to database
            if patient_id:
                db.session.execute(
                    text("INSERT INTO chat_messages (patient_id, sender_type, content) VALUES (:patient_id, 'patient', :message)"),
                    {"patient_id": patient_id, "message": message}
                )
                db.session.execute(
                    text("INSERT INTO chat_messages (patient_id, sender_type, content) VALUES (:patient_id, 'bot', :message)"),
                    {"patient_id": patient_id, "message": bot_message}
                )
                db.session.commit()
            
            return jsonify({"response": bot_message})
        else:
            print(f"Gemini API error: {gemini_response.status_code} - {gemini_response.text}")
            return jsonify({"error": "Failed to get response from Gemini"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ###############################################
# --------------- Pose Estimation ---------------
# ###############################################
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
            # if feedback != session['last_feedback'] and feedback != "":
            #     current_time = time.time()
            #     if current_time - session['last_spoken_time'] > COOLDOWN_SECONDS:
            #         speak(feedback)
            #         session['last_feedback'] = feedback
            #         session['last_spoken_time'] = current_time
                    
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
    

# ###############################################
# -------------- Reset the session --------------
# ###############################################
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

# ###############################################
# ------- Generating TTS w/ ElevenLabs API ------
# ###############################################
def speak_with_elevenlabs(text):
    """Generate speech using ElevenLabs API"""
    API_KEY = os.getenv("ELEVENLABS_API_KEY")
    VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Default to Rachel voice
    
    if not API_KEY:
        print("Warning: ELEVENLABS_API_KEY not set in environment")
        return None
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    
    headers = {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    
    data = {
        "text": text,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.7
        }
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        temp_file.write(response.content)
        temp_file_path = temp_file.name
        temp_file.close()
        
        print(f"[TTS] Generated speech for: {text}")
        return temp_file_path
        
    except Exception as e:
        print(f"TTS Error: {e}")
        return None

@app.route("/tts", methods=["POST"])
def text_to_speech():
    """Endpoint to generate speech from text"""
    print("POST /tts")
    if not request.json or "text" not in request.json:
        return {"error": "No text provided"}, 400
    
    text = request.json["text"]
    audio_file_path = speak_with_elevenlabs(text)
    
    if audio_file_path:
        # Return audio file as binary response (not attachment)
        return send_file(
            audio_file_path,
            mimetype="audio/mpeg"
        )
    else:
        return {"error": "Failed to generate speech"}, 500

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)