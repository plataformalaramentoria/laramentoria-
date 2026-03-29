-- ============================================================
-- SCRIPT DE BLINDAGEM ABSOLUTA FINAL (RECONSTRUÇÃO DA RLS)
-- Corrige a interrupção da RLS devida aos tipos de dados das colunas
-- ============================================================

-- 1. Corrigindo Tipagem
-- Como a coluna visible_students pode não ser JSON puro (provavelmente é array nativo), o banco dava "Mismatch" (erro de tipo) em silêncio e omitia todas as linhas!
CREATE OR REPLACE FUNCTION notices_view_access(v_type text, v_students_txt text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF v_type = 'ALL' THEN
    RETURN true;
  END IF;

  IF v_students_txt IS NOT NULL AND v_students_txt LIKE '%' || auth.uid()::text || '%' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR'));
END;
$$;

-- 2. Restaurar a leitura de Pastas (Folders) bloqueada
ALTER TABLE notice_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editais Folders - View" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Admin" ON notice_folders;
DROP POLICY IF EXISTS "Editais Folders - Full Admin" ON notice_folders;
-- Todos logados podem VER as pastas. O JS vai ocultar a pasta automaticamente se o aluno não tiver arquivos dentro dela!
CREATE POLICY "Editais Folders - View" ON notice_folders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Editais Folders - Admin" ON notice_folders FOR ALL USING (is_admin_or_professor());


-- 3. Aplicar Política de Arquivos (Notices) Blindada Sem Falha de Tipo
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editais Notices - View" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Admin" ON notices;
DROP POLICY IF EXISTS "Editais Notices - Full Admin" ON notices;
-- Forçamos a coluna "visible_students" a virar texto puro antes de passar para a função, blindando qualquer erro!
CREATE POLICY "Editais Notices - View" ON notices FOR SELECT 
USING (notices_view_access(visibility_type, visible_students::text));

CREATE POLICY "Editais Notices - Admin" ON notices FOR ALL USING (is_admin_or_professor());

-- 4. Tratamento do Storage
DROP POLICY IF EXISTS "Notices Objects - Admin" ON storage.objects;
DROP POLICY IF EXISTS "Notices Objects - Read" ON storage.objects;
CREATE POLICY "Notices Objects - Admin" ON storage.objects FOR ALL
USING (bucket_id = 'notices' AND (SELECT is_admin_or_professor()))
WITH CHECK (bucket_id = 'notices' AND (SELECT is_admin_or_professor()));
CREATE POLICY "Notices Objects - Read" ON storage.objects FOR SELECT
USING (bucket_id = 'notices' AND auth.role() = 'authenticated');
