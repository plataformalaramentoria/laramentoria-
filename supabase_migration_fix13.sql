-- ============================================================
-- FIX 13: CORREÇÃO DEFINITIVA DO PAINEL (SALVAMENTO E CARREGAMENTO)
--         Garante que as colunas existam e que as travas de RLS não congelem a tela.
-- ============================================================

-- 1. DESATIVAR RLS (Para evitar o congelamento/loop infinito na hora de salvar)
ALTER TABLE dashboard_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. ADICIONAR COLUNAS FALTANTES (Se o Fix 7 não foi rodado corretamente, isso causa erro ao salvar)
DO $$ 
BEGIN
    -- dashboard_tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_tasks' AND column_name = 'created_by') THEN
        ALTER TABLE dashboard_tasks ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_tasks' AND column_name = 'updated_by') THEN
        ALTER TABLE dashboard_tasks ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;

    -- dashboard_goals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_goals' AND column_name = 'created_by') THEN
        ALTER TABLE dashboard_goals ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_goals' AND column_name = 'updated_by') THEN
        ALTER TABLE dashboard_goals ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;

    -- agenda_events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agenda_events' AND column_name = 'created_by') THEN
        ALTER TABLE agenda_events ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agenda_events' AND column_name = 'updated_by') THEN
        ALTER TABLE agenda_events ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;

    -- advisor_messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_messages' AND column_name = 'created_by') THEN
        ALTER TABLE advisor_messages ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_messages' AND column_name = 'updated_by') THEN
        ALTER TABLE advisor_messages ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;
END $$;
