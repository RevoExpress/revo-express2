-- La table "prospects" et la vue "prospects_a_relancer" étaient utilisées activement par
-- l'app (src/lib/prospection.functions.ts) mais n'avaient jamais été créées via une migration
-- versionnée (créées à la main dans le dashboard Supabase). On les documente ici pour que le
-- schéma soit reproductible, SANS rien casser sur les données déjà en place (CREATE TABLE IF
-- NOT EXISTS = no-op sur la base actuelle qui a déjà la table).
CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_id uuid NOT NULL REFERENCES auth.users(id),
  nom_boutique text NOT NULL,
  contact_nom text,
  telephone text,
  email text,
  wilaya text,
  commune text,
  etape text NOT NULL DEFAULT 'prospect',
  note text,
  derniere_relance timestamptz NOT NULL DEFAULT now(),
  converti_client_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Refonte du pipeline : 5 étapes -> 7 étapes alignées sur le brief produit (Prospect / Premier
-- contact / Négociation / Devis envoyé / En attente / Contrat signé / Client actif), + "perdu"
-- comme état terminal hors flux principal. Remap des données existantes AVANT la contrainte,
-- pour ne rien casser (2 lignes en prod au moment de cette migration).
UPDATE public.prospects SET etape = CASE etape
  WHEN 'a_contacter' THEN 'prospect'
  WHEN 'en_discussion' THEN 'negociation'
  WHEN 'en_test' THEN 'devis_envoye'
  WHEN 'gagne' THEN 'client_actif'
  WHEN 'perdu' THEN 'perdu'
  ELSE etape
END
WHERE etape IN ('a_contacter', 'en_discussion', 'en_test', 'gagne');

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_etape_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_etape_check
  CHECK (etape IN ('prospect', 'premier_contact', 'negociation', 'devis_envoye', 'en_attente', 'contrat_signe', 'client_actif', 'perdu'));

CREATE OR REPLACE VIEW public.prospects_a_relancer AS
SELECT *
FROM public.prospects
WHERE etape NOT IN ('client_actif', 'perdu')
  AND derniere_relance < now() - interval '5 days';

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- L'accès est déjà entièrement contrôlé côté serveur (prospection.functions.ts écrit/lit via
-- supabaseAdmin, jamais via le client anon/authenticated), donc ces policies sont une défense
-- en profondeur qui matche exactement la logique déjà en place (canCommercial/seeAllProspects),
-- pas le mécanisme d'application principal.
DROP POLICY IF EXISTS prospects_select_scoped ON public.prospects;
CREATE POLICY prospects_select_scoped ON public.prospects
  FOR SELECT TO authenticated
  USING (
    commercial_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'directeur_commercial')
    OR has_role(auth.uid(), 'admin_commercial')
  );

DROP POLICY IF EXISTS prospects_write_scoped ON public.prospects;
CREATE POLICY prospects_write_scoped ON public.prospects
  FOR ALL TO authenticated
  USING (
    commercial_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'directeur_commercial')
    OR has_role(auth.uid(), 'admin_commercial')
  )
  WITH CHECK (
    commercial_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'directeur_commercial')
    OR has_role(auth.uid(), 'admin_commercial')
  );
