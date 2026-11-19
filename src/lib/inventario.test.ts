import { describe, expect, it } from "vitest";
import { diasParaVencer, estadoStock, estadoVencimiento } from "./inventario";

const hoy = new Date(2026, 10, 19); // 19 nov 2026

describe("estadoStock", () => {
  it("marca stock bajo cuando el stock es igual o menor al stock mínimo", () => {
    expect(estadoStock(6, 10)).toBe("bajo");
    expect(estadoStock(10, 10)).toBe("bajo");
  });
  it("marca agotado cuando el stock es cero", () => {
    expect(estadoStock(0, 10)).toBe("agotado");
  });
  it("es normal cuando supera el stock mínimo", () => {
    expect(estadoStock(11, 10)).toBe("normal");
  });
});

describe("estadoVencimiento", () => {
  it("marca vencido si la fecha ya pasó", () => {
    expect(estadoVencimiento("2026-11-18", hoy)).toBe("vencido");
  });
  it("marca por vencer dentro de los próximos 90 días", () => {
    expect(estadoVencimiento("2026-11-28", hoy)).toBe("por-vencer");
    expect(diasParaVencer("2027-02-17", hoy)).toBe(90);
    expect(estadoVencimiento("2027-02-17", hoy)).toBe("por-vencer");
  });
  it("es vigente a más de 90 días", () => {
    expect(estadoVencimiento("2027-02-18", hoy)).toBe("vigente");
  });
});
