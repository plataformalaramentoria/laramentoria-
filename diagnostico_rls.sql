-- ============================================================
-- DIAGNÓSTICO: Listar políticas atuais
-- Por favor, rode isso primeiro e me mande o resultado se possível,
-- mas já vou preparar o FIX 9 baseado no que previ.
-- ============================================================

SELECT tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
