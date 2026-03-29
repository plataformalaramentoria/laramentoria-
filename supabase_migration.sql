-- ============================================================
-- MIGRAÇÃO: Reestruturação de Autenticação e Autorização
-- Executar no SQL Editor do Supabase (Dashboard > SQL Editor)
-- ============================================================

-- 1. COLUNAS NOVAS NA TABELA PROFILES
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'FULL' CHECK (access_type IN ('FULL', 'RESTRICTED')),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Garantir que usuários existentes têm access_type definido
UPDATE profiles SET access_type = 'FULL' WHERE access_type IS NULL;

-- 2. GARANTIR TABELA student_course_access
CREATE TABLE IF NOT EXISTS student_course_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- 3. FUNÇÃO: Admin/Professor podem ler todos os perfis
-- Chamada via supabase.rpc('get_profiles_for_panel')
CREATE OR REPLACE FUNCTION get_profiles_for_panel()
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
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'PROFESSOR')
      AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only ADMIN or PROFESSOR can list profiles';
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
  ORDER BY p.full_name;
END;
$$;

-- 4. FUNÇÃO: Atualizar perfil de usuário (ADMIN only)
-- Chamada via supabase.rpc('admin_update_user', {...})
CREATE OR REPLACE FUNCTION admin_update_user(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_access_type TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que o chamador é ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only ADMIN can update users';
  END IF;

  UPDATE profiles SET
    full_name = COALESCE(p_full_name, full_name),
    role = COALESCE(p_role, role),
    access_type = COALESCE(p_access_type, access_type),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- 5. FUNÇÃO: Gerenciar acesso de aluno a cursos (ADMIN only)
-- Chamada via supabase.rpc('admin_set_student_course_access', {...})
CREATE OR REPLACE FUNCTION admin_set_student_course_access(
  p_student_id UUID,
  p_course_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only ADMIN can manage course access';
  END IF;

  -- Remove todos os acessos atuais
  DELETE FROM student_course_access WHERE student_id = p_student_id;

  -- Insere os novos acessos
  INSERT INTO student_course_access (student_id, course_id)
  SELECT p_student_id, unnest(p_course_ids)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 6. FUNÇÃO: Verificar acesso de estudante a curso (usada pelo RLS)
CREATE OR REPLACE FUNCTION check_course_access(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_access_type TEXT;
  v_is_active BOOLEAN;
BEGIN
  SELECT role, access_type, is_active
  INTO v_role, v_access_type, v_is_active
  FROM profiles WHERE id = auth.uid();

  -- Usuário não encontrado ou inativo: sem acesso
  IF v_is_active IS NULL OR v_is_active = FALSE THEN RETURN FALSE; END IF;

  -- Admin e Professor têm acesso total a todos os cursos
  IF v_role IN ('ADMIN', 'PROFESSOR') THEN RETURN TRUE; END IF;

  -- Aluno com acesso FULL: acessa todos os cursos
  IF v_role = 'STUDENT' AND v_access_type = 'FULL' THEN RETURN TRUE; END IF;

  -- Aluno RESTRICTED: verifica student_course_access
  RETURN EXISTS (
    SELECT 1 FROM student_course_access
    WHERE student_id = auth.uid() AND course_id = p_course_id
  );
END;
$$;

-- 7. RLS PARA TABELA courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select_by_access" ON courses;
CREATE POLICY "courses_select_by_access" ON courses
  FOR SELECT USING (check_course_access(id));

DROP POLICY IF EXISTS "courses_admin_write" ON courses;
CREATE POLICY "courses_admin_write" ON courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true
    )
  );

-- 8. RLS PARA course_modules
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_modules_select" ON course_modules;
CREATE POLICY "course_modules_select" ON course_modules
  FOR SELECT USING (
    check_course_access(course_id)
  );

DROP POLICY IF EXISTS "course_modules_admin_write" ON course_modules;
CREATE POLICY "course_modules_admin_write" ON course_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true)
  );

-- 9. RLS PARA course_lessons
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_lessons_select" ON course_lessons;
CREATE POLICY "course_lessons_select" ON course_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules cm
      WHERE cm.id = course_lessons.module_id
        AND check_course_access(cm.course_id)
    )
  );

DROP POLICY IF EXISTS "course_lessons_admin_write" ON course_lessons;
CREATE POLICY "course_lessons_admin_write" ON course_lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true)
  );

-- 10. RLS PARA course_materials
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_materials_select" ON course_materials;
CREATE POLICY "course_materials_select" ON course_materials
  FOR SELECT USING (
    check_course_access(course_id)
  );

DROP POLICY IF EXISTS "course_materials_admin_write" ON course_materials;
CREATE POLICY "course_materials_admin_write" ON course_materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true)
  );

-- 11. RLS PARA student_course_access
ALTER TABLE student_course_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sca_admin_all" ON student_course_access;
CREATE POLICY "sca_admin_all" ON student_course_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true)
  );

DROP POLICY IF EXISTS "sca_student_read_own" ON student_course_access;
CREATE POLICY "sca_student_read_own" ON student_course_access
  FOR SELECT USING (student_id = auth.uid());

-- 12. RLS PARA profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê seu próprio perfil
DROP POLICY IF EXISTS "profiles_select_self" ON profiles;
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin pode ler todos os perfis diretamente
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
CREATE POLICY "profiles_admin_select_all" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true)
  );

-- Admin pode atualizar qualquer perfil
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true)
  );

-- Admin pode inserir novos perfis (quando trigger não cria)
DROP POLICY IF EXISTS "profiles_admin_insert" ON profiles;
CREATE POLICY "profiles_admin_insert" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true)
  );

-- Cada usuário pode atualizar seu próprio perfil (troca de senha, nome etc.)
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- IMPORTANTE: Também garantir que o trigger de criação de perfil funcione
-- O trigger usa service_role internamente, então não precisa de policy para INSERT via trigger

-- 13. GRANT nas funções para o anon/authenticated
GRANT EXECUTE ON FUNCTION get_profiles_for_panel() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user(UUID, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_student_course_access(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION check_course_access(UUID) TO authenticated;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
-- Após executar, verificar:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY column_name;
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace ORDER BY proname;
