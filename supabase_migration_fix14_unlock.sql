-- ============================================================
-- FIX 14: DESTRAVAR BANCO DE DADOS (ROW LOCKS)
-- Usa comandos de administrador para forçar o encerramento 
-- de consultas antigas ("fantasmas") que estão ocupando as linhas 
-- das tarefas e impedindo edições e exclusões.
-- ============================================================

SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state IN ('active', 'idle in transaction', 'idle')
  AND datname = current_database()
  AND pid <> pg_backend_pid()
  AND usename != 'supabase_admin';
