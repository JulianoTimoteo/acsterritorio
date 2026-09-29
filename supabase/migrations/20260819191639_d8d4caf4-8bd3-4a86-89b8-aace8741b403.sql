-- Corrigir segurança das funções administrativas
-- Revogar acesso público por padrão (bom hábito mesmo que já esteja assim)
REVOKE EXECUTE ON FUNCTION public.definir_aprovacao(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.listar_usuarios() FROM PUBLIC;

-- Conceder apenas a usuários autenticados
GRANT EXECUTE ON FUNCTION public.definir_aprovacao(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_usuarios() TO authenticated;

-- As funções já possuem verificação interna 'IF NOT public.is_admin(auth.uid())' 
-- então usuários autenticados comuns não conseguirão fazer nada.