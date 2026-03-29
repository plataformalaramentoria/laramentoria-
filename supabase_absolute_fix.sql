-- ============================================================
-- SCRIPT DE BLINDAGEM ABSOLUTA (BYPASS DE PARSER)
-- Resolve o problema de "Sem Editais" usando curto-circuito real
-- ============================================================

-- 1. Cria a função de segurança isolada (NÃO apaga a anterior)
CREATE OR REPLACE FUNCTION notices_view_access(v_type text, v_students jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Se for público, retorna Verdadeiro imediatamente e interrompe qualquer leitura de banco!
  IF v_type = 'ALL' THEN
    RETURN true;
  END IF;

  -- Se o estudante estiver na lista específica
  IF v_students IS NOT NULL AND v_students::text LIKE '%' || auth.uid()::text || '%' THEN
    RETURN true;
  END IF;

  -- Por último, checa se é Admin (Seguro porque só chega aqui se não for público)
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR'));
END;
$$;

-- 2. Recria a Política Notice usando a nossa função blindada
DROP POLICY IF EXISTS "Editais Notices - View" ON notices;
CREATE POLICY "Editais Notices - View" ON notices FOR SELECT 
USING (notices_view_access(visibility_type, visible_students));

-- Garante que o Admin continua funcionando perfeitamente
DROP POLICY IF EXISTS "Editais Notices - Admin" ON notices;
CREATE POLICY "Editais Notices - Admin" ON notices FOR ALL USING (is_admin_or_professor());

-- 3. Reconstrói a permissão da tabela Perfis (Apenas leitura genérica)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_everyone" ON profiles;
CREATE POLICY "profiles_select_everyone" ON profiles FOR SELECT USING (true);
