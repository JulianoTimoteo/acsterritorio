-- Revogar e conceder permissões para segurança (corrigido com base na assinatura exata)
REVOKE EXECUTE ON FUNCTION public.definir_aprovacao(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.listar_usuarios() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.aceitar_transferencia(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recusar_transferencia(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transferir_para_posto(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.esta_aprovado() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.esta_aprovado(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.definir_aprovacao(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_usuarios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.aceitar_transferencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recusar_transferencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferir_para_posto(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.esta_aprovado() TO authenticated;
GRANT EXECUTE ON FUNCTION public.esta_aprovado(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
