-- Add two new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_service_client';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'service_client';