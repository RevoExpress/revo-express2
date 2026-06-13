CREATE OR REPLACE FUNCTION public.log_colis_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.colis_historique (colis_id, statut, lieu, description)
    VALUES (NEW.id, NEW.statut, NEW.depart, 'Colis enregistré');
  ELSIF TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    INSERT INTO public.colis_historique (colis_id, statut, lieu, description)
    VALUES (NEW.id, NEW.statut, NULL, 'Mise à jour du statut');
  END IF;
  RETURN NEW;
END $function$;