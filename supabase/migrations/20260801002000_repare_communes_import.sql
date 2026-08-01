-- Réparation des colis créés par l'ancien import Excel : celui-ci écrivait la commune de
-- destination dans destinataire_wilaya et laissait destinataire_commune vide, alors que le
-- formulaire /commander remplit correctement les deux (wilaya = « Alger », commune = la commune).
-- Ces colis n'affichaient donc pas leur commune et échappaient au filtre par commune.
-- Le code de l'import est corrigé ; ce script remet les données déjà en base d'aplomb.
--
-- Sûr par construction : Revo ne dessert que la wilaya d'Alger, donc toute valeur de
-- destinataire_wilaya différente de « Alger » est en réalité une commune. La condition
-- destinataire_commune IS NULL garantit qu'aucune commune correctement saisie n'est écrasée
-- (vérifié avant exécution : 14 lignes concernées, 0 possédant déjà une commune).
UPDATE public.colis
SET destinataire_commune = destinataire_wilaya,
    destinataire_wilaya  = 'Alger'
WHERE destinataire_wilaya IS NOT NULL
  AND destinataire_wilaya <> 'Alger'
  AND destinataire_commune IS NULL;
