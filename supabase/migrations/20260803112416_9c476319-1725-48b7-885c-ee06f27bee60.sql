-- 1. Perfis: aprovação
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS aprovado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email;

-- 2. Famílias: situação
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS situacao text NOT NULL DEFAULT 'ativa';

-- 3. Funções de verificação (SECURITY DEFINER, sem recursão em RLS)
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin');
$$;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.esta_aprovado(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND aprovado);
$$;
REVOKE ALL ON FUNCTION public.esta_aprovado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.esta_aprovado(uuid) TO authenticated, service_role;

-- 4. Perfis: políticas e proteção contra auto-aprovação
DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.proteger_aprovacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.aprovado IS DISTINCT FROM OLD.aprovado
      OR NEW.aprovado_por IS DISTINCT FROM OLD.aprovado_por
      OR NEW.email IS DISTINCT FROM OLD.email)
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente administradores podem alterar a aprovação.';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.proteger_aprovacao() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS profiles_proteger_aprovacao ON public.profiles;
CREATE TRIGGER profiles_proteger_aprovacao BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_aprovacao();

-- 5. Papéis: administradores gerenciam
CREATE POLICY "user_roles_admin_select" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "user_roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "user_roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin() AND NOT (user_id = auth.uid() AND role = 'admin'));
GRANT INSERT, DELETE ON public.user_roles TO authenticated;

-- 6. Dados clínicos só para aprovados
DROP POLICY IF EXISTS "own families" ON public.families;
CREATE POLICY "own families" ON public.families FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.esta_aprovado())
  WITH CHECK (auth.uid() = user_id AND public.esta_aprovado());

DROP POLICY IF EXISTS "own residents" ON public.residents;
CREATE POLICY "own residents" ON public.residents FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.esta_aprovado())
  WITH CHECK (auth.uid() = user_id AND public.esta_aprovado());

DROP POLICY IF EXISTS "own visits" ON public.visits;
CREATE POLICY "own visits" ON public.visits FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.esta_aprovado())
  WITH CHECK (auth.uid() = user_id AND public.esta_aprovado());

DROP POLICY IF EXISTS "own appointments" ON public.appointments;
CREATE POLICY "own appointments" ON public.appointments FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.esta_aprovado())
  WITH CHECK (auth.uid() = user_id AND public.esta_aprovado());

-- 7. Transferências
CREATE TABLE IF NOT EXISTS public.transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  de_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  para_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  destino_externo text,
  motivo text,
  status text NOT NULL DEFAULT 'pendente',
  respondida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.transferencias TO authenticated;
GRANT ALL ON public.transferencias TO service_role;
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transferencias_select" ON public.transferencias FOR SELECT TO authenticated
  USING (de_user_id = auth.uid() OR para_user_id = auth.uid() OR public.is_admin());
CREATE POLICY "transferencias_insert" ON public.transferencias FOR INSERT TO authenticated
  WITH CHECK (
    de_user_id = auth.uid()
    AND public.esta_aprovado()
    AND EXISTS (SELECT 1 FROM public.families f WHERE f.id = family_id AND f.user_id = auth.uid())
  );
CREATE POLICY "transferencias_update_remetente" ON public.transferencias FOR UPDATE TO authenticated
  USING (de_user_id = auth.uid() AND status = 'pendente')
  WITH CHECK (de_user_id = auth.uid());

DROP TRIGGER IF EXISTS transferencias_updated ON public.transferencias;
CREATE TRIGGER transferencias_updated BEFORE UPDATE ON public.transferencias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Aceitar / recusar / enviar para posto externo
CREATE OR REPLACE FUNCTION public.aceitar_transferencia(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.transferencias%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.transferencias WHERE id = _id AND status = 'pendente' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transferência não encontrada ou já respondida.'; END IF;
  IF t.para_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  IF NOT public.esta_aprovado(auth.uid()) THEN RAISE EXCEPTION 'Usuário não aprovado.'; END IF;

  UPDATE public.families SET user_id = t.para_user_id, situacao = 'ativa' WHERE id = t.family_id;
  UPDATE public.residents SET user_id = t.para_user_id WHERE family_id = t.family_id;
  UPDATE public.visits SET user_id = t.para_user_id WHERE family_id = t.family_id;
  UPDATE public.appointments SET user_id = t.para_user_id WHERE family_id = t.family_id;
  UPDATE public.transferencias SET status = 'aceita', respondida_em = now() WHERE id = _id;
END; $$;
REVOKE ALL ON FUNCTION public.aceitar_transferencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aceitar_transferencia(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.recusar_transferencia(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.transferencias%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.transferencias WHERE id = _id AND status = 'pendente' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transferência não encontrada ou já respondida.'; END IF;
  IF t.para_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  UPDATE public.transferencias SET status = 'recusada', respondida_em = now() WHERE id = _id;
END; $$;
REVOKE ALL ON FUNCTION public.recusar_transferencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recusar_transferencia(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.transferir_para_posto(_family_id uuid, _destino text, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.families WHERE id = _family_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Família não encontrada na sua área.';
  END IF;
  IF NOT public.esta_aprovado(auth.uid()) THEN RAISE EXCEPTION 'Usuário não aprovado.'; END IF;

  INSERT INTO public.transferencias (family_id, de_user_id, destino_externo, motivo, status, respondida_em)
  VALUES (_family_id, auth.uid(), _destino, _motivo, 'concluida', now());
  UPDATE public.families SET situacao = 'transferida' WHERE id = _family_id;
END; $$;
REVOKE ALL ON FUNCTION public.transferir_para_posto(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transferir_para_posto(uuid, text, text) TO authenticated;

-- 9. Listagens seguras
CREATE OR REPLACE FUNCTION public.listar_agentes()
RETURNS TABLE (id uuid, nome text, unidade text, micro_area text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nome, p.unidade, p.micro_area
  FROM public.profiles p
  WHERE p.aprovado AND p.id <> auth.uid() AND public.esta_aprovado(auth.uid())
  ORDER BY p.nome;
$$;
REVOKE ALL ON FUNCTION public.listar_agentes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_agentes() TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_usuarios()
RETURNS TABLE (id uuid, nome text, email text, unidade text, micro_area text,
               aprovado boolean, aprovado_em timestamptz, criado_em timestamptz, admin boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nome, p.email, p.unidade, p.micro_area, p.aprovado, p.aprovado_em, p.created_at,
         EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin')
  FROM public.profiles p
  WHERE public.is_admin(auth.uid())
  ORDER BY p.aprovado, p.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.listar_usuarios() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_usuarios() TO authenticated;

CREATE OR REPLACE FUNCTION public.definir_aprovacao(_uid uuid, _aprovado boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Somente administradores.'; END IF;
  UPDATE public.profiles
  SET aprovado = _aprovado,
      aprovado_em = CASE WHEN _aprovado THEN now() ELSE NULL END,
      aprovado_por = CASE WHEN _aprovado THEN auth.uid() ELSE NULL END
  WHERE id = _uid;
END; $$;
REVOKE ALL ON FUNCTION public.definir_aprovacao(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_aprovacao(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.definir_admin(_uid uuid, _admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;
REVOKE ALL ON FUNCTION public.definir_admin(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) TO authenticated;

-- 10. Novo usuário: guarda e-mail e aprova automaticamente o administrador principal
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, aprovado, aprovado_em)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    lower(NEW.email) = lower('juliano.timoteo@hotmail.com'),
    CASE WHEN lower(NEW.email) = lower('juliano.timoteo@hotmail.com') THEN now() END
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END; $$;