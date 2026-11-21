/** Límites del dashboard, independientes de la red. Los datos oficiales se calculan en PostgreSQL. */
export const DIAS_ROTACION = 90;
export const LIMITE_BAJA_ROTACION = 3;
export function clasificarRotacion(unidades: number): "Baja rotación" | "Rotación normal" {
  return unidades <= LIMITE_BAJA_ROTACION ? "Baja rotación" : "Rotación normal";
}
export function ticketPromedio(ingresos: number, ventas: number): number {
  return ventas === 0 ? 0 : Math.round((ingresos / ventas) * 100) / 100;
}
export function fechaManagua(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Managua", year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
}
export function dentroDeProximos30Dias(vencimiento: string, hoy: string): boolean {
  const diferencia = (Date.parse(`${vencimiento}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86_400_000;
  return diferencia >= 0 && diferencia < 30;
}
export function inicioRotacion(hoy: string): string {
  return new Date(Date.parse(`${hoy}T00:00:00Z`) - (DIAS_ROTACION - 1) * 86_400_000).toISOString().slice(0, 10);
}