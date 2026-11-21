import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const sql = readFileSync("supabase/seeds/historico-dashboard.sql", "utf8");
const lineaSchema = z.array(z.tuple([z.string().regex(/^(MED|HIG|SUP)\d{3}$/), z.number().int().positive()]));
const ventas = [...sql.matchAll(/\('([^']+)',(\d+),'(\[.*?\])'\)/g)].map((r) => {
  const fecha = r[1];
  const texto = r[3];
  if (!fecha || !texto) throw new Error("Venta histórica no válida");
  return { fecha, clienteOrden: Number(r[2]), lineas: lineaSchema.parse(JSON.parse(texto)) };
});

describe("plan SQL de ventas históricas", () => {
  it("conserva 30 ventas distintas, diez por mes", () => {
    expect(ventas).toHaveLength(30);
    expect(new Set(ventas.map((v) => v.fecha)).size).toBe(30);
    for (const mes of ["2026-09", "2026-10", "2026-11"]) {
      expect(ventas.filter((v) => v.fecha.startsWith(mes))).toHaveLength(10);
    }
  });
  it("ninguna venta de noviembre pasa del 20", () => {
    const noviembre = ventas.filter((v) => v.fecha.startsWith("2026-11"));
    expect(noviembre).toHaveLength(10);
    for (const v of noviembre) expect(Number(v.fecha.slice(8, 10))).toBeLessThanOrEqual(20);
  });
  it("incluye ventas de uno, dos y tres productos sin IDs ni precios en sus líneas", () => {
    expect(new Set(ventas.map((v) => v.lineas.length))).toEqual(new Set([1, 2, 3]));
    for (const venta of ventas) {
      expect(venta.clienteOrden).toBeGreaterThanOrEqual(1);
      expect(venta.clienteOrden).toBeLessThanOrEqual(5);
      expect(new Set(venta.lineas.map(([codigo]) => codigo)).size).toBe(venta.lineas.length);
      for (const linea of venta.lineas) expect(linea).toHaveLength(2);
    }
  });
});