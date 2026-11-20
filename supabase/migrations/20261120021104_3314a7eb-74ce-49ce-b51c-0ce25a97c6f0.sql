-- Mueve las funciones de rol a un esquema privado que no se expone por la API.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.mi_rol() SET SCHEMA private;
ALTER FUNCTION public.es_personal() SET SCHEMA private;
ALTER FUNCTION public.es_gerente() SET SCHEMA private;

CREATE OR REPLACE FUNCTION private.es_personal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(private.mi_rol() IN ('cajero', 'gerente'), false)
$$;

CREATE OR REPLACE FUNCTION private.es_gerente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(private.mi_rol() = 'gerente', false)
$$;

REVOKE ALL ON FUNCTION private.mi_rol() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.es_personal() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.es_gerente() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.mi_rol() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.es_personal() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.es_gerente() TO authenticated, service_role;