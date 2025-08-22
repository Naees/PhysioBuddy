from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import text
import os
import requests

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
        
        # Gemini API call
        gemini_response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={os.getenv('GEMINI_API_KEY')}",
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