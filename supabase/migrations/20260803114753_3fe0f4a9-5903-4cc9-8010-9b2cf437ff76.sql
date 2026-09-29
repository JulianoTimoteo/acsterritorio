REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.esta_aprovado(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_initial_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.proteger_aprovacao() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.aceitar_transferencia(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recusar_transferencia(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transferir_para_posto(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_admin(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_aprovacao(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.listar_usuarios() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.listar_agentes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.esta_aprovado() FROM PUBLIC, anon;

DROP POLICY IF EXISTS transferencias_admin_delete ON public.transferencias;
CREATE POLICY transferencias_admin_delete ON public.transferencias
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));