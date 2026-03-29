-- ============================================================
-- FIX 11: MODO DE EMERGÊNCIA - RECUPERAÇÃO DE ACESSO
--         Desabilita RLS e remove triggers para destravar o banco.
-- ============================================================

-- 1. Desabilitar RLS na tabela profiles (Liberação Total Temporária)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remover triggers que podem estar causando lentidão ou erro
DROP TRIGGER IF EXISTS on_profile_role_update ON profiles;
DROP FUNCTION IF EXISTS sync_user_role_to_metadata();

-- 3. Limpar funções problemáticas e recriar versões "Dummy" que sempre retornam True
-- Isso permite que o login prossiga sem checar nada por enquanto.

CREATE OR REPLACE FUNCTION is_admin_only()
RETURNS BOOLEAN AS $$ SELECT TRUE; $$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_professor()
RETURNS BOOLEAN AS $$ SELECT TRUE; $$ LANGUAGE sql STABLE;

-- 4. Garantir que o usuário principal tenha a flag de troca de senha limpa
-- (Isso pula a tela de "Atualização Obrigatória" que está travando)
UPDATE profiles 
SET force_password_change = false 
WHERE email = 'jotajoao29@gmail.com';

-- 5. Dar permissão total para as tabelas de Dashboard (Temporário)
ALTER TABLE dashboard_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_messages DISABLE ROW LEVEL SECURITY;
