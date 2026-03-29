-- Execute este script completo no banco de dados. Ele substitui a trava que estava recaindo sobre o aluno.

CREATE OR REPLACE FUNCTION can_view_notice(v_type text, v_students jsonb) RETURNS boolean
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    v_type = 'ALL' 
    OR (v_students::text LIKE '%' || auth.uid()::text || '%')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSOR'));
$$;

DROP POLICY IF EXISTS "Editais Notices - View" ON notices;
CREATE POLICY "Editais Notices - View" ON notices FOR SELECT 
USING (can_view_notice(visibility_type, visible_students));
