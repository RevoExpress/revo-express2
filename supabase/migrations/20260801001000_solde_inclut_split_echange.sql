-- BUG : l'argent encaissé sur les colis SPLIT (SPL) et ÉCHANGE (ECH) n'était jamais reversé.
-- La vue solde_a_reverser — comme les écrans Finance — ne retenait que type_colis = 'REV'.
-- Conséquence : un colis SPL livré et encaissé n'apparaissait ni dans « Mon solde » côté client,
-- ni dans la liste Finance, et son montant restait indéfiniment chez Revo sans trace.
-- Vérifié : sur 14 000 DA encaissés (REV 5 000 + SPL 7 000 + ECH 2 000), seuls 5 000 DA
-- remontaient.
--
-- Le type de colis décrit COMMENT la livraison se déroule, pas SI l'argent est dû : dès lors
-- que le colis est livré et l'encaissement confirmé, la somme appartient au commerçant.
-- On retire donc la restriction de type. Les autres conditions (livré, encaissé, pas déjà
-- reversé, non archivé) et la formule du montant sont conservées à l'identique.
-- NB : pas de cast sur count(*). La vue existante expose nb_colis en bigint (type naturel de
-- count) et CREATE OR REPLACE VIEW interdit de changer le type d'une colonne existante.
CREATE OR REPLACE VIEW public.solde_a_reverser AS
SELECT
  client_id,
  count(*) AS nb_colis,
  sum(
    CASE WHEN frais_payes_par_expediteur
      THEN COALESCE(prix_colis, 0) - COALESCE(prix, 0)
      ELSE COALESCE(prix_colis, 0)
    END
  ) AS montant_du
FROM public.colis
WHERE statut = 'livre'
  AND cod_encaisse = true
  AND reversement_id IS NULL
  AND archive = false
  AND client_id IS NOT NULL
GROUP BY client_id;
