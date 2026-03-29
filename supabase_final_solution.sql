-- ============================================================
-- SQL DEFINITIVO: FILTRAGEM DE LEITURA VIA FRONTEND
-- Mantém TODA a segurança de Escrita/Edição para os Administradores.
-- Libera apenas a Leitura, pois o código Javascript fará o filtro refinado do que exibir no painel do Aluno.
-- ============================================================

-- 1. PASTAS (FOLDERS)
ALTER TABLE notice_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editais Folders - View" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Admin" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Full Admin" ON notice_folders;

-- Qualquer aluno pode apenas LER a lista de pastas
CREATE POLICY "Editais Folders - View" ON notice_folders FOR SELECT USING (auth.role() = 'authenticated');
-- Apenas ADMIN e PROFESSOR podem INSERIR, EDITAR ou APAGAR
CREATE POLICY "Editais Folders - Admin" ON notice_folders FOR ALL USING (is_admin_or_professor());


-- 2. ARQUIVOS (NOTICES)
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editais Notices - View" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Admin" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Full Admin" ON notices;

-- Qualquer aluno pode apenas LER a lista de documentos 
CREATE POLICY "Editais Notices - View" ON notices FOR SELECT USING (auth.role() = 'authenticated');
-- Apenas ADMIN e PROFESSOR podem INSERIR, EDITAR ou APAGAR
CREATE POLICY "Editais Notices - Admin" ON notices FOR ALL USING (is_admin_or_professor());


-- 3. PERFIS (PROFILES) - Retirando loops antigos apenas para leitura simples
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_everyone" ON profiles;
CREATE POLICY "profiles_select_everyone" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
