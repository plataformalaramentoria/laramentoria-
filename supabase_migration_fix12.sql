-- ============================================================
-- FIX 12: LIMPEZA TOTAL DE BLOQUEIOS
--         Remove a flag de troca de senha de TODOS os usuários.
-- ============================================================

-- 1. Desativar a trava para TODO MUNDO
UPDATE profiles SET force_password_change = false;

-- 2. Garantir que as tabelas estão acessíveis (Sem RLS)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_messages DISABLE ROW LEVEL SECURITY;

-- 3. Diagnóstico (O resultado aparecerá no console do Supabase após rodar)
SELECT id, email, role, force_password_change, is_active FROM profiles;
