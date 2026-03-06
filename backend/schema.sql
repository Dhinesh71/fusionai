-- ============================================================
-- FusionFlow Full Schema — run this in Supabase SQL Editor
-- ============================================================

-- Existing table (keep it)
CREATE TABLE IF NOT EXISTS workflow_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  status TEXT DEFAULT 'pending',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  error_log TEXT
);

-- ── Teachers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  api_key TEXT UNIQUE,       -- teacher's personal API key (for linking workflows)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Students (created by teachers) ───────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT NOT NULL,
  register_number TEXT,              -- e.g. 2021CS001
  full_name TEXT,                    -- student's full name
  department TEXT,                   -- e.g. Computer Science
  year INT,                          -- 1 | 2 | 3 | 4
  semester INT,                      -- 1 – 8
  phone TEXT,                        -- student phone
  parent_phone TEXT,                 -- parent/guardian phone
  accommodation TEXT DEFAULT 'Day Scholar',  -- 'Hosteller' | 'Day Scholar'
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  api_key TEXT UNIQUE,               -- student's OWN personal API key
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workflows ─────────────────────────────────────────────────
-- Owned by EITHER a teacher (teacher_id set, student_id NULL)
-- OR a student  (student_id set, teacher_id NULL).
-- This gives each user fully isolated, private workflow data.
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT 'Untitled Workflow',
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  nodes JSONB,
  edges JSONB,
  status TEXT DEFAULT 'stopped',   -- 'running' | 'stopped' | 'draft'
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Submissions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  student_username TEXT NOT NULL,
  student_email TEXT,
  teacher_id UUID REFERENCES teachers(id),
  assignment_text TEXT,
  score TEXT,
  status TEXT DEFAULT 'Processing',
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Announcements ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'General',   -- 'Syllabus' | 'Assignment' | 'Exam' | 'General' | 'Other'
  attachment_url TEXT,               -- optional file URL stored on server
  attachment_name TEXT,              -- original filename shown to students
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATION: run these if you already have existing tables
-- ============================================================
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;
-- ALTER TABLE workflows ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE CASCADE;
-- CREATE TABLE IF NOT EXISTS announcements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, category TEXT DEFAULT 'General', created_at TIMESTAMPTZ DEFAULT NOW());
-- ▼ Run these in the Supabase SQL Editor to fix the missing columns:
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS register_number TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS year INT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS semester INT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS accommodation TEXT DEFAULT 'Day Scholar';

-- ── Attendance Sessions ────────────────────────────────────────
-- One row per day a teacher takes attendance
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, date)
);

-- ── Attendance Records ─────────────────────────────────────────
-- One row per student per session
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

