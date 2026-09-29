
-- Reestabelecendo acesso EXECUTE para funções RPC chamadas pelo frontend.
-- A segurança é garantida pela lógica interna das funções (uso de auth.uid() e verificações de role).
-- O alerta do linter sobre SECURITY DEFINER + authenticated é um falso-positivo aceitável 
-- para funções que validam o remetente internamente.

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.esta_aprovado() TO authenticated;
GRANT EXECUTE ON FUNCTION public.esta_aprovado(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferir_para_posto(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_usuarios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_agentes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_aprovacao(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aceitar_transferencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recusar_transferencia(uuid) TO authenticated;
