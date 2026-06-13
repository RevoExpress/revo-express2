ALTER TABLE public.colis
ADD COLUMN IF NOT EXISTS type_livraison TEXT NOT NULL DEFAULT 'standard'
CHECK (type_livraison IN ('standard', 'urgent'));