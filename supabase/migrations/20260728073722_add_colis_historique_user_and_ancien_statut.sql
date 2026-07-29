-- Historique de statut : on ne savait ni QUI avait changé un statut, ni depuis QUEL statut —
-- chaque ligne ne portait que "Mise à jour du statut", sans acteur ni transition.
ALTER TABLE public.colis_historique
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ancien_statut text;

CREATE OR REPLACE FUNCTION public.log_colis_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.colis_historique (colis_id, statut, lieu, description, user_id)
    VALUES (NEW.id, NEW.statut, NEW.depart, 'Colis enregistré', auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    INSERT INTO public.colis_historique (colis_id, statut, ancien_statut, lieu, description, user_id)
    VALUES (NEW.id, NEW.statut, OLD.statut, NULL, 'Mise à jour du statut', auth.uid());
  END IF;
  RETURN NEW;
END $function$;

-- Bug préexistant découvert au passage : le rôle admin_operations n'était jamais inclus dans ces
-- deux policies (contrairement à admin_service_client/service_client, ajoutés en 20260523204947) —
-- un Directeur des Opérations pur ne pouvait donc rien lire sur /operations via ces requêtes RLS.
DROP POLICY IF EXISTS colis_select_scoped ON public.colis;
CREATE POLICY colis_select_scoped ON public.colis
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR livreur_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'admin_operations')
    OR has_role(auth.uid(), 'admin_service_client')
    OR has_role(auth.uid(), 'service_client')
  );

DROP POLICY IF EXISTS historique_select_scoped ON public.colis_historique;
CREATE POLICY historique_select_scoped ON public.colis_historique
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colis c
      WHERE c.id = colis_historique.colis_id
        AND (
          c.client_id = auth.uid()
          OR c.livreur_id = auth.uid()
          OR has_role(auth.uid(), 'admin')
          OR has_role(auth.uid(), 'admin_operations')
          OR has_role(auth.uid(), 'admin_service_client')
          OR has_role(auth.uid(), 'service_client')
        )
    )
  );
