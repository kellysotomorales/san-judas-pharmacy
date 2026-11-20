import { describe, expect, it } from "vitest";
import {
  diasParaVencer,
  estadoStock,
  estadoVencimiento,
  formatearPrecio,
  productoFormSchema,
  stockEnAlerta,
} from "./inventario";

const hoy = new Date(2026, 10, 19); // 19 nov 2026

describe("alerta roja de stock", () => {
  it("alerta cuando el stock es menor al stock mínimo", () => {
    expect(stockEnAlerta(6, 10)).toBe(true);
  });
  it("alerta cuando el stock es igual al stock mínimo", () => {
    expect(stockEnAlerta(10, 10)).toBe(true);
  });
  it("no alerta cuando el stock supera el mínimo", () => {
    expect(stockEnAlerta(11, 10)).toBe(false);
    expect(estadoStock(11, 10)).toBe("normal");
  });
  it("stock cero se muestra como agotado", () => {
    expect(estadoStock(0, 10)).toBe("agotado");
  });
});

describe("alerta naranja de vencimiento (menos de 30 días)", () => {
  it("vence en 29 días: por vencer", () => {
    expect(diasParaVencer("2026-12-18", hoy)).toBe(29);
    expect(estadoVencimiento("2026-12-18", hoy)).toBe("por-vencer");
  });
  it("vence en 30 días: no alerta", () => {
    expect(diasParaVencer("2026-12-19", hoy)).toBe(30);
    expect(estadoVencimiento("2026-12-19", hoy)).toBe("vigente");
  });
  it("vence hoy: por vencer, todavía no vencido", () => {
    expect(estadoVencimiento("2026-11-19", hoy)).toBe("por-vencer");
  });
});

describe("producto vencido", () => {
  it("la fecha ya pasó: estado vencido separado", () => {
    expect(estadoVencimiento("2026-11-18", hoy)).toBe("vencido");
  });
});

describe("precios en córdobas", () => {
  it("formatea con C$ y dos decimales", () => {
    expect(formatearPrecio(450)).toBe("C$ 450.00");
  });
});

describe("formulario de producto", () => {
  const valido = {
    codigo: "MED006",
    nombre: "Amoxicilina",
    categoriaId: "1",
    precio: "65.50",
    stock: "30",
    stockMinimo: "10",
    fechaVencimiento: "2027-05-01",
  };
  it("acepta un producto válido", () => {
    expect(productoFormSchema.safeParse(valido).success).toBe(true);
  });
  it("rechaza precio cero", () => {
    expect(productoFormSchema.safeParse({ ...valido, precio: "0" }).success).toBe(false);
  });
  it("rechaza stock negativo", () => {
    expect(productoFormSchema.safeParse({ ...valido, stock: "-1" }).success).toBe(false);
  });
  it("rechaza código de más de 30 caracteres", () => {
    expect(productoFormSchema.safeParse({ ...valido, codigo: "X".repeat(31) }).success).toBe(false);
  });
});
