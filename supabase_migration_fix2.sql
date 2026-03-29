-- ============================================================
-- FIX 2: Garantir que a conta master tem role ADMIN no banco
--        + Funções auxiliares com fallback para email master
-- Execute no SQL Editor do Supabase
-- ============================================================

-- PASSO 1: Atualizar o perfil do email master para ADMIN no banco
-- (Necessário para que as RLS policies reconheçam o admin)
UPDATE profiles
SET
  role = 'ADMIN',
  is_active = true,
  access_type = 'FULL'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'jotajoao29@gmail.com'
);

-- Se o UPDATE acima retornar 0 rows (perfil não existe), usar INSERT:
INSERT INTO profiles (id, full_name, email, role, access_type, is_active, force_password_change)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Administrador'),
  u.email,
  'ADMIN',
  'FULL',
  true,
  false
FROM auth.users u
WHERE u.email = 'jotajoao29@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = u.id);

-- PASSO 2: Atualizar funções auxiliares com fallback para emails master
-- (Garante que mesmo que o perfil tenha outro role, o master email sempre é ADMIN)

CREATE OR REPLACE FUNCTION is_admin_only()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Verificar email master primeiro (fallback de segurança)
    (SELECT email = 'jotajoao29@gmail.com' FROM auth.users WHERE id = auth.uid() LIMIT 1)
    OR
    -- Verificar role no banco
    (SELECT (role = 'ADMIN' AND is_active = true)
     FROM profiles WHERE id = auth.uid()
     LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION is_admin_or_professor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Verificar email master primeiro (fallback de segurança)
    (SELECT email = 'jotajoao29@gmail.com' FROM auth.users WHERE id = auth.uid() LIMIT 1)
    OR
    -- Verificar role no banco
    (SELECT (role IN ('ADMIN', 'PROFESSOR') AND is_active = true)
     FROM profiles WHERE id = auth.uid()
     LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin_only() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_professor() TO authenticated;

-- PASSO 3: Verificar se o perfil master foi criado/atualizado corretamente
SELECT id, full_name, email, role, is_active
FROM profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'jotajoao29@gmail.com');
