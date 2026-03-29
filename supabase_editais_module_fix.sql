-- ============================================================
-- SCRIPT DE CORREÇÃO DO MÓDULO "EDITAIS" / BIBLIOTECA
-- Garante tabelas estruturais, vinculação e política rigorosa Admin-Only
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. Tabelas (criação estrutural) ──
CREATE TABLE IF NOT EXISTS notice_folders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Garantir ON DELETE RESTRICT (impede apagar pasta se houver arquivos)
CREATE TABLE IF NOT EXISTS notices (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  folder_id uuid REFERENCES notice_folders(id) ON DELETE RESTRICT NOT NULL,
  title text NOT NULL,
  description text,
  visibility_type text DEFAULT 'ALL' NOT NULL,
  visible_students jsonb DEFAULT '[]'::jsonb,
  file_url text NOT NULL,
  file_path text NOT NULL,
  file_size text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ── 2. Função Auxiliar de VERIFICAR APENAS ADMIN ──
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- ── 3. Ajuste RLS de notice_folders ──
ALTER TABLE notice_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editais Folders - View" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Insert Admin" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Update Admin" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Delete Admin" ON notice_folders;

-- Todos logados podem Ver
CREATE POLICY "Editais Folders - View" ON notice_folders FOR SELECT USING (true);
-- Mas só Admins criam, alteram ou apagam
CREATE POLICY "Editais Folders - Insert Admin" ON notice_folders FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Editais Folders - Update Admin" ON notice_folders FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Editais Folders - Delete Admin" ON notice_folders FOR DELETE USING (is_admin());

-- ── 4. Ajuste RLS de notices ──
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editais Notices - View" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Insert Admin" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Update Admin" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Delete Admin" ON notices;

-- Alunos vêem o que é público. A condição CASE garante que o banco pare a checagem imediatamente e não trave.
CREATE POLICY "Editais Notices - View" ON notices FOR SELECT 
USING (
   CASE 
     WHEN visibility_type = 'ALL' THEN true 
     WHEN (visible_students::text LIKE '%' || auth.uid()::text || '%') THEN true 
     ELSE (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR')))
   END
);
-- Só Admins criam, alteram ou apagam arquivos
CREATE POLICY "Editais Notices - Insert Admin" ON notices FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Editais Notices - Update Admin" ON notices FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Editais Notices - Delete Admin" ON notices FOR DELETE USING (is_admin());

-- ── 5. Ajuste Storage Bucket notices ──
-- Garantir que o bucket exista
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notices', 'notices', true)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets SET public = true WHERE id = 'notices'; 

-- Limpar policies antigas no storage
DROP POLICY IF EXISTS "Notices Objects - Admin All" ON storage.objects;
DROP POLICY IF EXISTS "Notices Objects - Read All" ON storage.objects;

-- Admins gerenciam o bucket
CREATE POLICY "Notices Objects - Admin All" ON storage.objects FOR ALL
USING (bucket_id = 'notices' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (bucket_id = 'notices' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Todos os autênticados podem ler/baixar os PDFs
CREATE POLICY "Notices Objects - Read All" ON storage.objects FOR SELECT
USING (bucket_id = 'notices' AND auth.role() = 'authenticated');
