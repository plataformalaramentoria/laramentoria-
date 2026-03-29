-- ============================================================
-- FIX 10: Reset Nuclear de RLS para Profiles
--         Remove TODAS as políticas existentes e recria do zero.
-- ============================================================

DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  -- 1. Loop para deletar TODAS as políticas da tabela profiles
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- 2. Garantir que o RLS está ativado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Recriar as funções simplificadas (sem SELECT de tabelas)
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

-- 4. Recriar Políticas Limpas e Simples
-- A. Leitura do próprio perfil (Crucial para o Login e Dashboard)
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- B. Leitura de qualquer perfil por Admin/Professor (Zero Recursão)
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (is_admin_or_professor());

-- C. Atualização do próprio perfil
CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- D. Atualização por Admin
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (is_admin_only());

-- E. Inserção por Admin
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (is_admin_only());

-- 5. Sincronizar novamente os cargos para o User Metadata (Garantir)
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
