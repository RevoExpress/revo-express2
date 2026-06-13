
-- ============ ENUM RÔLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'client', 'livreur');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text,
  telephone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ has_role (security definer pour éviter récursion RLS) ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'livreur' THEN 2 ELSE 3 END
  LIMIT 1
$$;

-- ============ COLIS ============
CREATE TABLE public.colis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking text NOT NULL UNIQUE,
  client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  livreur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  expediteur_nom text NOT NULL,
  expediteur_tel text NOT NULL,
  expediteur_adresse text NOT NULL,

  destinataire_nom text NOT NULL,
  destinataire_tel text NOT NULL,
  destinataire_adresse text NOT NULL,
  destinataire_wilaya text,
  destinataire_cp text,

  description text,
  depart text,
  distance_km numeric,
  prix numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'en-attente',

  date_creation timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX colis_tracking_idx ON public.colis (tracking);
CREATE INDEX colis_client_idx ON public.colis (client_id);
CREATE INDEX colis_livreur_idx ON public.colis (livreur_id);
ALTER TABLE public.colis ENABLE ROW LEVEL SECURITY;

-- ============ COLIS_HISTORIQUE ============
CREATE TABLE public.colis_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colis_id uuid NOT NULL REFERENCES public.colis(id) ON DELETE CASCADE,
  statut text NOT NULL,
  lieu text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX colis_historique_colis_idx ON public.colis_historique (colis_id);
ALTER TABLE public.colis_historique ENABLE ROW LEVEL SECURITY;

-- ============ TRIGGERS updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER colis_updated_at BEFORE UPDATE ON public.colis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TRIGGER : auto-création profile + rôle ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, telephone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'telephone', '')
  );

  IF LOWER(NEW.email) = 'd.yahiaoui2022@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TRIGGER : historique auto à la création + au changement de statut ============
CREATE OR REPLACE FUNCTION public.log_colis_event()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.colis_historique (colis_id, statut, lieu, description)
    VALUES (NEW.id, NEW.statut, NEW.depart, 'Colis enregistré');
  ELSIF TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    INSERT INTO public.colis_historique (colis_id, statut, lieu, description)
    VALUES (NEW.id, NEW.statut, NULL, 'Mise à jour du statut');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER colis_event_log
  AFTER INSERT OR UPDATE ON public.colis
  FOR EACH ROW EXECUTE FUNCTION public.log_colis_event();

-- ============ RLS : PROFILES ============
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ RLS : USER_ROLES ============
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ RLS : COLIS ============
CREATE POLICY "colis_select_scoped" ON public.colis
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR livreur_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "colis_insert_client" ON public.colis
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "colis_update_scoped" ON public.colis
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (livreur_id = auth.uid() AND public.has_role(auth.uid(), 'livreur'))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (livreur_id = auth.uid() AND public.has_role(auth.uid(), 'livreur'))
  );

CREATE POLICY "colis_delete_admin" ON public.colis
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ RLS : COLIS_HISTORIQUE ============
CREATE POLICY "historique_select_scoped" ON public.colis_historique
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colis c
      WHERE c.id = colis_historique.colis_id
        AND (c.client_id = auth.uid() OR c.livreur_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "historique_insert_scoped" ON public.colis_historique
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colis c
      WHERE c.id = colis_historique.colis_id
        AND (public.has_role(auth.uid(), 'admin') OR c.livreur_id = auth.uid())
    )
  );

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.colis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.colis_historique;
