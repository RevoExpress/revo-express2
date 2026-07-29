-- Phase 2 CRM : fiche client complète (appels / réclamations / notes / RDV dans une seule
-- table flexible plutôt que 4 tables quasi identiques) + système de tâches avec priorités.

CREATE TABLE public.interactions_client (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('appel', 'reclamation', 'note', 'rdv')),
  titre text NOT NULL,
  description text,
  statut text CHECK (statut IN ('ouverte', 'resolue')),
  date_prevue timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_interactions_client_client_id ON public.interactions_client(client_id);

CREATE TABLE public.taches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  client_id uuid REFERENCES auth.users(id),
  titre text NOT NULL,
  priorite text NOT NULL DEFAULT 'normale' CHECK (priorite IN ('urgent', 'haute', 'normale', 'faible')),
  statut text NOT NULL DEFAULT 'a_faire' CHECK (statut IN ('a_faire', 'fait')),
  echeance timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_taches_owner_id ON public.taches(owner_id);

ALTER TABLE public.interactions_client ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;

-- Défense en profondeur (mêmes rôles que le reste de l'espace commercial) : l'accès réel est
-- déjà appliqué côté serveur via supabaseAdmin dans les server functions.
CREATE POLICY interactions_client_scoped ON public.interactions_client
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'directeur_commercial') OR has_role(auth.uid(), 'admin_commercial')
    OR client_id = auth.uid() OR created_by = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'directeur_commercial') OR has_role(auth.uid(), 'admin_commercial')
    OR created_by = auth.uid()
  );

CREATE POLICY taches_scoped ON public.taches
  FOR ALL TO authenticated
  USING (
    owner_id = auth.uid()
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'directeur_commercial') OR has_role(auth.uid(), 'admin_commercial')
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'directeur_commercial') OR has_role(auth.uid(), 'admin_commercial')
  );
