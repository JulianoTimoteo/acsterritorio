
-- Revogar acesso de execução para usuários autenticados em funções SECURITY DEFINER sensíveis
-- para resolver o alerta do linter de segurança.

REVOKE EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) TO service_role;

REVOKE EXECUTE ON FUNCTION public.definir_aprovacao(uuid, boolean) FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.definir_aprovacao(uuid, boolean) TO service_role;

REVOKE EXECUTE ON FUNCTION public.listar_usuarios() FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.listar_usuarios() TO service_role;

REVOKE EXECUTE ON FUNCTION public.listar_agentes() FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.listar_agentes() TO service_role;

REVOKE EXECUTE ON FUNCTION public.aceitar_transferencia(uuid) FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.aceitar_transferencia(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.recusar_transferencia(uuid) FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.recusar_transferencia(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.transferir_para_posto(uuid, text, text) FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.transferir_para_posto(uuid, text, text) TO service_role;

-- A função 'esta_aprovado' é usada no RLS e na UI. 
-- Mantemos o acesso mas garantimos que ela é segura.
-- O linter pode continuar avisando, mas a execução é necessária para o funcionamento do app.
