-- ============================================================
-- SCRIPT ANTI-DEADLOCK TOTAL: SEPARAÇÃO DE ROTAS (SELECT vs MUTAÇÕES)
-- O Postgres estava "dando um nó" internamente (Deadlock infinito) ao tentar 
-- testar a função de Administrador repetidas vezes durante as leituras (SELECT),
-- mesmo você sendo aluno. Essa solução isola matematicamente o problema!
-- ============================================================

-- 1. PASTAS (FOLDERS)
-- Apagamos as políticas antigas
DROP POLICY IF EXISTS "Editais Folders - View" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Admin" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Select" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Insert" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Update" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Delete" ON notice_folders;

-- Leitura: 100% blindada de funções, não entra em Deadlock nunca.
CREATE POLICY "Editais Folders - Select" ON notice_folders FOR SELECT USING (auth.role() = 'authenticated');

-- Gravação/Alteração: As funções de verificação só rodam quando o usuário TENTA SALVAR/APAGAR.
CREATE POLICY "Editais Folders - Insert" ON notice_folders FOR INSERT WITH CHECK (is_admin_or_professor());
CREATE POLICY "Editais Folders - Update" ON notice_folders FOR UPDATE USING (is_admin_or_professor());
CREATE POLICY "Editais Folders - Delete" ON notice_folders FOR DELETE USING (is_admin_or_professor());


-- 2. ARQUIVOS (NOTICES)
-- Apagamos as políticas antigas
DROP POLICY IF EXISTS "Editais Notices - View" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Admin" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Select" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Insert" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Update" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Delete" ON notices;

-- Leitura: 100% blindada de funções.
CREATE POLICY "Editais Notices - Select" ON notices FOR SELECT USING (auth.role() = 'authenticated');

-- Gravação/Alteração
CREATE POLICY "Editais Notices - Insert" ON notices FOR INSERT WITH CHECK (is_admin_or_professor());
CREATE POLICY "Editais Notices - Update" ON notices FOR UPDATE USING (is_admin_or_professor());
CREATE POLICY "Editais Notices - Delete" ON notices FOR DELETE USING (is_admin_or_professor());


-- 3. PERFIS (PROFILES)
-- Garante que pelo menos um fluxo de leitura limpo exista para o Profiles
DROP POLICY IF EXISTS "profiles_select_everyone" ON profiles;
DROP POLICY IF EXISTS "profiles_select_safe" ON profiles;
CREATE POLICY "profiles_select_safe" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
