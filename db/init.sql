-- PhysioBuddy Database Schema and Seed Data

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS exercise_sessions CASCADE;
DROP TABLE IF EXISTS patient_exercise_assignments CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS clinical_notes CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS weekly_progress CASCADE;
DROP TABLE IF EXISTS daily_reflections CASCADE;
DROP TABLE IF EXISTS daily_pain_reports CASCADE;
DROP TABLE IF EXISTS treatment_plans CASCADE;
DROP TABLE IF EXISTS medical_information CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS physiotherapists CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- Create tables in dependency order

-- Core entities
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER CHECK (age > 0 AND age < 150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE physiotherapists (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    license_no VARCHAR(50) UNIQUE NOT NULL,
    specializations TEXT[],
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    instructions TEXT,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    body_part VARCHAR(100),
    duration_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient-related tables
CREATE TABLE medical_information (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    physiotherapist_id INTEGER REFERENCES physiotherapists(id),
    injury_type VARCHAR(200),
    recovery_phase VARCHAR(50) CHECK (recovery_phase IN ('acute', 'subacute', 'chronic', 'maintenance')),
    special_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE treatment_plans (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    physiotherapist_id INTEGER REFERENCES physiotherapists(id),
    workouts_per_week INTEGER CHECK (workouts_per_week > 0),
    goals TEXT,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tracking tables
CREATE TABLE daily_pain_reports (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    report_date DATE DEFAULT CURRENT_DATE,
    pain_scale INTEGER CHECK (pain_scale >= 0 AND pain_scale <= 10),
    pain_location VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(patient_id, report_date)
);

CREATE TABLE daily_reflections (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    reflection_date DATE DEFAULT CURRENT_DATE,
    reflection_text TEXT,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weekly_progress (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    week_start_date DATE,
    completion_percentage DECIMAL(5,2) CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    exercises_completed INTEGER DEFAULT 0,
    exercises_planned INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(patient_id, week_start_date)
);

-- Exercise management
CREATE TABLE patient_exercise_assignments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    assigned_by INTEGER REFERENCES physiotherapists(id),
    assigned_date DATE DEFAULT CURRENT_DATE,
    sets_assigned INTEGER CHECK (sets_assigned > 0),
    reps_assigned INTEGER CHECK (reps_assigned > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercise_sessions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    assignment_id INTEGER REFERENCES patient_exercise_assignments(id),
    session_date DATE DEFAULT CURRENT_DATE,
    sets_completed INTEGER CHECK (sets_completed >= 0),
    reps_completed INTEGER CHECK (reps_completed >= 0),
    pain_rating INTEGER CHECK (pain_rating >= 0 AND pain_rating <= 10),
    notes TEXT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercise_rep_tracking (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES exercise_sessions(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    current_reps INTEGER DEFAULT 0,
    target_reps INTEGER NOT NULL,
    current_set INTEGER DEFAULT 1,
    target_sets INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communication
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) CHECK (sender_type IN ('patient', 'physiotherapist', 'bot')),
    sender_id INTEGER,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments and clinical notes
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    physiotherapist_id INTEGER REFERENCES physiotherapists(id),
    appointment_date DATE,
    appointment_time TIME,
    status VARCHAR(20) CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinical_notes (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    physiotherapist_id INTEGER REFERENCES physiotherapists(id),
    assessment TEXT,
    treatment_provided TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_medical_info_patient ON medical_information(patient_id);
CREATE INDEX idx_pain_reports_patient_date ON daily_pain_reports(patient_id, report_date);
CREATE INDEX idx_exercise_sessions_patient ON exercise_sessions(patient_id, session_date);
CREATE INDEX idx_chat_messages_patient ON chat_messages(patient_id, timestamp);
CREATE INDEX idx_rep_tracking_session ON exercise_rep_tracking(session_id, is_active);

-- Insert seed data

-- Physiotherapists
INSERT INTO physiotherapists (first_name, last_name, license_no, specializations, email) VALUES
('Dr. Sarah', 'Johnson', 'PT001234', ARRAY['Sports Injury', 'Orthopedic'], 'sarah.johnson@physiobuddy.com'),
('Dr. Michael', 'Chen', 'PT005678', ARRAY['Neurological', 'Geriatric'], 'michael.chen@physiobuddy.com'),
('Dr. Emily', 'Rodriguez', 'PT009012', ARRAY['Pediatric', 'Manual Therapy'], 'emily.rodriguez@physiobuddy.com');

-- Patients
INSERT INTO patients (first_name, last_name, email, age) VALUES
('John', 'Smith', 'john.smith@email.com', 32),
('Maria', 'Garcia', 'maria.garcia@email.com', 28),
('David', 'Wilson', 'david.wilson@email.com', 45),
('Lisa', 'Brown', 'lisa.brown@email.com', 38),
('James', 'Taylor', 'james.taylor@email.com', 29);

-- Exercises
INSERT INTO exercises (name, description, instructions, difficulty_level, body_part, duration_minutes) VALUES
-- Knee/ACL exercises
('Knee Flexion', 'Basic knee bending exercise', 'Sit on chair, slowly bend knee to 90 degrees, hold for 5 seconds', 'beginner', 'knee', 10),
('Quad Sets', 'Quadriceps strengthening', 'Sit with leg straight, tighten thigh muscle, hold 5 seconds', 'beginner', 'knee', 8),
('Straight Leg Raises', 'Strengthen quadriceps without knee stress', 'Lie down, lift straight leg 6 inches, hold 3 seconds', 'intermediate', 'knee', 12),
('Wall Sits', 'Knee and thigh strengthening', 'Back against wall, slide down to sitting position, hold 30 seconds', 'intermediate', 'knee', 10),
-- Back exercises
('Cat-Cow Stretch', 'Spinal mobility', 'On hands and knees, arch and round back alternately', 'beginner', 'back', 8),
('Pelvic Tilts', 'Core and lower back', 'Lie on back, tilt pelvis to flatten lower back', 'beginner', 'back', 10),
('Bird Dog', 'Core stability', 'On hands and knees, extend opposite arm and leg', 'intermediate', 'back', 12),
-- Shoulder exercises
('Shoulder Rolls', 'Shoulder mobility exercise', 'Roll shoulders forward 10 times, then backward 10 times', 'beginner', 'shoulder', 5),
('Pendulum Swings', 'Gentle shoulder mobility', 'Lean forward, let arm hang, swing gently in circles', 'beginner', 'shoulder', 8),
('External Rotation', 'Rotator cuff strengthening', 'Elbow at side, rotate arm outward with resistance band', 'intermediate', 'shoulder', 10),
('Scapular Squeezes', 'Upper back and shoulder blade', 'Squeeze shoulder blades together, hold 5 seconds', 'beginner', 'shoulder', 8),
-- Ankle exercises
('Single Leg Stand', 'Balance and stability', 'Stand on one leg for 30 seconds, use wall for support if needed', 'advanced', 'ankle', 10),
('Ankle Circles', 'Ankle mobility', 'Sit and rotate ankle in circles, 10 each direction', 'beginner', 'ankle', 5),
('Calf Raises', 'Strengthen calf muscles', 'Rise up on toes, hold 2 seconds, lower slowly', 'intermediate', 'calf', 12),
('Heel Walks', 'Ankle dorsiflexion', 'Walk on heels for 20 steps', 'intermediate', 'ankle', 8),
-- Elbow exercises
('Wrist Flexor Stretch', 'Tennis elbow relief', 'Extend arm, pull hand back gently, hold 30 seconds', 'beginner', 'elbow', 5),
('Eccentric Wrist Curls', 'Tendon strengthening', 'Slowly lower weight with wrist, assist up with other hand', 'intermediate', 'elbow', 10),
('Grip Strengthening', 'Forearm and grip', 'Squeeze tennis ball or grip strengthener', 'beginner', 'elbow', 8),
-- General exercises
('Wall Push-ups', 'Modified push-up against wall', 'Stand arms length from wall, place palms flat, push in and out', 'beginner', 'chest', 8),
('Hip Bridges', 'Strengthen glutes and core', 'Lie on back, lift hips up, squeeze glutes, hold 3 seconds', 'intermediate', 'hip', 15);

-- Medical Information
INSERT INTO medical_information (patient_id, physiotherapist_id, injury_type, recovery_phase, special_notes) VALUES
(1, 1, 'ACL Tear', 'subacute', 'Post-surgery 6 weeks, cleared for weight bearing'),
(2, 2, 'Lower Back Strain', 'acute', 'Recent injury, avoid heavy lifting'),
(3, 1, 'Rotator Cuff Injury', 'chronic', 'Long-term management, focus on mobility'),
(4, 3, 'Ankle Sprain', 'subacute', 'Grade 2 sprain, improving range of motion'),
(5, 2, 'Tennis Elbow', 'chronic', 'Recurring issue, ergonomic modifications needed');

-- Treatment Plans
INSERT INTO treatment_plans (patient_id, physiotherapist_id, workouts_per_week, goals, start_date, end_date) VALUES
(1, 1, 3, 'Regain full knee mobility and strength for return to sports', '2024-01-15', '2024-04-15'),
(2, 2, 2, 'Reduce pain and improve core stability', '2024-02-01', '2024-03-01'),
(3, 1, 4, 'Maintain shoulder function and prevent further deterioration', '2024-01-20', '2024-06-20'),
(4, 3, 3, 'Full ankle mobility and proprioception', '2024-02-10', '2024-04-10'),
(5, 2, 2, 'Pain management and grip strength improvement', '2024-01-25', '2024-04-25');

-- Patient Exercise Assignments
INSERT INTO patient_exercise_assignments (patient_id, exercise_id, assigned_by, sets_assigned, reps_assigned) VALUES
-- John (ACL Tear) - Knee-focused exercises
(1, 1, 1, 3, 15), -- Knee Flexion
(1, 2, 1, 3, 10), -- Quad Sets
(1, 3, 1, 2, 8),  -- Straight Leg Raises
(1, 19, 1, 2, 12), -- Hip Bridges
-- Maria (Lower Back Strain) - Back and core exercises
(2, 5, 2, 3, 10), -- Cat-Cow Stretch
(2, 6, 2, 3, 10), -- Pelvic Tilts
(2, 7, 2, 2, 8),  -- Bird Dog
(2, 19, 2, 2, 12), -- Hip Bridges
-- David (Rotator Cuff) - Shoulder exercises
(3, 8, 1, 3, 10), -- Shoulder Rolls
(3, 9, 1, 3, 15), -- Pendulum Swings
(3, 10, 1, 2, 12), -- External Rotation
(3, 11, 1, 3, 10), -- Scapular Squeezes
-- Lisa (Ankle Sprain) - Ankle and balance exercises
(4, 12, 3, 3, 30), -- Single Leg Stand
(4, 13, 3, 3, 10), -- Ankle Circles
(4, 14, 3, 3, 15), -- Calf Raises
(4, 15, 3, 2, 20), -- Heel Walks
-- James (Tennis Elbow) - Elbow and forearm exercises
(5, 16, 2, 3, 30), -- Wrist Flexor Stretch
(5, 17, 2, 2, 10), -- Eccentric Wrist Curls
(5, 18, 2, 3, 15), -- Grip Strengthening
(5, 8, 2, 2, 10);  -- Shoulder Rolls

-- Daily Pain Reports (last 7 days)
INSERT INTO daily_pain_reports (patient_id, report_date, pain_scale, pain_location, notes) VALUES
(1, CURRENT_DATE - INTERVAL '6 days', 4, 'knee', 'Mild pain after exercises'),
(1, CURRENT_DATE - INTERVAL '5 days', 3, 'knee', 'Improving, less stiffness'),
(1, CURRENT_DATE - INTERVAL '4 days', 3, 'knee', 'Good day, minimal discomfort'),
(2, CURRENT_DATE - INTERVAL '6 days', 6, 'lower back', 'Sharp pain in morning'),
(2, CURRENT_DATE - INTERVAL '5 days', 5, 'lower back', 'Better with heat therapy'),
(3, CURRENT_DATE - INTERVAL '6 days', 5, 'shoulder', 'Stiff after sleeping'),
(3, CURRENT_DATE - INTERVAL '5 days', 4, 'shoulder', 'Exercises helping');

-- Daily Reflections
INSERT INTO daily_reflections (patient_id, reflection_date, reflection_text, mood_rating, energy_level) VALUES
(1, CURRENT_DATE - INTERVAL '1 day', 'Feeling optimistic about recovery progress', 4, 4),
(2, CURRENT_DATE - INTERVAL '1 day', 'Back pain is challenging but manageable', 3, 3),
(3, CURRENT_DATE - INTERVAL '1 day', 'Shoulder mobility improving slowly', 3, 4);

-- Weekly Progress
INSERT INTO weekly_progress (patient_id, week_start_date, completion_percentage, exercises_completed, exercises_planned, notes) VALUES
(1, date_trunc('week', CURRENT_DATE), 85.0, 17, 20, 'Great progress this week'),
(2, date_trunc('week', CURRENT_DATE), 70.0, 14, 20, 'Missed some sessions due to pain'),
(3, date_trunc('week', CURRENT_DATE), 90.0, 18, 20, 'Consistent with routine'),
(4, date_trunc('week', CURRENT_DATE), 75.0, 15, 20, 'Balance exercises challenging'),
(5, date_trunc('week', CURRENT_DATE), 60.0, 12, 20, 'Work schedule interfering');

-- Exercise Sessions (recent completions)
INSERT INTO exercise_sessions (patient_id, exercise_id, assignment_id, session_date, sets_completed, reps_completed, pain_rating, notes) VALUES
-- John - 3 completed (excellent progress)
(1, 1, 1, CURRENT_DATE, 3, 15, 2, 'Completed full range of motion'),
(1, 2, 2, CURRENT_DATE, 3, 10, 1, 'Good strength today'),
(1, 3, 3, CURRENT_DATE, 2, 8, 2, 'Feeling stronger'),
-- Maria - 1 completed (struggling with pain)
(2, 5, 5, CURRENT_DATE, 2, 8, 4, 'Back pain limited movement'),
-- David - 4 completed (very motivated)
(3, 8, 9, CURRENT_DATE, 3, 10, 1, 'Shoulder mobility excellent'),
(3, 9, 10, CURRENT_DATE, 3, 15, 1, 'No pain during swings'),
(3, 10, 11, CURRENT_DATE, 2, 12, 2, 'Good rotation strength'),
(3, 11, 12, CURRENT_DATE, 3, 10, 1, 'Perfect form today'),
-- Lisa - 2 completed (steady progress)
(4, 12, 13, CURRENT_DATE, 2, 25, 3, 'Balance challenging but improving'),
(4, 14, 15, CURRENT_DATE, 3, 15, 2, 'Calf strength much better'),
-- James - 1 completed (busy schedule)
(5, 16, 17, CURRENT_DATE, 3, 30, 3, 'Stretch helped with stiffness');

-- Exercise Rep Tracking (active sessions)
INSERT INTO exercise_rep_tracking (session_id, patient_id, exercise_id, current_reps, target_reps, current_set, target_sets) VALUES
-- John's active sessions
(1, 1, 1, 8, 15, 2, 3),  -- Knee Flexion - mid-session
(2, 1, 2, 10, 10, 3, 3), -- Quad Sets - completed current set
-- Maria's active session
(4, 2, 5, 5, 10, 1, 3),  -- Cat-Cow - just started
-- David's active sessions
(5, 3, 8, 10, 10, 3, 3), -- Shoulder Rolls - completed
(6, 3, 9, 12, 15, 2, 3), -- Pendulum Swings - almost done
-- Lisa's active sessions
(9, 4, 12, 20, 30, 1, 3), -- Single Leg Stand - in progress
(10, 4, 14, 15, 15, 3, 3), -- Calf Raises - completed current set
-- James's active session
(11, 5, 16, 25, 30, 2, 3); -- Wrist Flexor Stretch - almost done

-- Chat Messages
INSERT INTO chat_messages (patient_id, sender_type, sender_id, content, message_type) VALUES
(1, 'patient', 1, 'Hi Dr. Johnson, my knee is feeling much better today!', 'text'),
(1, 'physiotherapist', 1, 'That''s great to hear John! Keep up with your exercises.', 'text'),
(2, 'patient', 2, 'Should I continue exercises if my back pain increases?', 'text'),
(2, 'physiotherapist', 2, 'Stop if pain exceeds 6/10. Try gentle stretches instead.', 'text'),
(1, 'bot', NULL, 'Reminder: You have 2 exercises scheduled for today.', 'reminder');

-- Appointments
INSERT INTO appointments (patient_id, physiotherapist_id, appointment_date, appointment_time, status, notes) VALUES
(1, 1, CURRENT_DATE + INTERVAL '3 days', '10:00', 'scheduled', 'Follow-up assessment'),
(2, 2, CURRENT_DATE + INTERVAL '1 day', '14:30', 'scheduled', 'Pain management review'),
(3, 1, CURRENT_DATE - INTERVAL '7 days', '09:00', 'completed', 'Range of motion assessment'),
(4, 3, CURRENT_DATE + INTERVAL '5 days', '11:15', 'scheduled', 'Balance training session');

-- Clinical Notes
INSERT INTO clinical_notes (patient_id, physiotherapist_id, assessment, treatment_provided, notes) VALUES
(1, 1, 'Knee flexion improved to 120 degrees. Strength 4/5.', 'Manual therapy, exercise progression', 'Ready for next phase of rehabilitation'),
(2, 2, 'Lower back pain 5/10. Limited forward flexion.', 'Heat therapy, gentle mobilization', 'Patient education on posture provided'),
(3, 1, 'Shoulder abduction 140 degrees. Some impingement signs.', 'Soft tissue work, strengthening exercises', 'Avoid overhead activities for now');

-- Create a simple users table for testing (keeping original for compatibility)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

INSERT INTO users (name) VALUES 
('John Smith'),
('Maria Garcia'),
('David Wilson'),
('Lisa Brown'),
('James Taylor');

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;