import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Producto = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  fechaVencimiento: string;
};

/** Lee los productos reales de la tabla `productos` junto con el nombre de su categoría. */
async function obtenerProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select("id, codigo, nombre, precio, stock, stock_minimo, fecha_vencimiento, categorias(nombre)")
    .order("codigo", { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los productos: ${error.message}`);

  return (data ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoria: p.categorias?.nombre ?? "Sin categoría",
    precio: Number(p.precio),
    stock: p.stock,
    stockMinimo: p.stock_minimo,
    fechaVencimiento: p.fecha_vencimiento,
  }));
}

export const productosQueryOptions = queryOptions({
  queryKey: ["productos"],
  queryFn: obtenerProductos,
});
