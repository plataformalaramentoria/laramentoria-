-- ============================================================
-- SCRIPT DE CORREÇÃO DO MÓDULO "MEU PROGRESSO"
-- Garante tabelas e políticas corretas para Inserção/Edição/Leitura do aluno e admin
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. Garantir que as tabelas existam (se já existirem, ignorará a criação estrutural principal se não for possível) ──
CREATE TABLE IF NOT EXISTS progress_stages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS progress_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  stage_id uuid REFERENCES progress_stages(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ── 2. Ajuste de RLS (Row Level Security) em progress_stages ──
ALTER TABLE progress_stages ENABLE ROW LEVEL SECURITY;

-- Limpar possíveis políticas antigas
DROP POLICY IF EXISTS "ps_own" ON progress_stages;
DROP POLICY IF EXISTS "ps_admin_read" ON progress_stages;
DROP POLICY IF EXISTS "ps_select" ON progress_stages;
DROP POLICY IF EXISTS "ps_insert" ON progress_stages;
DROP POLICY IF EXISTS "ps_update" ON progress_stages;
DROP POLICY IF EXISTS "ps_delete" ON progress_stages;

-- Criar políticas explícitas fortes
CREATE POLICY "ps_select" ON progress_stages FOR SELECT 
USING (student_id = auth.uid() OR is_admin_or_professor());

CREATE POLICY "ps_insert" ON progress_stages FOR INSERT 
WITH CHECK (student_id = auth.uid() OR is_admin_or_professor());

CREATE POLICY "ps_update" ON progress_stages FOR UPDATE 
USING (student_id = auth.uid() OR is_admin_or_professor()) 
WITH CHECK (student_id = auth.uid() OR is_admin_or_professor());

CREATE POLICY "ps_delete" ON progress_stages FOR DELETE 
USING (student_id = auth.uid() OR is_admin_or_professor());

-- ── 3. Ajuste de RLS (Row Level Security) em progress_items ──
ALTER TABLE progress_items ENABLE ROW LEVEL SECURITY;

-- Limpar possíveis políticas antigas
DROP POLICY IF EXISTS "pi_own" ON progress_items;
DROP POLICY IF EXISTS "pi_admin_read" ON progress_items;
DROP POLICY IF EXISTS "pi_select" ON progress_items;
DROP POLICY IF EXISTS "pi_insert" ON progress_items;
DROP POLICY IF EXISTS "pi_update" ON progress_items;
DROP POLICY IF EXISTS "pi_delete" ON progress_items;

-- Criar políticas explícitas fortes
CREATE POLICY "pi_select" ON progress_items FOR SELECT 
USING (student_id = auth.uid() OR is_admin_or_professor());

CREATE POLICY "pi_insert" ON progress_items FOR INSERT 
WITH CHECK (student_id = auth.uid() OR is_admin_or_professor());

CREATE POLICY "pi_update" ON progress_items FOR UPDATE 
USING (student_id = auth.uid() OR is_admin_or_professor()) 
WITH CHECK (student_id = auth.uid() OR is_admin_or_professor());

CREATE POLICY "pi_delete" ON progress_items FOR DELETE 
USING (student_id = auth.uid() OR is_admin_or_professor());

-- Fim do script
