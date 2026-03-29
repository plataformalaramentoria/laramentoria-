-- ============================================================
-- FIX 8: Quebra de Recursão Infinita em RLS de Profiles
--        Garante que a verificação de admin não chame a si mesma.
-- ============================================================

-- 1. Atualizar as funções para serem mais resilientes
-- (Mantendo SECURITY DEFINER e search_path para segurança)

CREATE OR REPLACE FUNCTION is_admin_only()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check prioritário via JWT (Super Admin)
  IF COALESCE(auth.jwt() ->> 'email' = 'jotajoao29@gmail.com', false) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN' 
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_admin_or_professor()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'email' = 'jotajoao29@gmail.com', false) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'PROFESSOR') 
    AND is_active = true
  );
END;
$$;

-- 2. Recriar Políticas de Profiles com quebra de recursão
-- O segredo é garantir que a política recursiva não seja testada para o próprio usuário no sub-check.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_or_prof_select" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;

-- A. Sempre pode ler a si mesmo (Base da recursão)
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT USING (id = auth.uid());

-- B. Admins/Profs podem ler OUTROS perfis (Quebra a recursão com id != auth.uid())
CREATE POLICY "profiles_admin_or_prof_select" ON profiles
  FOR SELECT USING (id != auth.uid() AND is_admin_or_professor());

-- C. Sempre pode atualizar a si mesmo
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- D. Admin pode atualizar OUTROS perfis
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (id != auth.uid() AND is_admin_only());

-- E. Permitir INSERT por Admins (para criação de usuários)
DROP POLICY IF EXISTS "profiles_admin_insert" ON profiles;
CREATE POLICY "profiles_admin_insert" ON profiles
  FOR INSERT WITH CHECK (is_admin_only());

-- 3. Reforçar RLS nas tabelas do dashboard (usando as funções corrigidas)
-- Isso garante que as operações que falharam nos screenshots funcionem.

DROP POLICY IF EXISTS "dt_admin_all" ON dashboard_tasks;
CREATE POLICY "dt_admin_all" ON dashboard_tasks FOR ALL USING (is_admin_or_professor());

DROP POLICY IF EXISTS "dg_admin_all" ON dashboard_goals;
CREATE POLICY "dg_admin_all" ON dashboard_goals FOR ALL USING (is_admin_or_professor());

DROP POLICY IF EXISTS "ae_admin_all" ON agenda_events;
CREATE POLICY "ae_admin_all" ON agenda_events FOR ALL USING (is_admin_or_professor());

DROP POLICY IF EXISTS "adv_msg_admin_all" ON advisor_messages;
CREATE POLICY "adv_msg_admin_all" ON advisor_messages FOR ALL USING (is_admin_or_professor());
