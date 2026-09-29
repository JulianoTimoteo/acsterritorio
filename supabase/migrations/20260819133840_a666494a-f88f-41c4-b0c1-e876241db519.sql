
DROP FUNCTION IF EXISTS public.listar_usuarios();
DROP FUNCTION IF EXISTS public.listar_agentes();

CREATE OR REPLACE FUNCTION public.listar_usuarios()
 RETURNS TABLE(id uuid, email text, aprovado boolean, admin boolean, role app_role, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id, 
    p.email, 
    p.aprovado, 
    (ur.role = 'admin') as admin, 
    ur.role, 
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id;
$function$;

CREATE OR REPLACE FUNCTION public.listar_agentes()
 RETURNS TABLE(id uuid, email text)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.email
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'agente';
$function$;
