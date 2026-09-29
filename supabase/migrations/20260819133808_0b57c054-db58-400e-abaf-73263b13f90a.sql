
-- 1. Remover a dependência recursiva nas políticas de segurança.
-- Substituímos a chamada de função public.is_admin() por subconsultas diretas.

-- Para a tabela user_roles
DROP POLICY IF EXISTS "user_roles_admin_select" ON public.user_roles;
CREATE POLICY "user_roles_admin_select" ON public.user_roles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "user_roles_admin_insert" ON public.user_roles;
CREATE POLICY "user_roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "user_roles_admin_delete" ON public.user_roles;
CREATE POLICY "user_roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  AND (NOT (user_id = auth.uid() AND role = 'admin'))
);

-- Para a tabela profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
USING (
  (auth.uid() = id) 
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
USING (
  (auth.uid() = id) 
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  (auth.uid() = id) 
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2. Converter funções para SECURITY INVOKER
-- Isso resolve o alerta do linter pois a função agora respeita o RLS do chamador.

CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER -- Alterado para INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin');
$function$;

CREATE OR REPLACE FUNCTION public.esta_aprovado()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER -- Alterado para INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.aprovado
  )
$function$;

CREATE OR REPLACE FUNCTION public.esta_aprovado(_uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER -- Alterado para INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND aprovado);
$function$;
