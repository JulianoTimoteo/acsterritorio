-- Admin nunca precisa de aprovação
CREATE OR REPLACE FUNCTION public.esta_aprovado()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.aprovado
  )
$$;

-- Aprova automaticamente a conta principal na criação
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _principal boolean := lower(NEW.email) = lower('juliano.timoteo@hotmail.com');
BEGIN
  INSERT INTO public.profiles (id, nome, email, aprovado, aprovado_em)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    _principal,
    CASE WHEN _principal THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        aprovado = public.profiles.aprovado OR EXCLUDED.aprovado;
  RETURN NEW;
END; $$;

-- Aprova quem já é administrador hoje
ALTER TABLE public.profiles DISABLE TRIGGER USER;
UPDATE public.profiles p
SET aprovado = true, aprovado_em = COALESCE(p.aprovado_em, now())
WHERE NOT p.aprovado
  AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin');
ALTER TABLE public.profiles ENABLE TRIGGER USER;