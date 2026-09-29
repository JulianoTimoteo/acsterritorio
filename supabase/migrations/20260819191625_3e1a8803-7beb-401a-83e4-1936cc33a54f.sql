-- Tabela de notificações
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'approval', 'permission', 'admin_alert'
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissões
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias notificações"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem marcar suas notificações como lidas"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas notificações"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Ativar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Atualizar funções administrativas para gerar notificações
CREATE OR REPLACE FUNCTION public.definir_aprovacao(_uid uuid, _aprovado boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nome_admin TEXT;
  v_nome_usuario TEXT;
  v_admin_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Somente administradores.'; END IF;
  
  SELECT nome INTO v_nome_admin FROM public.profiles WHERE id = auth.uid();
  SELECT nome INTO v_nome_usuario FROM public.profiles WHERE id = _uid;

  UPDATE public.profiles
  SET aprovado = _aprovado,
      aprovado_em = CASE WHEN _aprovado THEN now() ELSE NULL END,
      aprovado_por = CASE WHEN _aprovado THEN auth.uid() ELSE NULL END
  WHERE id = _uid;

  INSERT INTO public.admin_logs (actor_id, target_id, action, details)
  VALUES (auth.uid(), _uid, CASE WHEN _aprovado THEN 'APROVACAO' ELSE 'REVOGACAO' END, jsonb_build_object('novo_estado', _aprovado));

  -- Notificar o usuário
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _uid, 
    CASE WHEN _aprovado THEN 'Cadastro Aprovado' ELSE 'Acesso Revogado' END,
    CASE WHEN _aprovado THEN 'Seu acesso ao sistema foi aprovado por ' || COALESCE(v_nome_admin, 'um administrador') || '.' 
         ELSE 'Seu acesso ao sistema foi revogado.' END,
    'approval'
  );

  -- Notificar outros admins
  FOR v_admin_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin' AND user_id != auth.uid())
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_admin_id,
      'Gestão de Usuário',
      COALESCE(v_nome_admin, 'Admin') || CASE WHEN _aprovado THEN ' aprovou ' ELSE ' revogou o acesso de ' END || COALESCE(v_nome_usuario, 'um usuário') || '.',
      'admin_alert'
    );
  END LOOP;
END; $function$;

CREATE OR REPLACE FUNCTION public.definir_admin(_uid uuid, _admin boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nome_admin TEXT;
  v_nome_usuario TEXT;
  v_admin_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Somente administradores.'; END IF;
  
  IF _uid = auth.uid() AND NOT _admin THEN
    RAISE EXCEPTION 'Você não pode remover o seu próprio acesso de administrador.';
  END IF;

  SELECT nome INTO v_nome_admin FROM public.profiles WHERE id = auth.uid();
  SELECT nome INTO v_nome_usuario FROM public.profiles WHERE id = _uid;

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

  -- Notificar o usuário
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _uid,
    'Mudança de Permissão',
    'Você agora ' || CASE WHEN _admin THEN 'é um administrador' ELSE 'não possui mais privilégios de administrador' END || '.',
    'permission'
  );

  -- Notificar outros admins
  FOR v_admin_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin' AND user_id != auth.uid())
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_admin_id,
      'Alteração de Privilégio',
      COALESCE(v_nome_admin, 'Admin') || CASE WHEN _admin THEN ' tornou ' ELSE ' removeu admin de ' END || COALESCE(v_nome_usuario, 'um usuário') || '.',
      'admin_alert'
    );
  END LOOP;
END; $function$;