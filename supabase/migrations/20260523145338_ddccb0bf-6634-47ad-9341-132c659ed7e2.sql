
-- Fix search_path on trigger helpers
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.log_colis_event() SET search_path = public;

-- handle_new_user is only called by trigger as superuser; revoke from everyone
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role / get_user_role : used in RLS, need authenticated; revoke from anon + public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;

-- set_updated_at / log_colis_event : trigger functions only
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_colis_event() FROM PUBLIC, anon, authenticated;
