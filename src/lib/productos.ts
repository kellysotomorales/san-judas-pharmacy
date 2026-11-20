import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { ProductoForm } from "@/lib/inventario";

export type Producto = {
  id: number;
  codigo: string;
  nombre: string;
  categoriaId: number;
  categoria: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  fechaVencimiento: string;
};

export type Categoria = { id: number; nombre: string };

/** Lee los productos reales de la tabla `productos` junto con el nombre de su categoría. */
async function obtenerProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select(
      "id, codigo, nombre, categoria_id, precio, stock, stock_minimo, fecha_vencimiento, categorias(nombre)",
    )
    .order("codigo", { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los productos: ${error.message}`);

  return (data ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoriaId: p.categoria_id,
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

export const categoriasQueryOptions = queryOptions({
  queryKey: ["categorias"],
  queryFn: async (): Promise<Categoria[]> => {
    const { data, error } = await supabase
      .from("categorias")
      .select("id, nombre")
      .order("nombre", { ascending: true });
    if (error) throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
    return data ?? [];
  },
});

function mensajeError(error: { code?: string; message: string }, codigo: string): string {
  if (error.code === "23505") return `Ya existe un producto con el código ${codigo}.`;
  if (error.code === "42501" || error.code === "PGRST116")
    return "No tienes permiso para guardar productos. Solo el gerente puede hacerlo.";
  if (error.code === "23503") return "La categoría elegida no existe.";
  return `No se pudo guardar el producto: ${error.message}`;
}

/** Crea (sin id) o actualiza (con id) un producto. La base de datos solo lo permite al gerente. */
export async function guardarProducto(datos: ProductoForm, id?: number): Promise<void> {
  const fila = {
    codigo: datos.codigo,
    nombre: datos.nombre,
    categoria_id: datos.categoriaId,
    precio: datos.precio,
    stock: datos.stock,
    stock_minimo: datos.stockMinimo,
    fecha_vencimiento: datos.fechaVencimiento,
  };

  const { error } =
    id === undefined
      ? await supabase.from("productos").insert(fila).select("id").single()
      : await supabase.from("productos").update(fila).eq("id", id).select("id").single();

  if (error) throw new Error(mensajeError(error, datos.codigo));
}
