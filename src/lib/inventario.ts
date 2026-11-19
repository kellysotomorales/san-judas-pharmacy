/** Reglas de inventario de Farmacia San Judas, sin dependencias de red para poder probarlas. */

export const DIAS_AVISO_VENCIMIENTO = 90;

export type EstadoVencimiento = "vencido" | "por-vencer" | "vigente";
export type EstadoStock = "agotado" | "bajo" | "normal";

/** Convierte "YYYY-MM-DD" a una fecha local a medianoche, sin desfase por zona horaria. */
export function parseFechaLocal(fecha: string): Date {
  const [y = 1970, m = 1, d = 1] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function diasParaVencer(fechaVencimiento: string, hoy: Date = new Date()): number {
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const ms = parseFechaLocal(fechaVencimiento).getTime() - inicioHoy.getTime();
  return Math.round(ms / 86_400_000);
}

export function estadoVencimiento(fechaVencimiento: string, hoy: Date = new Date()): EstadoVencimiento {
  const dias = diasParaVencer(fechaVencimiento, hoy);
  if (dias < 0) return "vencido";
  if (dias <= DIAS_AVISO_VENCIMIENTO) return "por-vencer";
  return "vigente";
}

export function estadoStock(stock: number, stockMinimo: number): EstadoStock {
  if (stock <= 0) return "agotado";
  if (stock <= stockMinimo) return "bajo";
  return "normal";
}

const formatoCordobas = new Intl.NumberFormat("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearPrecio(precio: number): string {
  return `C$ ${formatoCordobas.format(precio)}`;
}

const formatoFecha = new Intl.DateTimeFormat("es-NI", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatearFecha(fecha: string): string {
  return formatoFecha.format(parseFechaLocal(fecha));
}
