import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { lineasParaRegistrar, type LineaVenta } from "@/lib/carrito";

export type Cliente = { id: number; nombre: string; telefono: string | null };

export const clientesQueryOptions = queryOptions({
  queryKey: ["clientes"],
  queryFn: async (): Promise<Cliente[]> => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, telefono")
      .order("nombre", { ascending: true });
    if (error) throw new Error(`No se pudieron cargar los clientes: ${error.message}`);
    return data ?? [];
  },
});

export type VentaRegistrada = {
  ventaId: number;
  total: number;
  fecha: string;
  lineas: { codigo: string; nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
};

/** La base de datos rechazó la venta completa (sin guardar nada) por una regla de inventario. */
export class VentaRechazadaError extends Error {
  constructor(
    message: "Stock insuficiente" | "Producto vencido",
    public detalle: string | undefined,
  ) {
    super(message);
    this.name = "VentaRechazadaError";
  }
}

/**
 * Registra la venta con la función `registrar_venta` de la base de datos: una sola transacción
 * que toma los precios de `productos`, rechaza productos vencidos o sin stock, crea la venta y su detalle y descuenta el stock.
 */
export async function registrarVenta(clienteId: number, lineas: LineaVenta[]): Promise<VentaRegistrada> {
  const { data, error } = await supabase.rpc("registrar_venta", {
    p_cliente_id: clienteId,
    p_lineas: lineasParaRegistrar(lineas),
  });

  if (error) {
    if (error.message === "Stock insuficiente" || error.message === "Producto vencido")
      throw new VentaRechazadaError(error.message, error.details || undefined);
    if (error.code === "42501") throw new Error("Tu cuenta no tiene permiso para registrar ventas.");
    throw new Error(`No se pudo registrar la venta: ${error.message}`);
  }

  const resultado = data as { venta_id: number; total: number; fecha: string };

  // Vuelve a leer el detalle guardado para confirmar lo que quedó registrado.
  const { data: detalle, error: errorDetalle } = await supabase
    .from("detalle_ventas")
    .select("cantidad, precio_unitario, subtotal, productos(codigo, nombre)")
    .eq("venta_id", resultado.venta_id)
    .order("id", { ascending: true });
  if (errorDetalle) throw new Error(`La venta se registró, pero no se pudo leer su detalle: ${errorDetalle.message}`);

  return {
    ventaId: resultado.venta_id,
    total: Number(resultado.total),
    fecha: resultado.fecha,
    lineas: (detalle ?? []).map((d) => ({
      codigo: d.productos?.codigo ?? "",
      nombre: d.productos?.nombre ?? "",
      cantidad: d.cantidad,
      precioUnitario: Number(d.precio_unitario),
      subtotal: Number(d.subtotal),
    })),
  };
}
