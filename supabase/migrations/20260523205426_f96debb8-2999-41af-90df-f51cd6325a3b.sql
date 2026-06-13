DROP POLICY IF EXISTS colis_delete_admin ON public.colis;
DROP POLICY IF EXISTS colis_delete_owner ON public.colis;

CREATE POLICY colis_delete_owner ON public.colis
  FOR DELETE TO authenticated
  USING (client_id = auth.uid());