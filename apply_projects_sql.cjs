const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://uekebxsnefufkgjhroli.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla2VieHNuZWZ1Zmtnamhyb2xpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg0OTgwNywiZXhwIjoyMDg4NDI1ODA3fQ.Wz5CRDzoDSWoaZbKfmXvL4y_ZSbsedebSgyyV5MHdiU');

const sql = `
-- 1. Tabela de Versões do Projeto (Research Projects)
CREATE TABLE IF NOT EXISTS project_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size TEXT,
    status TEXT DEFAULT 'ENVIADO',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Feedbacks Estruturados
CREATE TABLE IF NOT EXISTS project_feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES project_versions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    attachment_url TEXT,
    attachment_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Checklist Estrutural Shared
CREATE TABLE IF NOT EXISTS project_checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklist_items ENABLE ROW LEVEL SECURITY;

-- Políticas: Project Versions
DROP POLICY IF EXISTS "Project Versions - Student View" ON project_versions;
DROP POLICY IF EXISTS "Project Versions - Admin All" ON project_versions;
CREATE POLICY "Project Versions - Student View" ON project_versions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Project Versions - Admin All" ON project_versions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR'))
);

-- Políticas: Project Feedbacks
DROP POLICY IF EXISTS "Project Feedbacks - Student View" ON project_feedbacks;
DROP POLICY IF EXISTS "Project Feedbacks - Admin All" ON project_feedbacks;
CREATE POLICY "Project Feedbacks - Student View" ON project_feedbacks FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_versions WHERE id = project_id AND student_id = auth.uid())
);
CREATE POLICY "Project Feedbacks - Admin All" ON project_feedbacks FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR'))
);

-- Políticas: Project Checklist
DROP POLICY IF EXISTS "Project Checklist - Shared Access" ON project_checklist_items;
CREATE POLICY "Project Checklist - Shared Access" ON project_checklist_items FOR ALL USING (
    student_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR'))
);

-- Bucket de Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('projects', 'projects', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Projects Storage - Admin All" ON storage.objects;
DROP POLICY IF EXISTS "Projects Storage - Student Own" ON storage.objects;

CREATE POLICY "Projects Storage - Admin All" ON storage.objects FOR ALL
USING (bucket_id = 'projects' AND (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR'))))
WITH CHECK (bucket_id = 'projects' AND (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR'))));

CREATE POLICY "Projects Storage - Student Own" ON storage.objects FOR ALL
USING (bucket_id = 'projects' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'projects' AND auth.uid()::text = (storage.foldername(name))[1]);

`;

async function apply() {
    console.log("Applying SQL...");
    const { data, error } = await supabase.rpc('run_sql', { sql_query: sql });
    if (error) {
        console.error("Error applying SQL:", error);
    } else {
        console.log("SQL applied successfully!");
    }
}

apply();
