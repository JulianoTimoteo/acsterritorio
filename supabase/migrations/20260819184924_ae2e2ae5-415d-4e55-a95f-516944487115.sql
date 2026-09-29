
-- 1. Criar tabela de auditoria (logs)
CREATE TABLE public.admin_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    actor_id uuid REFERENCES auth.users(id),
    target_id uuid, -- ID do usuário ou objeto afetado
    action text NOT NULL, -- 'APROVACAO', 'REVOGACAO', 'TORNOU_ADMIN', 'REMOVEU_ADMIN', 'MUDANCA_PERMISSAO'
    details jsonb DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver todos os logs"
ON public.admin_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 2. Atualizar funções existentes para incluir logs e corrigir permissões
CREATE OR REPLACE FUNCTION public.listar_usuarios()
 RETURNS TABLE(id uuid, email text, nome text, unidade text, micro_area text, aprovado boolean, admin boolean, role app_role, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
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
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE public.is_admin(auth.uid()); -- Filtro de segurança
$function$;

GRANT EXECUTE ON FUNCTION public.listar_usuarios() TO authenticated;

CREATE OR REPLACE FUNCTION public.definir_aprovacao(_uid uuid, _aprovado boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Somente administradores.'; END IF;
  
  UPDATE public.profiles
  SET aprovado = _aprovado,
      aprovado_em = CASE WHEN _aprovado THEN now() ELSE NULL END,
      aprovado_por = CASE WHEN _aprovado THEN auth.uid() ELSE NULL END
  WHERE id = _uid;

  INSERT INTO public.admin_logs (actor_id, target_id, action, details)
  VALUES (auth.uid(), _uid, CASE WHEN _aprovado THEN 'APROVACAO' ELSE 'REVOGACAO' END, jsonb_build_object('novo_estado', _aprovado));
END; $function$;

GRANT EXECUTE ON FUNCTION public.definir_aprovacao(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.definir_admin(_uid uuid, _admin boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Somente administradores.'; END IF;
  
  IF _uid = auth.uid() AND NOT _admin THEN
    RAISE EXCEPTION 'Você não pode remover o seu próprio acesso de administrador.';
  END IF;

  IF _admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles SET aprovado = true, aprovado_em = now(), aprovado_por = auth.uid()
    WHERE id = _uid AND NOT aprovado;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _uid AND role = 'admin';
  END IF;

  INSERT INTO public.admin_logs (actor_id, target_id, action, details)
  VALUES (auth.uid(), _uid, CASE WHEN _admin THEN 'TORNOU_ADMIN' ELSE 'REMOVEU_ADMIN' END, jsonb_build_object('novo_estado', _admin));
END; $function$;

GRANT EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) TO authenticated;
