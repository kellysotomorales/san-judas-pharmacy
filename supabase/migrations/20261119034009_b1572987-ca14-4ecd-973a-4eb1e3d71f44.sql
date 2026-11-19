GRANT SELECT ON public.productos TO authenticated;
GRANT SELECT ON public.categorias TO authenticated;
GRANT ALL ON public.productos TO service_role;
GRANT ALL ON public.categorias TO service_role;

CREATE POLICY "Personal con sesion puede ver productos"
ON public.productos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Personal con sesion puede ver categorias"
ON public.categorias FOR SELECT TO authenticated USING (true);