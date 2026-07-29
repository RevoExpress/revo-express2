-- Objectif mensuel de CA pour un commercial, affiché avec une barre de progression sur son
-- dashboard. NULL = pas d'objectif défini (le dashboard invite alors à en définir un plutôt
-- que d'afficher une barre à 0%, ce qui serait trompeur).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS objectif_ca_mensuel numeric;
