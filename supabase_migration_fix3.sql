-- ============================================================
-- FIX 3: Políticas RLS para tabelas de dados dos alunos
--        Permite que ADMIN e PROFESSOR leiam dados de qualquer aluno
--        Execute no SQL Editor do Supabase
-- ============================================================

-- ── TABELA: advisor_messages ──────────────────────────────────
ALTER TABLE advisor_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "adv_msg_own" ON advisor_messages;
DROP POLICY IF EXISTS "adv_msg_admin_read" ON advisor_messages;
CREATE POLICY "adv_msg_own" ON advisor_messages FOR ALL USING (student_id = auth.uid());
CREATE POLICY "adv_msg_admin_read" ON advisor_messages FOR ALL USING (is_admin_or_professor());

-- ── TABELA: project_versions ─────────────────────────────────
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pv_own" ON project_versions;
DROP POLICY IF EXISTS "pv_admin_read" ON project_versions;
CREATE POLICY "pv_own" ON project_versions FOR ALL USING (student_id = auth.uid());
CREATE POLICY "pv_admin_read" ON project_versions FOR ALL USING (is_admin_or_professor());

-- ── TABELA: progress_stages ──────────────────────────────────
ALTER TABLE progress_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ps_own" ON progress_stages;
DROP POLICY IF EXISTS "ps_admin_read" ON progress_stages;
CREATE POLICY "ps_own" ON progress_stages FOR ALL USING (student_id = auth.uid());
CREATE POLICY "ps_admin_read" ON progress_stages FOR ALL USING (is_admin_or_professor());

-- ── TABELA: progress_items ───────────────────────────────────
ALTER TABLE progress_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pi_own" ON progress_items;
DROP POLICY IF EXISTS "pi_admin_read" ON progress_items;
CREATE POLICY "pi_own" ON progress_items FOR ALL USING (student_id = auth.uid());
CREATE POLICY "pi_admin_read" ON progress_items FOR ALL USING (is_admin_or_professor());

-- ── TABELA: dashboard_tasks ──────────────────────────────────
ALTER TABLE dashboard_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dt_own" ON dashboard_tasks;
DROP POLICY IF EXISTS "dt_admin_read" ON dashboard_tasks;
CREATE POLICY "dt_own" ON dashboard_tasks FOR ALL USING (student_id = auth.uid());
CREATE POLICY "dt_admin_read" ON dashboard_tasks FOR ALL USING (is_admin_or_professor());

-- ── TABELA: dashboard_goals ──────────────────────────────────
ALTER TABLE dashboard_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dg_own" ON dashboard_goals;
DROP POLICY IF EXISTS "dg_admin_read" ON dashboard_goals;
CREATE POLICY "dg_own" ON dashboard_goals FOR ALL USING (student_id = auth.uid());
CREATE POLICY "dg_admin_read" ON dashboard_goals FOR ALL USING (is_admin_or_professor());

-- ── TABELA: agenda_events ────────────────────────────────────
ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ae_own" ON agenda_events;
DROP POLICY IF EXISTS "ae_admin_read" ON agenda_events;
CREATE POLICY "ae_own" ON agenda_events FOR ALL USING (student_id = auth.uid());
CREATE POLICY "ae_admin_read" ON agenda_events FOR ALL USING (is_admin_or_professor());

-- ── TABELA: curriculum_sections ──────────────────────────────
ALTER TABLE curriculum_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cs_own" ON curriculum_sections;
DROP POLICY IF EXISTS "cs_admin_read" ON curriculum_sections;
CREATE POLICY "cs_own" ON curriculum_sections FOR ALL USING (student_id = auth.uid());
CREATE POLICY "cs_admin_read" ON curriculum_sections FOR ALL USING (is_admin_or_professor());

-- ── TABELA: curriculum_items ─────────────────────────────────
ALTER TABLE curriculum_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ci_own" ON curriculum_items;
DROP POLICY IF EXISTS "ci_admin_read" ON curriculum_items;
-- curriculum_items não tem student_id direto, join via section
CREATE POLICY "ci_own" ON curriculum_items FOR ALL USING (
  EXISTS (SELECT 1 FROM curriculum_sections cs WHERE cs.id = curriculum_items.section_id AND cs.student_id = auth.uid())
);
CREATE POLICY "ci_admin_read" ON curriculum_items FOR ALL USING (is_admin_or_professor());

-- ── TABELA: notice_folders (editais) ─────────────────────────
ALTER TABLE notice_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nf_all" ON notice_folders;
CREATE POLICY "nf_all" ON notice_folders FOR SELECT USING (true); -- público para leitura

-- ── TABELA: notices ──────────────────────────────────────────
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notices_all" ON notices;
DROP POLICY IF EXISTS "notices_admin" ON notices;
CREATE POLICY "notices_all" ON notices FOR SELECT USING (
  visibility_type = 'ALL'
  OR visible_students ? auth.uid()::text
  OR is_admin_or_professor()
);
CREATE POLICY "notices_admin" ON notices FOR ALL USING (is_admin_or_professor());

-- ── TABELA: apostila_folders ─────────────────────────────────
ALTER TABLE apostila_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "af_all" ON apostila_folders;
CREATE POLICY "af_all" ON apostila_folders FOR SELECT USING (true);

-- ── TABELA: apostilas ────────────────────────────────────────
ALTER TABLE apostilas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apostilas_select" ON apostilas;
DROP POLICY IF EXISTS "apostilas_admin" ON apostilas;
CREATE POLICY "apostilas_select" ON apostilas FOR SELECT USING (
  visibility_type = 'ALL'
  OR visible_students ? auth.uid()::text
  OR is_admin_or_professor()
);
CREATE POLICY "apostilas_admin" ON apostilas FOR ALL USING (is_admin_or_professor());

-- ── TABELA: project_checklist_items ──────────────────────────
ALTER TABLE project_checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pci_own" ON project_checklist_items;
DROP POLICY IF EXISTS "pci_admin" ON project_checklist_items;
CREATE POLICY "pci_own" ON project_checklist_items FOR ALL USING (student_id = auth.uid());
CREATE POLICY "pci_admin" ON project_checklist_items FOR ALL USING (is_admin_or_professor());

-- ── COLUNA email: Garantir que está preenchida em profiles ───
-- Atualiza perfis existentes sem email, buscando da tabela auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- ── VERIFICAÇÃO ──────────────────────────────────────────────
SELECT
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles','advisor_messages','project_versions',
    'progress_stages','progress_items','dashboard_tasks',
    'dashboard_goals','agenda_events','curriculum_sections',
    'curriculum_items','courses','student_course_access'
  )
ORDER BY tablename, policyname;
