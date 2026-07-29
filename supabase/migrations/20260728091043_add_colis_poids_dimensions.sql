-- Tarification de surpoids : 5 premiers kg gratuits, puis 50 DA/kg. Le poids réel (balance)
-- et/ou les dimensions (converties en poids volumétrique côté app) sont stockés pour audit ;
-- frais_surpoids est le montant déjà inclus dans colis.prix (transparence sur le bordereau).
ALTER TABLE public.colis
  ADD COLUMN IF NOT EXISTS poids_kg numeric,
  ADD COLUMN IF NOT EXISTS longueur_cm numeric,
  ADD COLUMN IF NOT EXISTS largeur_cm numeric,
  ADD COLUMN IF NOT EXISTS hauteur_cm numeric,
  ADD COLUMN IF NOT EXISTS frais_surpoids numeric NOT NULL DEFAULT 0;
