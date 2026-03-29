-- ============================================================
-- FIX 15 FINAL: SOLUÇÃO DEFINITIVA PARA RECURSÃO INFINITA
-- Remove todas as políticas da tabela 'profiles' que chamam 
-- is_admin_or_professor() e recompõem as outras com segurança,
-- eliminando O LOOP ETERNO DO POSTGREST.
-- ============================================================

-- 1. DROPAR TODAS AS POLÍTICAS PROBLEMÁTICAS DA TABELA PROFILES
DROP POLICY IF EXISTS "profiles_select_self" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_or_prof_select" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_read_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON profiles;

-- 2. RECRIAR APENAS AS POLÍTICAS SIMPLES DE ESTUDANTE PARA PROFILES
-- (Admin panel usa a service_role e ignora RLS, então não precisamos de políticas de Admin aqui!)
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());

-- 3. REFAZER POLÍTICAS DO DASHBOARD (Apenas acesso do próprio aluno)
-- Tarefas
DROP POLICY IF EXISTS "dt_own" ON dashboard_tasks;
DROP POLICY IF EXISTS "dt_admin_all" ON dashboard_tasks;
CREATE POLICY "dt_own" ON dashboard_tasks FOR ALL USING (student_id = auth.uid());

-- Metas
DROP POLICY IF EXISTS "dg_own" ON dashboard_goals;
DROP POLICY IF EXISTS "dg_admin_all" ON dashboard_goals;
CREATE POLICY "dg_own" ON dashboard_goals FOR ALL USING (student_id = auth.uid());

-- Eventos (Agenda)
DROP POLICY IF EXISTS "ae_own" ON agenda_events;
DROP POLICY IF EXISTS "ae_admin_all" ON agenda_events;
CREATE POLICY "ae_own" ON agenda_events FOR ALL USING (student_id = auth.uid());

-- Mensagens (Mural)
DROP POLICY IF EXISTS "adv_msg_student_all" ON advisor_messages;
DROP POLICY IF EXISTS "adv_msg_admin_all" ON advisor_messages;
CREATE POLICY "adv_msg_student_all" ON advisor_messages FOR ALL USING (student_id = auth.uid());

-- 4. GARANTIR QUE RLS ESTEJA ATIVADO CORRETAMENTE E SEM FORCE
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_messages ENABLE ROW LEVEL SECURITY;

-- 5. MATAR QUALQUER CONEXÃO TRAVADA NESSE MOMENTO (Opcional, mas garante limpeza imediata)
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state IN ('active', 'idle in transaction') AND pid <> pg_backend_pid() AND datname = current_database() AND usename != 'supabase_admin';
