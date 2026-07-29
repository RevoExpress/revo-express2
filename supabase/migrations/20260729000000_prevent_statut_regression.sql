-- Seuls admin et admin_operations peuvent faire reculer le statut d'un colis
-- (ou le modifier une fois un statut terminal atteint). Les autres rôles pouvant
-- écrire sur colis.statut (livreur) sont limités à une progression normale.
-- Fait au niveau trigger plutôt que RLS : ne dépend pas de la policy UPDATE en
-- place (qui peut varier) et s'applique quel que soit le chemin d'écriture.

CREATE OR REPLACE FUNCTION public.prevent_statut_regression()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rank_old int;
  rank_new int;
BEGIN
  IF NEW.statut IS NOT DISTINCT FROM OLD.statut THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_operations') THEN
    RETURN NEW;
  END IF;

  rank_old := CASE OLD.statut
    WHEN 'en-preparation' THEN 0
    WHEN 'ramasse' THEN 1
    WHEN 'expedie' THEN 2
    WHEN 'en-livraison' THEN 3
    WHEN 'contact-client' THEN 3
    WHEN 'client-injoignable-1' THEN 3
    WHEN 'client-injoignable-2' THEN 3
    WHEN 'client-injoignable-3' THEN 3
    WHEN 'reporte' THEN 3
    WHEN 'livre' THEN 4
    WHEN 'echec-livraison' THEN 4
    WHEN 'retourne-vendeur' THEN 4
    WHEN 'annule' THEN 4
    ELSE 3
  END;

  rank_new := CASE NEW.statut
    WHEN 'en-preparation' THEN 0
    WHEN 'ramasse' THEN 1
    WHEN 'expedie' THEN 2
    WHEN 'en-livraison' THEN 3
    WHEN 'contact-client' THEN 3
    WHEN 'client-injoignable-1' THEN 3
    WHEN 'client-injoignable-2' THEN 3
    WHEN 'client-injoignable-3' THEN 3
    WHEN 'reporte' THEN 3
    WHEN 'livre' THEN 4
    WHEN 'echec-livraison' THEN 4
    WHEN 'retourne-vendeur' THEN 4
    WHEN 'annule' THEN 4
    ELSE 3
  END;

  IF rank_old = 4 THEN
    RAISE EXCEPTION 'Ce colis a un statut final (%). Seul un administrateur ou l''équipe opérations peut le modifier.', OLD.statut;
  END IF;

  IF rank_new < rank_old THEN
    RAISE EXCEPTION 'Retour en arrière de statut interdit (% -> %). Seul un administrateur ou l''équipe opérations peut faire reculer un statut.', OLD.statut, NEW.statut;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_statut_regression ON public.colis;
CREATE TRIGGER trg_prevent_statut_regression
  BEFORE UPDATE ON public.colis
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_statut_regression();
