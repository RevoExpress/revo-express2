
-- Notifications table for clients
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  colis_id UUID,
  type TEXT NOT NULL DEFAULT 'statut',
  title TEXT NOT NULL,
  message TEXT,
  tracking TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own; admins see all
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Users can mark their own as read (UPDATE)
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Only triggers/admins insert (no client inserts needed)
CREATE POLICY "notifications_insert_admin"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Trigger: when a colis status changes, notify the client
CREATE OR REPLACE FUNCTION public.notify_colis_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Only fire on actual status change for existing colis with a client
  IF TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut AND NEW.client_id IS NOT NULL THEN
    v_title := CASE NEW.statut
      WHEN 'pris-en-charge' THEN 'Colis pris en charge'
      WHEN 'en-cours' THEN 'Livraison en cours'
      WHEN 'livre' THEN 'Colis livré ✓'
      WHEN 'echec' THEN 'Tentative de livraison échouée'
      ELSE 'Mise à jour de votre colis'
    END;

    v_message := CASE NEW.statut
      WHEN 'pris-en-charge' THEN 'Votre colis ' || NEW.tracking || ' a été récupéré par notre livreur.'
      WHEN 'en-cours' THEN 'Votre colis ' || NEW.tracking || ' est en route vers le destinataire.'
      WHEN 'livre' THEN 'Votre colis ' || NEW.tracking || ' a été livré avec succès à ' || NEW.destinataire_nom || '.'
      WHEN 'echec' THEN 'La tentative de livraison du colis ' || NEW.tracking || ' a échoué. Nous allons reprogrammer.'
      ELSE 'Le statut de votre colis ' || NEW.tracking || ' a été mis à jour.'
    END;

    INSERT INTO public.notifications (user_id, colis_id, type, title, message, tracking)
    VALUES (NEW.client_id, NEW.id, 'statut', v_title, v_message, NEW.tracking);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_colis_status
  AFTER UPDATE ON public.colis
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_colis_status_change();
