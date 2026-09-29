-- 1) Controle explícito de exclusão de transferências: somente administradores
CREATE POLICY "transferencias_admin_delete"
ON public.transferencias
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

GRANT DELETE ON public.transferencias TO authenticated;

-- 2) Nenhuma função SECURITY DEFINER acessível por PUBLIC/anon
REVOKE ALL ON FUNCTION public.esta_aprovado(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.esta_aprovado() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.listar_agentes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.listar_usuarios() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_admin(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_aprovacao(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.aceitar_transferencia(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recusar_transferencia(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transferir_para_posto(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;

-- 3) Usuários logados não devem sondar a aprovação de outras contas.
--    A versão com parâmetro é usada apenas dentro de outras funções SECURITY DEFINER.
REVOKE ALL ON FUNCTION public.esta_aprovado(uuid) FROM authenticated;

-- Garante os privilégios mínimos necessários ao funcionamento do app
GRANT EXECUTE ON FUNCTION public.esta_aprovado() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_agentes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_usuarios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_aprovacao(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aceitar_transferencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recusar_transferencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferir_para_posto(uuid, text, text) TO authenticated;