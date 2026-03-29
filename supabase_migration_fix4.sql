-- ============================================================
-- FIX 4: Função dedicada para admin ler perfil de um aluno
--        Execute no SQL Editor do Supabase
-- ============================================================

-- Esta função é a solução definitiva para o "Aluna não encontrada"
-- Ela roda como postgres (SECURITY DEFINER), ignora RLS completamente
-- e verifica internamente se o chamador é admin/professor.

CREATE OR REPLACE FUNCTION get_student_profile_for_admin(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  access_type TEXT,
  is_active BOOLEAN,
  force_password_change BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que o chamador é ADMIN ou PROFESSOR
  -- (também aceita o email master como fallback)
  IF NOT (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'jotajoao29@gmail.com')
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR') AND is_active = true)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only ADMIN or PROFESSOR can view student profiles';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.access_type,
    p.is_active,
    p.force_password_change,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = p_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_student_profile_for_admin(UUID) TO authenticated;

-- ── DIAGNÓSTICO: verificar todas as policies existentes em profiles ──
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
