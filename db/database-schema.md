# Database Relationships Diagram

## Core Entity Relationships

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│    PATIENTS     │───────│ MEDICAL_INFO     │       │ PHYSIOTHERAPISTS │
│                 │  1:1  │                  │       │                 │
│ • id (PK)       │       │ • patient_id (FK)│       │ • id (PK)       │
│ • first_name    │       │ • injury_type    │       │ • first_name    │
│ • last_name     │       │ • recovery_phase │       │ • last_name     │
│ • email         │       │ • special_notes  │       │ • license_no    │
│ • age           │       │ • physio_id (FK) │───────│ • specializations│
└─────────────────┘       └──────────────────┘  1:M  └─────────────────┘
          │                                                     │
          │ 1:M                                            1:M  │
          ▼                                                     ▼
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│ TREATMENT_PLANS │       │  APPOINTMENTS    │       │ CLINICAL_NOTES  │
│                 │       │                  │       │                 │
│ • patient_id    │       │ • patient_id     │       │ • patient_id    │
│ • physio_id     │       │ • physio_id      │       │ • physio_id     │
│ • workouts/week │       │ • date & time    │       │ • assessment    │
│ • goals         │       │ • status         │       │ • treatment     │
└─────────────────┘       └──────────────────┘       └─────────────────┘
```

## Tracking & Monitoring Data

```
┌─────────────────┐
│    PATIENTS     │
│                 │
└─────────────────┘
          │
          │ 1:M (One patient, many daily records)
          ▼
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│ DAILY_PAIN      │       │ DAILY_REFLECTIONS│       │ WEEKLY_PROGRESS │
│ REPORTS         │       │                  │       │                 │
│                 │       │ • patient_id     │       │ • patient_id    │
│ • patient_id    │       │ • date           │       │ • week_start    │
│ • date          │       │ • reflection     │       │ • completion_%  │
│ • pain_scale    │       │ • mood_rating    │       │ • exercises     │
│ • location      │       │ • energy_level   │       │ • notes         │
└─────────────────┘       └──────────────────┘       └─────────────────┘
```

## Exercise Management System

```
┌─────────────────┐       ┌──────────────────┐
│   EXERCISES     │       │    PATIENTS      │
│   (Master)      │       │                  │
│                 │       └──────────────────┘
│ • id (PK)       │                  │
│ • name          │                  │
│ • description   │                  │ 1:M
│ • instructions  │                  ▼
│ • difficulty    │       ┌──────────────────┐
│ • body_part     │   M:M │ PATIENT_EXERCISE │
└─────────────────┘ ────▶ │  ASSIGNMENTS     │
          │               │                  │
          │ 1:M           │ • patient_id     │
          ▼               │ • exercise_id    │
┌─────────────────┐       │ • assigned_date  │
│ EXERCISE        │       │ • sets/reps      │
│ SESSIONS        │       │ • is_active      │
│                 │       └──────────────────┘
│ • patient_id    │                  │
│ • exercise_id   │                  │ 1:M
│ • session_date  │                  ▼
│ • sets_done     │       ┌──────────────────┐
│ • reps_done     │  M:1  │ EXERCISE         │
│ • pain_rating   │◄──────│ SESSIONS         │
│ • notes         │       │                  │
└─────────────────┘       │ • assignment_id  │
                          │ • completed_at   │
                          └──────────────────┘
```

## Communication System

```
┌─────────────────┐
│    PATIENTS     │
│                 │
└─────────────────┘
          │
          │ 1:M
          ▼
┌─────────────────┐       ┌──────────────────┐
│ CHAT_MESSAGES   │       │ PHYSIOTHERAPISTS │
│                 │       │                  │
│ • patient_id    │  M:1  │ • id (PK)        │
│ • content       │◄──────│ • name           │
│ • sender_type   │       │ • license        │
│ • sender_id     │       └──────────────────┘
│ • message_type  │
│ • timestamp     │
└─────────────────┘

Sender Types:
- 'patient' → sender_id references patients(id)
- 'physiotherapist' → sender_id references physiotherapists(id)  
- 'bot' → sender_id is NULL
```

## Key Foreign Key Relationships

### Patient-Centric (All reference patients.id)
- `medical_information.patient_id`
- `treatment_plans.patient_id`
- `daily_pain_reports.patient_id`
- `daily_reflections.patient_id`
- `weekly_progress.patient_id`
- `patient_exercise_assignments.patient_id`
- `exercise_sessions.patient_id`
- `appointments.patient_id`
- `chat_messages.patient_id`
- `clinical_notes.patient_id`

### Physiotherapist-Centric (All reference physiotherapists.id)
- `medical_information.physiotherapist_id`
- `treatment_plans.physiotherapist_id`
- `appointments.physiotherapist_id`
- `clinical_notes.physiotherapist_id`
- `patient_exercise_assignments.assigned_by`

### Exercise-Centric (All reference exercises.id)
- `patient_exercise_assignments.exercise_id`
- `exercise_sessions.exercise_id`

## Data Flow Example: Patient Exercise Completion

```
1. PHYSIOTHERAPIST assigns exercise to PATIENT
   ↓ (Creates record in patient_exercise_assignments)
   
2. PATIENT views assigned exercises in app
   ↓ (Reads from patient_exercise_assignments + exercises)
   
3. PATIENT completes exercise session
   ↓ (Creates record in exercise_sessions)
   
4. System calculates weekly progress
   ↓ (Updates weekly_progress table)
   
5. PHYSIOTHERAPIST reviews progress
   ↓ (Reads aggregated data from multiple tables)
```

## Query Examples for Common App Features

### Get Patient Dashboard Data
```sql
-- Patient info + current week progress
SELECT 
    p.first_name, p.last_name,
    mi.injury_type, mi.recovery_phase,
    wp.completion_percentage,
    wp.exercises_completed, wp.exercises_planned
FROM patients p
JOIN medical_information mi ON p.id = mi.patient_id
JOIN weekly_progress wp ON p.id = wp.patient_id
WHERE p.id = $patient_id 
AND wp.week_start_date = date_trunc('week', CURRENT_DATE);
```

### Get Pain Scale Data for Chart
```sql
-- Last 7 days of pain reports
SELECT report_date, pain_scale
FROM daily_pain_reports
WHERE patient_id = $patient_id
AND report_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY report_date;
```

### Get Today's Exercises
```sql
-- Assigned exercises with completion status
SELECT 
    e.name, e.duration_minutes, e.difficulty_level,
    pea.sets_assigned, pea.reps_assigned,
    CASE WHEN es.id IS NOT NULL THEN true ELSE false END as completed
FROM patient_exercise_assignments pea
JOIN exercises e ON pea.exercise_id = e.id
LEFT JOIN exercise_sessions es ON (
    pea.patient_id = es.patient_id 
    AND pea.exercise_id = es.exercise_id 
    AND es.session_date = CURRENT_DATE
)
WHERE pea.patient_id = $patient_id 
AND pea.is_active = true;
```