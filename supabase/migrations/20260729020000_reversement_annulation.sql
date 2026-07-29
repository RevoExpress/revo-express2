-- Annulation de reversement (traçabilité complète) : on ne supprime jamais la ligne
-- (garde l'historique), on la marque annulée et on relâche les colis qui y étaient liés
-- pour qu'ils réapparaissent dans le solde à reverser.
ALTER TABLE public.reversements
  ADD COLUMN IF NOT EXISTS annule_par uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS annule_at timestamptz;
