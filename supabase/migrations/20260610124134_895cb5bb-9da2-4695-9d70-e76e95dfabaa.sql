CREATE TABLE public.livreur_positions (
  livreur_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  speed double precision,
  heading double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.livreur_positions TO authenticated;
GRANT ALL ON public.livreur_positions TO service_role;

ALTER TABLE public.livreur_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "livreur_positions_self_manage"
ON public.livreur_positions
FOR ALL
TO authenticated
USING (auth.uid() = livreur_id)
WITH CHECK (auth.uid() = livreur_id);

CREATE POLICY "livreur_positions_admin_read"
ON public.livreur_positions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'admin_operations')
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.livreur_positions;