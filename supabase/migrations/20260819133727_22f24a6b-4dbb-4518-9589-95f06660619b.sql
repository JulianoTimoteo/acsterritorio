
-- Ajustando permissões das funções SECURITY DEFINER remanescentes para silenciar o linter de segurança
-- Estas funções validam auth.uid() internamente, mas o linter exige a revogação do EXECUTE para 'authenticated'
-- para evitar chamadas RPC diretas que ignorem a intenção do desenvolvedor, 
-- embora neste caso elas sejam seguras por design.

-- 1. Revogar acesso direto do usuário autenticado para 'is_admin'
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

-- 2. Revogar acesso direto do usuário autenticado para 'esta_aprovado' (ambas as sobrecargas)
REVOKE EXECUTE ON FUNCTION public.esta_aprovado() FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.esta_aprovado() TO service_role;

REVOKE EXECUTE ON FUNCTION public.esta_aprovado(uuid) FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.esta_aprovado(uuid) TO service_role;

-- Nota: Como estas funções são SECURITY DEFINER, elas podem ser chamadas por outras funções 
-- ou triggers internos, mas não serão listadas como RPCs chamáveis pelo cliente (PostgREST).
