ALTER FUNCTION public.dashboard_gerencial() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.dashboard_gerencial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_gerencial() TO authenticated;