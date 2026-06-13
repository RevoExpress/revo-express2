
-- Add 'commercial' role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'commercial';

-- Extend profiles for client/shop info
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nom_boutique text,
  ADD COLUMN IF NOT EXISTS adresse text,
  ADD COLUMN IF NOT EXISTS wilaya text;
