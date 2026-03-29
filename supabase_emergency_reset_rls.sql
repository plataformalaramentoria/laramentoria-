-- ============================================================
-- SCRIPT DE RESET DE EMERGÊNCIA - MÓDULO EDITAIS
-- Corrige o travamento infinito ("Hanging") do perfil Aluno
-- ============================================================

-- 1. Limpeza total de politicas de Editais (Folders e Notices)
DROP POLICY IF EXISTS "Editais Folders - View" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Insert Admin" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Update Admin" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Delete Admin" ON notice_folders;

DROP POLICY IF EXISTS "Editais Notices - View" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Insert Admin" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Update Admin" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Delete Admin" ON notices;

-- 2. Limpeza de funções customizadas que podem causar loops
DROP FUNCTION IF EXISTS notices_view_access(text, jsonb);
DROP FUNCTION IF EXISTS can_view_notice(text, jsonb);
DROP FUNCTION IF EXISTS is_admin();

-- 3. Politicas de Folders (Apenas leitura para Estudantes, Total para Admin)
ALTER TABLE notice_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editais Folders - View" ON notice_folders FOR SELECT USING (true);
CREATE POLICY "Editais Folders - Full Admin" ON notice_folders FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 4. Politicas de Notices (Apenas leitura para Estudantes, Total para Admin)
-- NOTA: Simplificamos a leitura para Alunos para evitar o deadlock
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editais Notices - View" ON notices FOR SELECT 
USING (
  visibility_type = 'ALL' 
  OR (visible_students::text LIKE '%' || auth.uid()::text || '%')
  OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR')))
);

CREATE POLICY "Editais Notices - Full Admin" ON notices FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 5. Segurança do Storage Bucket (Notices)
-- Garante que todos autenticados baixam, mas só admin sobe/exclui
DROP POLICY IF EXISTS "Notices Objects - Admin All" ON storage.objects;
DROP POLICY IF EXISTS "Notices Objects - Read All" ON storage.objects;

CREATE POLICY "Notices Objects - Admin All" ON storage.objects FOR ALL
USING (bucket_id = 'notices' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (bucket_id = 'notices' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Notices Objects - Read All" ON storage.objects FOR SELECT
USING (bucket_id = 'notices' AND auth.role() = 'authenticated');
