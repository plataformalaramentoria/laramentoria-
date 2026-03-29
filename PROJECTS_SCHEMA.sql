-- TABELA DE VERSÕES DO PROJETO
CREATE TABLE IF NOT EXISTS project_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    status TEXT DEFAULT 'ENVIADO' CHECK (status IN ('ENVIADO', 'EM_ANALISE', 'REVISADO', 'APROVADO')),
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE FEEDBACKS (HISTÓRICO)
CREATE TABLE IF NOT EXISTS project_feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID REFERENCES project_versions(id) ON DELETE CASCADE,
    professor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    feedback_text TEXT,
    file_path TEXT, -- Anexo da professora
    file_url TEXT,  -- URL do anexo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE CHECKLIST ESTRUTURAL (COMPARTILHADO)
CREATE TABLE IF NOT EXISTS project_checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POLÍTICAS DE RLS (ROW LEVEL SECURITY)

ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklist_items ENABLE ROW LEVEL SECURITY;

-- Project Versions: Student vê os seus, Professor vê tudo
CREATE POLICY "Student can view own versions" ON project_versions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Student can insert own versions" ON project_versions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Professor can manage all versions" ON project_versions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN'))
);

-- Project Feedbacks: Student vê feedbacks das suas versões, Professor gerencia
CREATE POLICY "Student can view feedbacks for own versions" ON project_feedbacks FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_versions WHERE id = project_feedbacks.version_id AND student_id = auth.uid())
);
CREATE POLICY "Professor can manage all feedbacks" ON project_feedbacks FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN'))
);

-- Project Checklist: Ambos vêem e editam (o checklist é vinculado ao ID do estudante)
CREATE POLICY "Student can manage own checklist" ON project_checklist_items FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Professor can manage student checklist" ON project_checklist_items FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN'))
);

-- STORAGE BUCKET: 'projects'
-- Necessário criar manualmente no painel do Supabase com as seguintes permissões:
-- 1. Authenticated users can upload to their own folder: projects/student_id/*
-- 2. Professors can view and upload to any folder.
