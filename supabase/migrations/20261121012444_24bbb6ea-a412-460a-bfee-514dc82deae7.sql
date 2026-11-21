-- SQL DEFINITIVO PENDIENTE DE AUTORIZACIÓN. NO EJECUTADO.
-- 30 ventas ficticias: 10 en septiembre, 10 en octubre y 10 en noviembre hasta el día 20.
-- Los números cliente_orden son posiciones de clientes consultados, NUNCA sus IDs.
-- Los productos se resuelven por código único; precios e IDs se leen de las tablas actuales.
-- Al repetir, se conservan precios ya guardados aunque el precio actual cambie.
-- No llama registrar_venta; no cambia RLS, credenciales, funciones de venta ni funciones de rol.
BEGIN;
SET LOCAL search_path=pg_catalog,public;
DO $carga$
DECLARE r record; v_cliente_id bigint; v_existente bigint; v_id bigint; v_n integer:=0;
BEGIN
 PERFORM pg_advisory_xact_lock(2026091120);
 LOCK TABLE public.productos,public.clientes,public.ventas,public.detalle_ventas IN SHARE ROW EXCLUSIVE MODE;
 IF to_regprocedure('private.es_gerente()') IS NULL THEN RAISE EXCEPTION 'Falta private.es_gerente()'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('productos','ventas','detalle_ventas') AND NOT t.tgisinternal AND t.tgenabled<>'D') THEN RAISE EXCEPTION 'Revisar disparadores antes de cargar históricos; no se desactivarán'; END IF;
 CREATE TEMP TABLE seed_historico(fecha timestamptz PRIMARY KEY,cliente_orden integer,lineas jsonb) ON COMMIT DROP;
 INSERT INTO seed_historico VALUES
('2026-09-02 10:11:26-06',1,'[["MED001",2]]'),
('2026-09-04 11:12:26-06',2,'[["MED002",2],["MED004",1]]'),
('2026-09-06 12:13:26-06',3,'[["MED003",1],["MED005",2],["HIG002",1]]'),
('2026-09-08 13:14:26-06',4,'[["HIG003",2]]'),
('2026-09-10 14:15:26-06',5,'[["HIG004",1],["HIG005",1]]'),
('2026-09-12 10:16:26-06',1,'[["MED001",3],["MED002",1],["SUP001",1]]'),
('2026-09-14 11:17:26-06',2,'[["HIG001",1]]'),
('2026-09-16 12:18:26-06',3,'[["SUP002",1],["MED004",2]]'),
('2026-09-18 13:19:26-06',4,'[["SUP003",1],["MED005",1],["HIG002",2]]'),
('2026-09-20 14:20:26-06',5,'[["SUP001",2]]'),
('2026-10-02 10:11:26-06',2,'[["MED001",1]]'),
('2026-10-04 11:12:26-06',3,'[["MED002",3],["MED004",2]]'),
('2026-10-06 12:13:26-06',4,'[["MED003",2],["MED005",1],["HIG003",1]]'),
('2026-10-08 13:14:26-06',5,'[["HIG002",2]]'),
('2026-10-10 14:15:26-06',1,'[["HIG004",2],["HIG005",1]]'),
('2026-10-12 10:16:26-06',2,'[["MED001",2],["MED002",2],["SUP001",1]]'),
('2026-10-14 11:17:26-06',3,'[["HIG001",1]]'),
('2026-10-16 12:18:26-06',4,'[["SUP002",1],["MED004",1]]'),
('2026-10-18 13:19:26-06',5,'[["SUP003",1],["MED005",2],["HIG003",2]]'),
('2026-10-20 14:20:26-06',1,'[["SUP001",1]]'),
('2026-11-02 10:11:26-06',3,'[["MED001",3]]'),
('2026-11-04 11:12:26-06',4,'[["MED002",1],["MED004",2]]'),
('2026-11-06 12:13:26-06',5,'[["MED003",1],["MED005",3],["HIG002",1]]'),
('2026-11-08 13:14:26-06',1,'[["HIG003",1]]'),
('2026-11-10 14:15:26-06',2,'[["HIG004",1],["HIG005",2]]'),
('2026-11-12 10:16:26-06',3,'[["MED001",1],["MED002",3],["SUP001",2]]'),
('2026-11-14 11:17:26-06',4,'[["HIG001",1]]'),
('2026-11-16 12:18:26-06',5,'[["SUP002",1],["MED004",1]]'),
('2026-11-18 13:19:26-06',1,'[["SUP005",1],["MED005",1],["HIG002",2]]'),
('2026-11-20 14:20:26-06',2,'[["SUP001",3]]');
 -- Selección determinista de clientes existentes con sus IDs reales.
 CREATE TEMP TABLE seed_clientes ON COMMIT DROP AS
 SELECT id,row_number() OVER(ORDER BY id) cliente_orden FROM public.clientes;
 IF EXISTS(SELECT 1 FROM seed_historico s LEFT JOIN seed_clientes c USING(cliente_orden) WHERE c.id IS NULL) THEN RAISE EXCEPTION 'No hay suficientes clientes existentes'; END IF;
 -- Evitar asociaciones ambiguas si se pierde la unicidad de un código.
 IF EXISTS(SELECT e->>0 FROM seed_historico s CROSS JOIN LATERAL jsonb_array_elements(s.lineas) e LEFT JOIN public.productos p ON p.codigo=e->>0 GROUP BY e->>0 HAVING count(DISTINCT p.id)<>1) THEN RAISE EXCEPTION 'Código de producto inexistente o ambiguo'; END IF;
 IF (SELECT count(*) FROM seed_historico)<>30 OR EXISTS(SELECT 1 FROM seed_historico GROUP BY date_trunc('month',fecha AT TIME ZONE 'America/Managua') HAVING count(*)<>10) THEN RAISE EXCEPTION 'Distribución histórica incorrecta'; END IF;
 CREATE TEMP TABLE seed_pendiente(fecha timestamptz PRIMARY KEY,cliente_id bigint,lineas jsonb,venta_id bigint) ON COMMIT DROP;
 FOR r IN SELECT * FROM seed_historico ORDER BY fecha LOOP
  SELECT id INTO v_cliente_id FROM seed_clientes WHERE cliente_orden=r.cliente_orden;
  -- La fecha reservada identifica cada venta semilla sin columnas o tablas permanentes nuevas.
  SELECT id INTO v_existente FROM public.ventas WHERE fecha=r.fecha;
  IF FOUND THEN
   IF (SELECT count(*) FROM public.ventas WHERE fecha=r.fecha)<>1
    OR (SELECT cliente_id FROM public.ventas WHERE id=v_existente)<>v_cliente_id
    OR (SELECT count(*) FROM public.detalle_ventas WHERE venta_id=v_existente)<>jsonb_array_length(r.lineas)
    OR EXISTS(SELECT p.codigo::text,d.cantidad FROM public.detalle_ventas d JOIN public.productos p ON p.id=d.producto_id WHERE d.venta_id=v_existente EXCEPT SELECT e->>0,(e->>1)::integer FROM jsonb_array_elements(r.lineas) e)
    OR EXISTS(SELECT e->>0,(e->>1)::integer FROM jsonb_array_elements(r.lineas) e EXCEPT SELECT p.codigo::text,d.cantidad FROM public.detalle_ventas d JOIN public.productos p ON p.id=d.producto_id WHERE d.venta_id=v_existente)
    OR EXISTS(SELECT 1 FROM public.detalle_ventas WHERE venta_id=v_existente AND (precio_unitario<=0 OR subtotal IS DISTINCT FROM cantidad*precio_unitario))
    OR (SELECT total FROM public.ventas WHERE id=v_existente) IS DISTINCT FROM (SELECT sum(subtotal) FROM public.detalle_ventas WHERE venta_id=v_existente)
   THEN RAISE EXCEPTION 'Conflicto con venta existente: %; no se modificó',r.fecha; END IF;
  ELSE INSERT INTO seed_pendiente(fecha,cliente_id,lineas) VALUES(r.fecha,v_cliente_id,r.lineas); END IF;
 END LOOP;
 -- Precio actual y código -> ID real. No hay precios manuales en los datos semilla.
 CREATE TEMP TABLE seed_lineas ON COMMIT DROP AS
 SELECT s.fecha,p.id producto_id,p.codigo,(e->>1)::integer cantidad,p.precio precio_unitario,p.fecha_vencimiento
 FROM seed_pendiente s CROSS JOIN LATERAL jsonb_array_elements(s.lineas) e JOIN public.productos p ON p.codigo=e->>0;
 IF EXISTS(SELECT 1 FROM seed_lineas WHERE cantidad<=0 OR precio_unitario<=0 OR fecha_vencimiento<(fecha AT TIME ZONE 'America/Managua')::date) THEN RAISE EXCEPTION 'Cantidad, precio o vencimiento no válido'; END IF;
 CREATE TEMP TABLE seed_demanda ON COMMIT DROP AS
 SELECT p.id,p.stock stock_antes,sum(l.cantidad)::integer cantidad FROM seed_lineas l JOIN public.productos p ON p.id=l.producto_id GROUP BY p.id,p.stock;
 IF EXISTS(SELECT 1 FROM seed_demanda WHERE stock_antes<cantidad) THEN RAISE EXCEPTION 'Stock insuficiente para históricos: se rechaza toda la carga'; END IF;
 FOR r IN SELECT * FROM seed_pendiente ORDER BY fecha LOOP
  INSERT INTO public.ventas(cliente_id,fecha,total) SELECT r.cliente_id,r.fecha,sum(cantidad*precio_unitario) FROM seed_lineas WHERE fecha=r.fecha RETURNING id INTO v_id;
  INSERT INTO public.detalle_ventas(venta_id,producto_id,cantidad,precio_unitario) SELECT v_id,producto_id,cantidad,precio_unitario FROM seed_lineas WHERE fecha=r.fecha;
  UPDATE seed_pendiente SET venta_id=v_id WHERE fecha=r.fecha;
  v_n:=v_n+1;
 END LOOP;
 -- Un único descuento agregado SOLO para ventas nuevas.
 UPDATE public.productos p SET stock=p.stock-d.cantidad FROM seed_demanda d WHERE p.id=d.id;
 IF EXISTS(SELECT 1 FROM seed_demanda d JOIN public.productos p ON p.id=d.id WHERE p.stock<>d.stock_antes-d.cantidad OR p.stock<0) THEN RAISE EXCEPTION 'Inventario inconsistente: revertir carga'; END IF;
 IF EXISTS(SELECT 1 FROM seed_pendiente s JOIN public.ventas v ON v.id=s.venta_id WHERE v.total IS DISTINCT FROM (SELECT sum(subtotal) FROM public.detalle_ventas WHERE venta_id=v.id)) THEN RAISE EXCEPTION 'Total de venta inconsistente: revertir carga'; END IF;
 RAISE NOTICE 'Ventas nuevas: %, ventas históricas existentes: %',v_n,30-v_n;
END $carga$;

-- Consulta gerencial nueva pendiente; no sustituye funciones preexistentes de venta o rol.
-- Mantiene políticas RLS operativas y verifica el gerente dentro de cada llamada.
CREATE OR REPLACE FUNCTION public.dashboard_gerencial() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_hoy date:=(now() AT TIME ZONE 'America/Managua')::date; v_inicio timestamptz; v_fin timestamptz; v_resultado jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT private.es_gerente() THEN RAISE EXCEPTION 'Información exclusiva del gerente' USING ERRCODE='42501'; END IF;
 v_inicio:=date_trunc('month',v_hoy::timestamp) AT TIME ZONE 'America/Managua';
 v_fin:=(date_trunc('month',v_hoy::timestamp)+interval '1 month') AT TIME ZONE 'America/Managua';
 SELECT jsonb_build_object(
  'hoy',v_hoy,'mes',to_char(v_hoy,'YYYY-MM'),
  'ventasMes',coalesce(sum(total),0),'cantidadVentasMes',count(*),'ticketPromedio',coalesce(round(avg(total),2),0),
  'productosPorVencer',(SELECT count(*) FROM public.productos WHERE fecha_vencimiento >= v_hoy AND fecha_vencimiento < v_hoy+30),
  'meses',(SELECT jsonb_agg(jsonb_build_object('mes',to_char(m,'YYYY-MM'),'total',(SELECT coalesce(sum(v.total),0) FROM public.ventas v WHERE v.fecha>=m AT TIME ZONE 'America/Managua' AND v.fecha<(m+interval '1 month') AT TIME ZONE 'America/Managua'),'cantidad',(SELECT count(*) FROM public.ventas v WHERE v.fecha>=m AT TIME ZONE 'America/Managua' AND v.fecha<(m+interval '1 month') AT TIME ZONE 'America/Managua')) ORDER BY m) FROM generate_series(timestamp '2026-09-01',timestamp '2026-11-01',interval '1 month') m),
  'inicioRotacion',v_hoy-89,'finRotacion',v_hoy,
  'rotacion',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.unidades,r.codigo),'[]') FROM (
   SELECT p.id,p.codigo,p.nombre,p.stock,coalesce(u.unidades,0) unidades,CASE WHEN coalesce(u.unidades,0)<=3 THEN 'Baja rotación' ELSE 'Rotación normal' END clasificacion
   FROM public.productos p LEFT JOIN (SELECT d.producto_id,sum(d.cantidad) unidades FROM public.detalle_ventas d JOIN public.ventas v ON v.id=d.venta_id WHERE v.fecha>=(v_hoy-89)::timestamp AT TIME ZONE 'America/Managua' AND v.fecha<(v_hoy+1)::timestamp AT TIME ZONE 'America/Managua' GROUP BY d.producto_id) u ON u.producto_id=p.id
   ) r)
 ) INTO v_resultado FROM public.ventas WHERE fecha>=v_inicio AND fecha<v_fin;
 RETURN v_resultado;
END $$;
REVOKE ALL ON FUNCTION public.dashboard_gerencial() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_gerencial() TO authenticated;

-- Comprobación de la carga, sin crear ventas adicionales.
SELECT to_char(v.fecha AT TIME ZONE 'America/Managua','YYYY-MM') mes,
       count(*) ventas_semilla,sum(v.total) total
FROM public.ventas v JOIN seed_historico s ON s.fecha=v.fecha GROUP BY 1 ORDER BY 1;
COMMIT;