-- ============================================================
-- FIX 6: Simplificação radical de RLS para Profiles
--        Remove recursão/complexidade que gera erro 500 no PostgREST
-- ============================================================

-- 1. Simplificar a função de Admin para evitar SELECTs desnecessários
CREATE OR REPLACE FUNCTION is_admin_only()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    -- Claim de email do JWT (altamente performático e sem recursão)
    COALESCE(auth.jwt() ->> 'email' = 'jotajoao29@gmail.com', false)
    OR
    -- Check direto no profiles (Security Definer ignora RLS)
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN' 
      AND is_active = true
    )
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
  RETURN (
    COALESCE(auth.jwt() ->> 'email' = 'jotajoao29@gmail.com', false)
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'PROFESSOR') 
      AND is_active = true
    )
  );
END;
$$;

-- 2. Limpar e recriar políticas da tabela profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_self" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_or_prof_select" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;

-- O próprio usuário pode ler seu perfil
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admins e Professores podem ler todos os perfis
CREATE POLICY "profiles_admin_or_prof_select" ON profiles
  FOR SELECT USING (is_admin_or_professor());

-- O próprio usuário pode atualizar seu perfil
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin pode atualizar qualquer perfil
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (is_admin_only());

-- 3. Notificações e Mensagens (Garantir que não tragam 500)
ALTER TABLE advisor_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "adv_msg_student_all" ON advisor_messages;
CREATE POLICY "adv_msg_student_all" ON advisor_messages
  FOR ALL USING (student_id = auth.uid());

-- 4. Verificação
SELECT tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
