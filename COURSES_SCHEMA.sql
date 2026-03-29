-- COURSES (LMS) SCHEMA

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    "order" INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure course columns exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='status') THEN
        ALTER TABLE courses ADD COLUMN status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='created_by') THEN
        ALTER TABLE courses ADD COLUMN created_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- 2. MODULES
CREATE TABLE IF NOT EXISTS course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. LESSONS
CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    youtube_url TEXT,
    pdf_url TEXT,
    pdf_path TEXT,
    pdf_size TEXT,
    "order" INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure lesson columns exist (PDF and Author support)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_lessons' AND column_name='created_by') THEN
        ALTER TABLE course_lessons ADD COLUMN created_by UUID REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_lessons' AND column_name='pdf_url') THEN
        ALTER TABLE course_lessons ADD COLUMN pdf_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_lessons' AND column_name='pdf_path') THEN
        ALTER TABLE course_lessons ADD COLUMN pdf_path TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_lessons' AND column_name='pdf_size') THEN
        ALTER TABLE course_lessons ADD COLUMN pdf_size TEXT;
    END IF;
END $$;

-- 4. STUDENT ACCESS TRACKING
CREATE TABLE IF NOT EXISTS student_course_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- 5. RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_course_access ENABLE ROW LEVEL SECURITY;

-- Clean start for policies
DROP POLICY IF EXISTS "Courses: Student view access" ON courses;
DROP POLICY IF EXISTS "Courses: Admin manage everything" ON courses;
DROP POLICY IF EXISTS "Modules: Student view access" ON course_modules;
DROP POLICY IF EXISTS "Modules: Admin manage everything" ON course_modules;
DROP POLICY IF EXISTS "Lessons: Student view access" ON course_lessons;
DROP POLICY IF EXISTS "Lessons: Admin manage everything" ON course_lessons;
DROP POLICY IF EXISTS "Access: Admin manage" ON student_course_access;
DROP POLICY IF EXISTS "Access: Student read personal" ON student_course_access;

-- New Policies
CREATE POLICY "Courses: Student view access" ON courses FOR SELECT USING (status = 'PUBLISHED' AND EXISTS (SELECT 1 FROM student_course_access WHERE student_id = auth.uid() AND course_id = courses.id));
CREATE POLICY "Courses: Admin manage everything" ON courses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN')));
CREATE POLICY "Modules: Student view access" ON course_modules FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE id = course_id AND status = 'PUBLISHED' AND EXISTS (SELECT 1 FROM student_course_access WHERE student_id = auth.uid() AND course_id = courses.id)));
CREATE POLICY "Modules: Admin manage everything" ON course_modules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN')));
CREATE POLICY "Lessons: Student view access" ON course_lessons FOR SELECT USING (EXISTS (SELECT 1 FROM course_modules m JOIN courses c ON c.id = m.course_id WHERE m.id = module_id AND c.status = 'PUBLISHED' AND EXISTS (SELECT 1 FROM student_course_access WHERE student_id = auth.uid() AND course_id = c.id)));
CREATE POLICY "Lessons: Admin manage everything" ON course_lessons FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN')));
CREATE POLICY "Access: Admin manage" ON student_course_access FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN')));
CREATE POLICY "Access: Student read personal" ON student_course_access FOR SELECT USING (student_id = auth.uid());
