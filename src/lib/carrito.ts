/** Reglas del carrito de una venta. Los precios vienen de la tabla `productos`; la base de datos recalcula todo al registrar. */

export type LineaVenta = {
  productoId: number;
  codigo: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  stockDisponible: number;
};

type ProductoVendible = {
  id: number;
  codigo: string;
  nombre: string;
  precio: number;
  stock: number;
};

/** Agrega un producto; si ya está en la venta, suma una unidad a su línea. */
export function agregarProducto(lineas: LineaVenta[], producto: ProductoVendible): LineaVenta[] {
  if (lineas.some((l) => l.productoId === producto.id)) {
    return lineas.map((l) => (l.productoId === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l));
  }
  return [
    ...lineas,
    {
      productoId: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      precioUnitario: producto.precio,
      cantidad: 1,
      stockDisponible: producto.stock,
    },
  ];
}

/** Cambia la cantidad de una línea; siempre es un entero de al menos 1. */
export function cambiarCantidad(lineas: LineaVenta[], productoId: number, cantidad: number): LineaVenta[] {
  const valida = Number.isFinite(cantidad) ? Math.max(1, Math.floor(cantidad)) : 1;
  return lineas.map((l) => (l.productoId === productoId ? { ...l, cantidad: valida } : l));
}

export function quitarLinea(lineas: LineaVenta[], productoId: number): LineaVenta[] {
  return lineas.filter((l) => l.productoId !== productoId);
}

const centavos = (monto: number) => Math.round(monto * 100);

export function subtotalLinea(linea: Pick<LineaVenta, "precioUnitario" | "cantidad">): number {
  return (centavos(linea.precioUnitario) * linea.cantidad) / 100;
}

export function totalVenta(lineas: Pick<LineaVenta, "precioUnitario" | "cantidad">[]): number {
  return lineas.reduce((suma, l) => suma + centavos(l.precioUnitario) * l.cantidad, 0) / 100;
}

export function excedeStock(linea: Pick<LineaVenta, "cantidad" | "stockDisponible">): boolean {
  return linea.cantidad > linea.stockDisponible;
}

/** Lo que se envía a la base de datos: solo producto y cantidad, nunca precios. */
export function lineasParaRegistrar(lineas: LineaVenta[]): { producto_id: number; cantidad: number }[] {
  return lineas.map((l) => ({ producto_id: l.productoId, cantidad: l.cantidad }));
}
