import { describe, expect, it } from "vitest";
import { clasificarRotacion, dentroDeProximos30Dias, fechaManagua, inicioRotacion, ticketPromedio } from "./gerencia-reglas";

describe("reglas gerenciales", () => {
  it("clasifica tres unidades o menos como baja rotación, incluyendo cero", () => {
    expect(clasificarRotacion(0)).toBe("Baja rotación");
    expect(clasificarRotacion(3)).toBe("Baja rotación");
    expect(clasificarRotacion(4)).toBe("Rotación normal");
  });
  it("divide ingresos entre ventas del mes y maneja meses sin ventas", () => {
    expect(ticketPromedio(2365, 10)).toBe(236.5);
    expect(ticketPromedio(0, 0)).toBe(0);
  });
  it("incluye hoy y menos de 30 días, excluyendo 30 días exactos y vencidos", () => {
    expect(dentroDeProximos30Dias("2026-11-20", "2026-11-20")).toBe(true);
    expect(dentroDeProximos30Dias("2026-12-19", "2026-11-20")).toBe(true);
    expect(dentroDeProximos30Dias("2026-12-20", "2026-11-20")).toBe(false);
    expect(dentroDeProximos30Dias("2026-12-21", "2026-11-20")).toBe(false);
    expect(dentroDeProximos30Dias("2026-11-19", "2026-11-20")).toBe(false);
  });
  it("usa el día de Nicaragua aunque UTC ya sea el día siguiente", () => {
    expect(fechaManagua(new Date("2026-11-21T01:00:00Z"))).toBe("2026-11-20");
  });
  it("abarca exactamente 90 fechas locales hasta hoy", () => {
    expect(inicioRotacion("2026-11-20")).toBe("2026-08-23");
  });
});