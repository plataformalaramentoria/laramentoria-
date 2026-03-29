-- LANGUAGE EXAM (SIMULADOS ACADÊMICOS) SCHEMA

-- 1. ENUMS (Wait, Supabase might already have some, so we use TEXT with CHECK constraints for robustness)

-- 2. EXAMS TABLE
CREATE TABLE IF NOT EXISTS language_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL CHECK (language IN ('ENGLISH', 'SPANISH')),
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'INACTIVE')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. QUESTIONS TABLE (Central Bank)
CREATE TABLE IF NOT EXISTS language_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    language TEXT NOT NULL CHECK (language IN ('ENGLISH', 'SPANISH')),
    type TEXT DEFAULT 'MULTIPLE_CHOICE' CHECK (type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER')),
    text TEXT NOT NULL,
    options JSONB, -- Array of strings for MCQ/TF
    correct_answer TEXT, -- Index for MCQ/TF or expected text
    explanation TEXT, -- Pedagogical comment / Resolution
    difficulty TEXT DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    category TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. JOIN TABLE (Exam to Questions with Ordering)
CREATE TABLE IF NOT EXISTS language_exam_questions (
    exam_id UUID REFERENCES language_exams(id) ON DELETE CASCADE,
    question_id UUID REFERENCES language_questions(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    PRIMARY KEY (exam_id, question_id)
);

-- 5. STUDENT ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS language_exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES language_exams(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    total_questions INTEGER NOT NULL,
    status TEXT DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'REVIEW_PENDING')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE
);

-- 6. INDIVIDUAL ANSWERS TABLE
CREATE TABLE IF NOT EXISTS language_exam_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES language_exam_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES language_questions(id) ON DELETE CASCADE,
    answer_text TEXT, -- Index or written text
    is_correct BOOLEAN, -- Null for SHORT_ANSWER until reviewed
    feedback TEXT, -- Individual feedback for the answer if needed
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ROW LEVEL SECURITY (RLS)

ALTER TABLE language_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_exam_answers ENABLE ROW LEVEL SECURITY;

-- Exams: Alunos vêem apenas PUBLICADOS. Professores vêem tudo.
CREATE POLICY "Exams: Students can view published" ON language_exams 
FOR SELECT USING (
    status = 'PUBLISHED' OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN'))
);

CREATE POLICY "Exams: Professors can manage" ON language_exams 
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN'))
);

-- Questions: Professores gerenciam. Alunos vêem as vinculadas aos exames que podem ver.
CREATE POLICY "Questions: Professors manage all" ON language_questions 
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN'))
);

CREATE POLICY "Questions: Students can view linked" ON language_questions 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM language_exam_questions leq
        JOIN language_exams le ON le.id = leq.exam_id
        WHERE leq.question_id = language_questions.id 
        AND (le.status = 'PUBLISHED')
    )
);

-- Attempts: Alunos gerenciam os seus. Professores vêem todos.
CREATE POLICY "Attempts: Students manage own" ON language_exam_attempts 
FOR ALL USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Attempts: Professors view all" ON language_exam_attempts 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN'))
);

-- Answers: Alunos gerenciam as suas. Professores vêem e revisam.
CREATE POLICY "Answers: Students manage own" ON language_exam_answers 
FOR ALL USING (
    EXISTS (SELECT 1 FROM language_exam_attempts WHERE id = language_exam_answers.attempt_id AND student_id = auth.uid())
);

CREATE POLICY "Answers: Professors view/review" ON language_exam_answers 
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN'))
);
