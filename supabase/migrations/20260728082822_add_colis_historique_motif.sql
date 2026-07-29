-- Motif de statut (ex. "Reporté pour : client absent") — stocké sur la ligne d'historique
-- correspondante, mise à jour juste après l'insertion faite par le trigger log_colis_event.
ALTER TABLE public.colis_historique
  ADD COLUMN IF NOT EXISTS motif text;

DROP POLICY IF EXISTS historique_update_scoped ON public.colis_historique;
CREATE POLICY historique_update_scoped ON public.colis_historique
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colis c
      WHERE c.id = colis_historique.colis_id
        AND (
          has_role(auth.uid(), 'admin')
          OR has_role(auth.uid(), 'admin_operations')
          OR has_role(auth.uid(), 'admin_service_client')
          OR has_role(auth.uid(), 'service_client')
          OR c.livreur_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colis c
      WHERE c.id = colis_historique.colis_id
        AND (
          has_role(auth.uid(), 'admin')
          OR has_role(auth.uid(), 'admin_operations')
          OR has_role(auth.uid(), 'admin_service_client')
          OR has_role(auth.uid(), 'service_client')
          OR c.livreur_id = auth.uid()
        )
    )
  );
