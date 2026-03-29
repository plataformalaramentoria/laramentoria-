-- ============================================================
-- SCRIPT DE CORREÇÃO FINAL: DEADLOCK DE RECURSÃO (Editais + Profiles)
-- Remove o loop de decisão que causava o carregamento infinito
-- ============================================================

-- 1. Destravar a Tabela de Perfis para leitura (evita loops)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Limpar as politicas antigas da profiles que causavam a trava
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_everyone" ON profiles;

-- Removemos a dependência circular da tabela de perfis
-- Permitimos leitura genérica apenas para não travar verificações
CREATE POLICY "profiles_select_everyone" ON profiles FOR SELECT USING (true);


-- 2. Aplicar politicas de Editais usando a função original
ALTER TABLE notice_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editais Folders - View" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Full Admin" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Admin" ON notice_folders;

CREATE POLICY "Editais Folders - View" ON notice_folders FOR SELECT USING (true);
CREATE POLICY "Editais Folders - Admin" ON notice_folders FOR ALL USING (is_admin_or_professor());


ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editais Notices - View" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Full Admin" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Admin" ON notices;

CREATE POLICY "Editais Notices - View" ON notices FOR SELECT 
USING (
  visibility_type = 'ALL' 
  OR (visible_students::text LIKE '%' || auth.uid()::text || '%')
  OR is_admin_or_professor()
);
CREATE POLICY "Editais Notices - Admin" ON notices FOR ALL USING (is_admin_or_professor());


-- 3. Storage
DROP POLICY IF EXISTS "Notices Objects - Admin All" ON storage.objects;
DROP POLICY IF EXISTS "Notices Objects - Read All" ON storage.objects;
DROP POLICY IF EXISTS "Notices Objects - Admin" ON storage.objects;
DROP POLICY IF EXISTS "Notices Objects - Read" ON storage.objects;

CREATE POLICY "Notices Objects - Admin" ON storage.objects FOR ALL
USING (bucket_id = 'notices' AND (SELECT is_admin_or_professor()))
WITH CHECK (bucket_id = 'notices' AND (SELECT is_admin_or_professor()));

CREATE POLICY "Notices Objects - Read" ON storage.objects FOR SELECT
USING (bucket_id = 'notices' AND auth.role() = 'authenticated');
