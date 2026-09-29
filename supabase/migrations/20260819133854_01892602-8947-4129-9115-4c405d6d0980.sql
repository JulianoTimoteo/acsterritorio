
DROP FUNCTION IF EXISTS public.listar_usuarios();
DROP FUNCTION IF EXISTS public.listar_agentes();

CREATE OR REPLACE FUNCTION public.listar_usuarios()
 RETURNS TABLE(
    id uuid, 
    email text, 
    nome text, 
    unidade text, 
    micro_area text, 
    aprovado boolean, 
    admin boolean, 
    role app_role, 
    created_at timestamp with time zone
 )
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id, 
    p.email, 
    p.nome, 
    p.unidade, 
    p.micro_area, 
    p.aprovado, 
    (ur.role = 'admin') as admin, 
    ur.role, 
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id;
$function$;

CREATE OR REPLACE FUNCTION public.listar_agentes()
 RETURNS TABLE(
    id uuid, 
    email text, 
    nome text, 
    micro_area text
 )
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.email, p.nome, p.micro_area
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'agente';
$function$;
