-- ============================================================
-- FIX: Corrigir recursão nas RLS policies da tabela profiles
-- Execute ESTE script APÓS o script de migração principal
-- ============================================================

-- PROBLEMA: policies como "EXISTS (SELECT 1 FROM profiles WHERE ...)"
-- consultam a mesma tabela que está sendo protegida → loop infinito.
-- SOLUÇÃO: funções SECURITY DEFINER que executam como postgres (BYPASSRLS).

-- ── PASSO 1: Funções auxiliares de verificação de role ──────
-- Estas funções rodam como o dono (postgres), que ignora RLS.
-- Isso quebra o ciclo recursivo.

CREATE OR REPLACE FUNCTION is_admin_only()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
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
    (SELECT (role IN ('ADMIN', 'PROFESSOR') AND is_active = true)
     FROM profiles WHERE id = auth.uid()
     LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin_only() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_professor() TO authenticated;

-- ── PASSO 2: Remover policies recursivas da tabela profiles ──

DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_select_self" ON profiles;

-- ── PASSO 3: Recriar policies usando funções auxiliares (sem recursão) ──

-- Cada usuário vê seu próprio perfil
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin e Professor veem todos os perfis (via função SECURITY DEFINER)
CREATE POLICY "profiles_admin_or_prof_select" ON profiles
  FOR SELECT USING (is_admin_or_professor());

-- Admin pode atualizar qualquer perfil
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (is_admin_only());

-- Admin pode inserir novos perfis
CREATE POLICY "profiles_admin_insert" ON profiles
  FOR INSERT WITH CHECK (is_admin_only());

-- Cada usuário pode atualizar seu próprio perfil
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ── PASSO 4: Corrigir policies de cursos (mesma recursão) ──

DROP POLICY IF EXISTS "courses_select_by_access" ON courses;
DROP POLICY IF EXISTS "courses_admin_write" ON courses;
DROP POLICY IF EXISTS "course_modules_select" ON course_modules;
DROP POLICY IF EXISTS "course_modules_admin_write" ON course_modules;
DROP POLICY IF EXISTS "course_lessons_select" ON course_lessons;
DROP POLICY IF EXISTS "course_lessons_admin_write" ON course_lessons;
DROP POLICY IF EXISTS "course_materials_select" ON course_materials;
DROP POLICY IF EXISTS "course_materials_admin_write" ON course_materials;
DROP POLICY IF EXISTS "sca_admin_all" ON student_course_access;

-- Cursos: acesso via função SECURITY DEFINER
CREATE POLICY "courses_select_by_access" ON courses
  FOR SELECT USING (check_course_access(id));

CREATE POLICY "courses_admin_write" ON courses
  FOR ALL USING (is_admin_only());

-- Módulos
CREATE POLICY "course_modules_select" ON course_modules
  FOR SELECT USING (check_course_access(course_id));

CREATE POLICY "course_modules_admin_write" ON course_modules
  FOR ALL USING (is_admin_only());

-- Aulas
CREATE POLICY "course_lessons_select" ON course_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules cm
      WHERE cm.id = course_lessons.module_id
        AND check_course_access(cm.course_id)
    )
  );

CREATE POLICY "course_lessons_admin_write" ON course_lessons
  FOR ALL USING (is_admin_only());

-- Materiais
CREATE POLICY "course_materials_select" ON course_materials
  FOR SELECT USING (check_course_access(course_id));

CREATE POLICY "course_materials_admin_write" ON course_materials
  FOR ALL USING (is_admin_only());

-- student_course_access
CREATE POLICY "sca_admin_all" ON student_course_access
  FOR ALL USING (is_admin_only());

-- ── PASSO 5: Corrigir a função check_course_access ──
-- Reescrita para usar a mesma lógica sem recursão

CREATE OR REPLACE FUNCTION check_course_access(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE
      -- Usuário não encontrado ou inativo
      WHEN (SELECT is_active FROM profiles WHERE id = auth.uid() LIMIT 1) IS NOT TRUE
        THEN false
      -- Admin e Professor têm acesso total
      WHEN (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('ADMIN', 'PROFESSOR')
        THEN true
      -- Aluno FULL: acesso total
      WHEN (SELECT role = 'STUDENT' AND access_type = 'FULL' FROM profiles WHERE id = auth.uid() LIMIT 1)
        THEN true
      -- Aluno RESTRICTED: verificar student_course_access
      ELSE EXISTS (
        SELECT 1 FROM student_course_access
        WHERE student_id = auth.uid() AND course_id = p_course_id
      )
    END,
    false
  );
$$;

GRANT EXECUTE ON FUNCTION check_course_access(UUID) TO authenticated;

-- ── VERIFICAÇÃO ──
-- SELECT proname, prosecdef FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
-- AND proname IN ('is_admin_only', 'is_admin_or_professor', 'check_course_access', 'get_profiles_for_panel');
