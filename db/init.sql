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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(patient_id, reflection_date)
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
('Knee Flexion', 'Basic knee bending exercise', 'Sit on chair, slowly bend knee to 90 degrees, hold for 5 seconds', 'beginner', 'knee', 10),
('Shoulder Rolls', 'Shoulder mobility exercise', 'Roll shoulders forward 10 times, then backward 10 times', 'beginner', 'shoulder', 5),
('Wall Push-ups', 'Modified push-up against wall', 'Stand arms length from wall, place palms flat, push in and out', 'beginner', 'chest', 8),
('Calf Raises', 'Strengthen calf muscles', 'Rise up on toes, hold 2 seconds, lower slowly', 'intermediate', 'calf', 12),
('Hip Bridges', 'Strengthen glutes and core', 'Lie on back, lift hips up, squeeze glutes, hold 3 seconds', 'intermediate', 'hip', 15),
('Single Leg Stand', 'Balance and stability', 'Stand on one leg for 30 seconds, use wall for support if needed', 'advanced', 'ankle', 10);

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
(1, 1, 1, 3, 15), -- John - Knee Flexion
(1, 5, 1, 2, 12), -- John - Hip Bridges
(2, 5, 2, 3, 10), -- Maria - Hip Bridges
(2, 4, 2, 2, 15), -- Maria - Calf Raises
(3, 2, 1, 3, 10), -- David - Shoulder Rolls
(3, 3, 1, 2, 8),  -- David - Wall Push-ups
(4, 6, 3, 3, 30), -- Lisa - Single Leg Stand
(4, 4, 3, 3, 12), -- Lisa - Calf Raises
(5, 3, 2, 2, 10), -- James - Wall Push-ups
(5, 2, 2, 3, 15); -- James - Shoulder Rolls

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
(1, 1, 1, CURRENT_DATE - INTERVAL '1 day', 3, 15, 2, 'Completed full range of motion'),
(1, 5, 2, CURRENT_DATE - INTERVAL '1 day', 2, 12, 3, 'Slight discomfort in hip'),
(2, 5, 3, CURRENT_DATE - INTERVAL '2 days', 3, 10, 4, 'Back felt tight'),
(3, 2, 5, CURRENT_DATE - INTERVAL '1 day', 3, 10, 2, 'Good mobility today');

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