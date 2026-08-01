-- BUG : un client ne pouvait PAS modifier son propre colis. La policy UPDATE ne couvrait que
-- admin / admin_operations / livreur assigné — jamais le propriétaire. Comme PostgREST ne
-- renvoie AUCUNE erreur quand RLS bloque une mise à jour (il retourne simplement 0 ligne
-- affectée), l'interface affichait « Colis mis à jour » alors que rien n'était enregistré.
-- Incohérence supplémentaire : le propriétaire pouvait déjà SUPPRIMER son colis
-- (policy colis_delete_owner) mais pas le modifier.
--
-- On aligne l'UPDATE sur ce que l'interface autorise déjà (commander.tsx / canEditForm) :
-- le propriétaire peut modifier tant que le colis est encore « en préparation ».
-- Le WITH CHECK reprend les mêmes conditions : un client ne peut donc ni transférer son colis
-- à un autre compte, ni faire avancer lui-même le statut.

DROP POLICY IF EXISTS colis_update_scoped ON public.colis;

CREATE POLICY colis_update_scoped ON public.colis
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'admin_operations')
    OR (livreur_id = auth.uid() AND has_role(auth.uid(), 'livreur'))
    OR (client_id = auth.uid() AND statut = 'en-preparation')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'admin_operations')
    OR (livreur_id = auth.uid() AND has_role(auth.uid(), 'livreur'))
    OR (client_id = auth.uid() AND statut = 'en-preparation')
  );
