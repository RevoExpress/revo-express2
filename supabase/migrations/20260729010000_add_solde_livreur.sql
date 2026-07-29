-- Solde livreur : argent COD collecté par un livreur à la livraison et pas encore
-- physiquement remis au bureau. Symétrique du couple reversements/solde_a_reverser
-- (qui gère le paiement bureau -> boutique), mais pour le tronçon livreur -> bureau.

CREATE TABLE public.remises_livreur (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livreur_id uuid NOT NULL REFERENCES auth.users(id),
  montant_total numeric NOT NULL,
  nb_colis integer NOT NULL,
  reference text NOT NULL,
  cree_par uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.colis
  ADD COLUMN IF NOT EXISTS remis_livreur_id uuid REFERENCES public.remises_livreur(id);

ALTER TABLE public.remises_livreur ENABLE ROW LEVEL SECURITY;

CREATE POLICY remises_livreur_select_scoped ON public.remises_livreur
  FOR SELECT TO authenticated
  USING (
    livreur_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'admin_operations')
  );

-- Écriture réservée au backend (supabaseAdmin dans creerRemiseLivreur), qui vérifie
-- déjà le rôle admin/admin_operations côté serveur — même schéma de confiance que
-- reversements/updateColisPrice. Pas de policy INSERT pour "authenticated" ici :
-- seule la clé service_role peut écrire, ce qui empêche un livreur d'auto-solder
-- sa propre dette en appelant l'API directement.

CREATE OR REPLACE VIEW public.solde_livreur AS
SELECT
  livreur_id,
  count(*) AS nb_colis,
  sum(COALESCE(prix_colis, 0) + COALESCE(prix, 0)) AS montant_du
FROM public.colis
WHERE statut = 'livre'
  AND livreur_id IS NOT NULL
  AND remis_livreur_id IS NULL
GROUP BY livreur_id;

-- Pas de GRANT à "authenticated" : comme solde_a_reverser, cette vue n'est lue que
-- via supabaseAdmin dans finance.functions.ts, qui applique sa propre vérification
-- de rôle/propriétaire avant de renvoyer les données.
