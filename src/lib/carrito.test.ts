import { describe, expect, it } from "vitest";
import {
  agregarProducto,
  cambiarCantidad,
  excedeStock,
  lineasParaRegistrar,
  quitarLinea,
  subtotalLinea,
  totalVenta,
} from "./carrito";

const acetaminofen = { id: 1, codigo: "MED001", nombre: "Acetaminofén", precio: 25, stock: 100 };
const multivitaminico = { id: 11, codigo: "SUP001", nombre: "Multivitamínico", precio: 150, stock: 120 };

describe("carrito de venta", () => {
  it("agrega varios productos a la misma venta", () => {
    const lineas = agregarProducto(agregarProducto([], acetaminofen), multivitaminico);
    expect(lineas.map((l) => l.codigo)).toEqual(["MED001", "SUP001"]);
  });
  it("agregar el mismo producto otra vez suma una unidad", () => {
    const lineas = agregarProducto(agregarProducto([], acetaminofen), acetaminofen);
    expect(lineas).toHaveLength(1);
    expect(lineas[0]?.cantidad).toBe(2);
  });
  it("la cantidad nunca baja de 1", () => {
    const lineas = cambiarCantidad(agregarProducto([], acetaminofen), 1, 0);
    expect(lineas[0]?.cantidad).toBe(1);
  });
  it("subtotal = precio unitario × cantidad", () => {
    expect(subtotalLinea({ precioUnitario: 25, cantidad: 3 })).toBe(75);
  });
  it("total = suma de subtotales", () => {
    expect(
      totalVenta([
        { precioUnitario: 25, cantidad: 3 },
        { precioUnitario: 150, cantidad: 1 },
      ]),
    ).toBe(225);
  });
  it("suma centavos sin errores de redondeo", () => {
    expect(totalVenta([{ precioUnitario: 0.1, cantidad: 3 }])).toBe(0.3);
  });
  it("quita una línea antes de confirmar", () => {
    const lineas = agregarProducto(agregarProducto([], acetaminofen), multivitaminico);
    expect(quitarLinea(lineas, 1).map((l) => l.codigo)).toEqual(["SUP001"]);
  });
  it("detecta cantidad mayor a las existencias", () => {
    expect(excedeStock({ cantidad: 9, stockDisponible: 8 })).toBe(true);
    expect(excedeStock({ cantidad: 8, stockDisponible: 8 })).toBe(false);
  });
  it("no envía precios a la base de datos, solo producto y cantidad", () => {
    const lineas = cambiarCantidad(agregarProducto([], acetaminofen), 1, 3);
    expect(lineasParaRegistrar(lineas)).toEqual([{ producto_id: 1, cantidad: 3 }]);
  });
});
