-- 1) Inventario: el navegador ya no puede cambiar el stock directamente.
--    El gerente sigue editando código, nombre, categoría, precio, stock mínimo y vencimiento.
REVOKE UPDATE ON public.productos FROM authenticated;
GRANT UPDATE (codigo, nombre, categoria_id, precio, stock_minimo, fecha_vencimiento)
  ON public.productos TO authenticated;

-- 2) Clientes: cajero y gerente los consultan (solo lectura).
GRANT SELECT ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.clientes FROM authenticated, anon;
CREATE POLICY "Cajero y gerente ven clientes"
  ON public.clientes FOR SELECT TO authenticated
  USING (private.es_personal());

-- 3) Ventas y detalle: cajero y gerente las consultan; solo se crean con registrar_venta.
GRANT SELECT ON public.ventas TO authenticated;
GRANT SELECT ON public.detalle_ventas TO authenticated;
GRANT ALL ON public.ventas TO service_role;
GRANT ALL ON public.detalle_ventas TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.ventas FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.detalle_ventas FROM authenticated, anon;
CREATE POLICY "Cajero y gerente ven ventas"
  ON public.ventas FOR SELECT TO authenticated
  USING (private.es_personal());
CREATE POLICY "Cajero y gerente ven detalle de ventas"
  ON public.detalle_ventas FOR SELECT TO authenticated
  USING (private.es_personal());

-- 4) Registro de venta en una sola transacción.
--    p_lineas: [{"producto_id": 1, "cantidad": 2}, ...]
--    Precios desde productos, stock bloqueado y descontado; cualquier error deshace toda la venta.
CREATE OR REPLACE FUNCTION public.registrar_venta(p_cliente_id bigint, p_lineas jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta_id bigint;
  v_total numeric(12,2);
  v_fecha timestamptz;
  v_linea record;
  v_producto record;
BEGIN
  IF NOT private.es_personal() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF p_cliente_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = p_cliente_id) THEN
    RAISE EXCEPTION 'Cliente no encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF p_lineas IS NULL OR jsonb_typeof(p_lineas) <> 'array' OR jsonb_array_length(p_lineas) = 0 THEN
    RAISE EXCEPTION 'La venta no tiene productos' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_lineas) e
    WHERE jsonb_typeof(e->'producto_id') <> 'number'
       OR jsonb_typeof(e->'cantidad') <> 'number'
       OR (e->>'cantidad')::numeric <> trunc((e->>'cantidad')::numeric)
       OR (e->>'cantidad')::numeric <= 0
  ) THEN
    RAISE EXCEPTION 'Cantidad no válida' USING ERRCODE = '22023';
  END IF;

  CREATE TEMP TABLE _lineas ON COMMIT DROP AS
    SELECT (e->>'producto_id')::bigint AS producto_id,
           sum((e->>'cantidad')::int)::int AS cantidad
    FROM jsonb_array_elements(p_lineas) e
    GROUP BY 1;

  -- Bloquea los productos en orden y valida existencias antes de escribir nada.
  FOR v_linea IN SELECT * FROM _lineas ORDER BY producto_id LOOP
    SELECT id, nombre, stock INTO v_producto
    FROM public.productos WHERE id = v_linea.producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado' USING ERRCODE = 'P0002';
    END IF;

    IF v_producto.stock < v_linea.cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente'
        USING ERRCODE = 'P0001',
              DETAIL = format('%s: pedido %s, disponible %s', v_producto.nombre, v_linea.cantidad, v_producto.stock);
    END IF;
  END LOOP;

  INSERT INTO public.ventas (cliente_id, total)
  VALUES (p_cliente_id, 0)
  RETURNING id, fecha INTO v_venta_id, v_fecha;

  INSERT INTO public.detalle_ventas (venta_id, producto_id, cantidad, precio_unitario)
  SELECT v_venta_id, l.producto_id, l.cantidad, p.precio
  FROM _lineas l JOIN public.productos p ON p.id = l.producto_id;

  UPDATE public.productos p
  SET stock = p.stock - l.cantidad
  FROM _lineas l
  WHERE p.id = l.producto_id;

  SELECT COALESCE(sum(subtotal), 0) INTO v_total FROM public.detalle_ventas WHERE venta_id = v_venta_id;
  UPDATE public.ventas SET total = v_total WHERE id = v_venta_id;

  DROP TABLE _lineas;

  RETURN jsonb_build_object('venta_id', v_venta_id, 'total', v_total, 'fecha', v_fecha);
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_venta(bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta(bigint, jsonb) TO authenticated, service_role;