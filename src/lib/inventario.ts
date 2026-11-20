/** Reglas de inventario de Farmacia San Judas, sin dependencias de red para poder probarlas. */
import { z } from "zod";

/** Un producto se avisa en naranja cuando vence en menos de estos días. */
export const DIAS_AVISO_VENCIMIENTO = 30;

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

/**
 * - vencido: la fecha ya pasó (estado separado).
 * - por-vencer (naranja): vence hoy o en menos de 30 días.
 * - vigente: faltan 30 días o más.
 */
export function estadoVencimiento(fechaVencimiento: string, hoy: Date = new Date()): EstadoVencimiento {
  const dias = diasParaVencer(fechaVencimiento, hoy);
  if (dias < 0) return "vencido";
  if (dias < DIAS_AVISO_VENCIMIENTO) return "por-vencer";
  return "vigente";
}

/** Alerta roja: el stock es menor o igual al stock mínimo. */
export function stockEnAlerta(stock: number, stockMinimo: number): boolean {
  return stock <= stockMinimo;
}

export function estadoStock(stock: number, stockMinimo: number): EstadoStock {
  if (stock <= 0) return "agotado";
  if (stockEnAlerta(stock, stockMinimo)) return "bajo";
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

/** Reglas para crear o editar un producto; coinciden con las restricciones de la tabla `productos`. */
export const productoFormSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, "Escribe el código.")
    .max(30, "El código admite hasta 30 caracteres."),
  nombre: z
    .string()
    .trim()
    .min(1, "Escribe el nombre.")
    .max(150, "El nombre admite hasta 150 caracteres."),
  categoriaId: z.coerce
    .number({ invalid_type_error: "Elige una categoría." })
    .int()
    .positive("Elige una categoría."),
  precio: z.coerce
    .number({ invalid_type_error: "Escribe un precio válido." })
    .positive("El precio debe ser mayor que C$ 0.00.")
    .multipleOf(0.01, "Usa como máximo dos decimales."),
  stock: z.coerce
    .number({ invalid_type_error: "Escribe un número." })
    .int("El stock debe ser un número entero.")
    .min(0, "El stock no puede ser negativo."),
  stockMinimo: z.coerce
    .number({ invalid_type_error: "Escribe un número." })
    .int("El stock mínimo debe ser un número entero.")
    .min(0, "El stock mínimo no puede ser negativo."),
  fechaVencimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha de vencimiento."),
});

export type ProductoForm = z.infer<typeof productoFormSchema>;
