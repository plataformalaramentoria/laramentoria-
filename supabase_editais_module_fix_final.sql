-- SCRIPT FINAL DE BLINDAGEM DO MÓDULO DE EDITAIS
-- Garantia técnica de avaliação sequencial absoluta usando PLpgSQL.

-- 1. Cria a função de segurança com retorno rápido e execução forçada bloco a bloco.
CREATE OR REPLACE FUNCTION notices_view_access(v_type text, v_students jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Se for público, retorna Verdadeiro imediatamente e interrompe qualquer leitura de banco.
  IF v_type = 'ALL' THEN
    RETURN true;
  END IF;

  -- Se o estudante estiver nominalmente autorizado.
  IF v_students::text LIKE '%' || auth.uid()::text || '%' THEN
    RETURN true;
  END IF;

  -- Último caso: verifica poder de administração
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR'));
END;
$$;

-- 2. Recria a Política na tabela Notice
DROP POLICY IF EXISTS "Editais Notices - View" ON notices;
CREATE POLICY "Editais Notices - View" ON notices FOR SELECT 
USING (notices_view_access(visibility_type, visible_students));

-- 3. Apenas garantia que Folders podem ser vistas para não causarem travas paralelas.
DROP POLICY IF EXISTS "Editais Folders - View" ON notice_folders;
CREATE POLICY "Editais Folders - View" ON notice_folders FOR SELECT USING (true);
