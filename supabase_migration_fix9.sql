-- ============================================================
-- FIX 9: Solução Definitiva via Metadata Sync (Zero Recursão)
--        Sincroniza o cargo para o User Metadata do Supabase,
--        permitindo checagem via JWT sem consultar a tabela profiles em loop.
-- ============================================================

-- 1. Função para sincronizar cargo (roda como service_role/postgres)
CREATE OR REPLACE FUNCTION sync_user_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza o raw_app_meta_data do auth.users para conter o role
  UPDATE auth.users 
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Gatilho para manter sincronizado
DROP TRIGGER IF EXISTS on_profile_role_update ON profiles;
CREATE TRIGGER on_profile_role_update
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE PROCEDURE sync_user_role_to_metadata();

-- 3. Sincronizar usuários existentes
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN SELECT id, role FROM profiles LOOP
    UPDATE auth.users 
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', r.role)
    WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Funções de checagem Ultra Rápidas (Zero SQL query)
CREATE OR REPLACE FUNCTION is_admin_only()
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'ADMIN' 
         OR auth.jwt() ->> 'email' = 'jotajoao29@gmail.com'
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_professor()
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('ADMIN', 'PROFESSOR')
         OR auth.jwt() ->> 'email' = 'jotajoao29@gmail.com'
$$ LANGUAGE sql STABLE;

-- 5. Recriar Políticas de Profiles (Seguras e sem consultas recursivas)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_select" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_or_prof_select" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
DROP POLICY IF EXISTS "profiles_select_self" ON profiles;

-- Todo usuário pode ler seu próprio perfil
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Alguém com claim de ADMIN ou PROFESSOR pode ler qualquer perfil
CREATE POLICY "profiles_admin_read_all" ON profiles
  FOR SELECT USING (is_admin_or_professor());

-- Todo usuário pode atualizar seu próprio perfil
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Alguém com claim de ADMIN pode atualizar qualquer perfil
CREATE POLICY "profiles_admin_update_all" ON profiles
  FOR UPDATE USING (is_admin_only());

-- Permitir inserção por admins
DROP POLICY IF EXISTS "profiles_admin_insert" ON profiles;
CREATE POLICY "profiles_admin_insert" ON profiles
  FOR INSERT WITH CHECK (is_admin_only());
