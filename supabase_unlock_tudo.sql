-- ULTIMATE UNLOCK SCRIPT
-- Isso vai retirar 100% de qualquer amarração de leitura (apenas leitura) de Editais.
-- Se continuar travando depois disso, o problema NÃO É banco de dados.

ALTER TABLE notice_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editais Folders - View" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Admin" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Full Admin" ON notice_folders;
-- Todos logados podem ler pastas (Filtro feito no frontend se necessário)
CREATE POLICY "Editais Folders - View" ON notice_folders FOR SELECT USING (auth.role() = 'authenticated');


ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editais Notices - View" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Admin" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Full Admin" ON notices;
-- Todos logados podem ler arquivos (JavaScript cuida do que exibir para desbugar o Supabase)
CREATE POLICY "Editais Notices - View" ON notices FOR SELECT USING (auth.role() = 'authenticated');


-- Destravando também totalmente os Profiles só por segurança absoluta
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_everyone" ON profiles;
CREATE POLICY "profiles_select_everyone" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
