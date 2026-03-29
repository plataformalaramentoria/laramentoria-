-- ============================================================
-- FIX 7: Reestruturação da Aba Início (Dashboard)
--        Adiciona metadados de autoria e atualiza RLS
-- ============================================================

-- 1. ADICIONAR COLUNAS DE METADADOS
-- Repetir para as 4 tabelas principais da Home

DO $$ 
BEGIN
    -- dashboard_tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_tasks' AND column_name = 'updated_at') THEN
        ALTER TABLE dashboard_tasks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_tasks' AND column_name = 'created_by') THEN
        ALTER TABLE dashboard_tasks ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_tasks' AND column_name = 'updated_by') THEN
        ALTER TABLE dashboard_tasks ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;

    -- dashboard_goals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_goals' AND column_name = 'updated_at') THEN
        ALTER TABLE dashboard_goals ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_goals' AND column_name = 'created_by') THEN
        ALTER TABLE dashboard_goals ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_goals' AND column_name = 'updated_by') THEN
        ALTER TABLE dashboard_goals ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;

    -- agenda_events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agenda_events' AND column_name = 'updated_at') THEN
        ALTER TABLE agenda_events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agenda_events' AND column_name = 'created_by') THEN
        ALTER TABLE agenda_events ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agenda_events' AND column_name = 'updated_by') THEN
        ALTER TABLE agenda_events ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;

    -- advisor_messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_messages' AND column_name = 'updated_at') THEN
        ALTER TABLE advisor_messages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_messages' AND column_name = 'created_by') THEN
        ALTER TABLE advisor_messages ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_messages' AND column_name = 'updated_by') THEN
        ALTER TABLE advisor_messages ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. ATUALIZAR POLÍTICAS RLS PARA PERMITIR EDIÇÃO POR ADMIN/PROFESSOR
-- Já garantido pelo is_admin_or_professor() em migrações anteriores,
-- mas vamos reforçar para garantir que o student_id seja respeitado.

-- Reinforce RLS on advisor_messages
DROP POLICY IF EXISTS "adv_msg_student_all" ON advisor_messages;
DROP POLICY IF EXISTS "adv_msg_admin_all" ON advisor_messages;
CREATE POLICY "adv_msg_student_all" ON advisor_messages FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "adv_msg_admin_all" ON advisor_messages FOR ALL USING (is_admin_or_professor());

-- Reinforce RLS on dashboard_tasks
DROP POLICY IF EXISTS "dt_own" ON dashboard_tasks;
DROP POLICY IF EXISTS "dt_admin_all" ON dashboard_tasks;
CREATE POLICY "dt_own" ON dashboard_tasks FOR ALL USING (student_id = auth.uid());
CREATE POLICY "dt_admin_all" ON dashboard_tasks FOR ALL USING (is_admin_or_professor());

-- Reinforce RLS on dashboard_goals
DROP POLICY IF EXISTS "dg_own" ON dashboard_goals;
DROP POLICY IF EXISTS "dg_admin_all" ON dashboard_goals;
CREATE POLICY "dg_own" ON dashboard_goals FOR ALL USING (student_id = auth.uid());
CREATE POLICY "dg_admin_all" ON dashboard_goals FOR ALL USING (is_admin_or_professor());

-- Reinforce RLS on agenda_events
DROP POLICY IF EXISTS "ae_own" ON agenda_events;
DROP POLICY IF EXISTS "ae_admin_all" ON agenda_events;
CREATE POLICY "ae_own" ON agenda_events FOR ALL USING (student_id = auth.uid());
CREATE POLICY "ae_admin_all" ON agenda_events FOR ALL USING (is_admin_or_professor());

-- 3. TRIGGER PARA UPDATED_AT (Opcional, mas recomendado)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON dashboard_tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON dashboard_goals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON agenda_events FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON advisor_messages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
