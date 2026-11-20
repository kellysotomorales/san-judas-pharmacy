/** Permisos por rol del personal (roles de la tabla `roles`). */
export type Rol = "cajero" | "gerente";

export function rolValido(valor: unknown): Rol | null {
  return valor === "cajero" || valor === "gerente" ? valor : null;
}

/** Solo el gerente crea productos y modifica sus datos, incluidos los precios. */
export function puedeGestionarProductos(rol: Rol | null): boolean {
  return rol === "gerente";
}

/** Cajero y gerente pueden entrar al sistema; una cuenta sin rol no. */
export function tieneAccesoAlSistema(rol: Rol | null): boolean {
  return rol !== null;
}
