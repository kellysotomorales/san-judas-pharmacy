-- Funciones de rol: leen usuario_roles sin exponer la tabla y sin recursión en RLS.
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.nombre::text
  FROM public.usuario_roles ur
  JOIN public.roles r ON r.id = ur.rol_id
  WHERE ur.usuario_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.es_personal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.mi_rol() IN ('cajero', 'gerente'), false)
$$;

CREATE OR REPLACE FUNCTION public.es_gerente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.mi_rol() = 'gerente', false)
$$;

REVOKE ALL ON FUNCTION public.mi_rol() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.es_personal() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.es_gerente() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_rol() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.es_personal() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.es_gerente() TO authenticated, service_role;

-- productos: cajero y gerente consultan; solo el gerente crea y modifica. Sin borrado.
DROP POLICY IF EXISTS "Personal con sesion puede ver productos" ON public.productos;
GRANT SELECT, INSERT, UPDATE ON public.productos TO authenticated;
REVOKE DELETE ON public.productos FROM authenticated;
REVOKE ALL ON public.productos FROM anon;
CREATE POLICY "Cajero y gerente ven productos"
  ON public.productos FOR SELECT TO authenticated
  USING (public.es_personal());
CREATE POLICY "Gerente crea productos"
  ON public.productos FOR INSERT TO authenticated
  WITH CHECK (public.es_gerente());
CREATE POLICY "Gerente modifica productos"
  ON public.productos FOR UPDATE TO authenticated
  USING (public.es_gerente())
  WITH CHECK (public.es_gerente());

-- categorias: solo lectura para cajero y gerente.
DROP POLICY IF EXISTS "Personal con sesion puede ver categorias" ON public.categorias;
REVOKE ALL ON public.categorias FROM anon;
CREATE POLICY "Cajero y gerente ven categorias"
  ON public.categorias FOR SELECT TO authenticated
  USING (public.es_personal());

-- roles: catálogo de solo lectura para cajero y gerente.
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.roles FROM authenticated, anon;
CREATE POLICY "Cajero y gerente ven roles"
  ON public.roles FOR SELECT TO authenticated
  USING (public.es_personal());

-- usuario_roles: cada usuario ve solo su propio rol. Nadie puede asignarse ni cambiar roles desde la app.
GRANT SELECT ON public.usuario_roles TO authenticated;
GRANT ALL ON public.usuario_roles TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.usuario_roles FROM authenticated, anon;
CREATE POLICY "Cada usuario ve su propio rol"
  ON public.usuario_roles FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());