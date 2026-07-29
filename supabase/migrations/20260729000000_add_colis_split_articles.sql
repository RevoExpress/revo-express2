-- Colis "Split" : la commande contient 2 articles, le client peut n'en accepter qu'un des deux
-- à la livraison. On stocke le prix de chaque article séparément, et si chacun a été
-- effectivement livré/accepté — pour recalculer le montant réel à encaisser (au lieu du prix
-- combiné initial, qui suppose que les deux seront acceptés).
ALTER TABLE public.colis
  ADD COLUMN IF NOT EXISTS split_article1_nom text,
  ADD COLUMN IF NOT EXISTS split_article1_prix numeric,
  ADD COLUMN IF NOT EXISTS split_article1_livre boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS split_article2_nom text,
  ADD COLUMN IF NOT EXISTS split_article2_prix numeric,
  ADD COLUMN IF NOT EXISTS split_article2_livre boolean NOT NULL DEFAULT true;
