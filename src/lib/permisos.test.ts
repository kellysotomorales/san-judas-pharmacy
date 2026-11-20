import { describe, expect, it } from "vitest";
import { puedeGestionarProductos, rolValido, tieneAccesoAlSistema } from "./permisos";

describe("permisos por rol", () => {
  it("el gerente puede crear y editar productos", () => {
    expect(puedeGestionarProductos("gerente")).toBe(true);
  });
  it("el cajero solo consulta productos", () => {
    expect(puedeGestionarProductos("cajero")).toBe(false);
    expect(tieneAccesoAlSistema("cajero")).toBe(true);
  });
  it("una cuenta sin rol no entra al sistema", () => {
    expect(tieneAccesoAlSistema(null)).toBe(false);
    expect(puedeGestionarProductos(null)).toBe(false);
  });
  it("solo reconoce los roles cajero y gerente", () => {
    expect(rolValido("gerente")).toBe("gerente");
    expect(rolValido("admin")).toBeNull();
  });
});
