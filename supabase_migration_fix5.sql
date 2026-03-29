-- ============================================================
-- FIX 5: RLS para tabelas de perfil do aluno
--        academic_background, research_interests, selection_processes
--        Execute no SQL Editor do Supabase
-- ============================================================

-- Garante que as tabelas existam (caso não existam ainda)
CREATE TABLE IF NOT EXISTS academic_background (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course TEXT DEFAULT '',
  institution TEXT DEFAULT '',
  year TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS selection_processes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir coluna current_goal em profiles (caso não exista)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_goal TEXT DEFAULT '';

-- ── RLS: academic_background ──────────────────────────────
ALTER TABLE academic_background ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ab_own_all" ON academic_background;
DROP POLICY IF EXISTS "ab_admin_read" ON academic_background;
CREATE POLICY "ab_own_all" ON academic_background FOR ALL USING (student_id = auth.uid());
CREATE POLICY "ab_admin_read" ON academic_background FOR ALL USING (is_admin_or_professor());

-- ── RLS: research_interests ───────────────────────────────
ALTER TABLE research_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ri_own_all" ON research_interests;
DROP POLICY IF EXISTS "ri_admin_read" ON research_interests;
CREATE POLICY "ri_own_all" ON research_interests FOR ALL USING (student_id = auth.uid());
CREATE POLICY "ri_admin_read" ON research_interests FOR ALL USING (is_admin_or_professor());

-- ── RLS: selection_processes ──────────────────────────────
ALTER TABLE selection_processes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_own_all" ON selection_processes;
DROP POLICY IF EXISTS "sp_admin_read" ON selection_processes;
CREATE POLICY "sp_own_all" ON selection_processes FOR ALL USING (student_id = auth.uid());
CREATE POLICY "sp_admin_read" ON selection_processes FOR ALL USING (is_admin_or_professor());

-- ── Garantir que o aluno pode atualizar seu próprio profiles row ──
-- (já deve existir de fix.sql, mas garante aqui caso tenha sido perdido)
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ── VERIFICAÇÃO ───────────────────────────────────────────
SELECT
  tablename,
  COUNT(policyname) as num_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('academic_background', 'research_interests', 'selection_processes', 'profiles')
GROUP BY tablename
ORDER BY tablename;
