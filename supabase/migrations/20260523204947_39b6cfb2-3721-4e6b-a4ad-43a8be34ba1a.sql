-- Colis : élargir la lecture aux rôles service client
DROP POLICY IF EXISTS colis_select_scoped ON public.colis;
CREATE POLICY colis_select_scoped ON public.colis
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR livreur_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'admin_service_client')
    OR has_role(auth.uid(), 'service_client')
  );

-- Historique colis : même élargissement
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
          OR has_role(auth.uid(), 'admin_service_client')
          OR has_role(auth.uid(), 'service_client')
        )
    )
  );

-- Profiles : permettre au service client de lire les profils des clients
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'admin_service_client')
    OR has_role(auth.uid(), 'service_client')
  );