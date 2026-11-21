import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const dashboardSchema = z.object({
  hoy: z.string(), mes: z.string(), ventasMes: z.number(), cantidadVentasMes: z.number(),
  ticketPromedio: z.number(), productosPorVencer: z.number(), inicioRotacion: z.string(), finRotacion: z.string(),
  meses: z.array(z.object({ mes: z.string(), total: z.number(), cantidad: z.number() })),
  rotacion: z.array(z.object({ id: z.number(), codigo: z.string(), nombre: z.string(), stock: z.number(), unidades: z.number(), clasificacion: z.enum(["Baja rotación", "Rotación normal"]) })).nullable().transform((v) => v ?? []),
});
export type DashboardDatos = z.infer<typeof dashboardSchema>;

/** Endpoint SQL exclusivo del gerente: nunca descargar las ventas para agregarlas en el navegador. */
export const dashboardQueryOptions = (usuarioId: string) => queryOptions({
  queryKey: ["dashboard-gerencial", usuarioId],
  staleTime: 60_000,
  retry: false,
  queryFn: async ({ signal }): Promise<DashboardDatos> => {
    const { data } = await supabase.auth.getSession();
    if (!data.session || data.session.user.id !== usuarioId) throw new Error("Inicia sesión con una cuenta de gerente.");
    // Consulta preparada mientras se autoriza su instalación; no editar los tipos generados.
    const respuesta = await fetch(`${import.meta.env['VITE_SUPABASE_URL']}/rest/v1/rpc/dashboard_gerencial`, {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", apikey: import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'], Authorization: `Bearer ${data.session.access_token}` },
      body: "{}",
    });
    if (!respuesta.ok) {
      const detalle: unknown = await respuesta.json().catch(() => null);
      const codigo = z.object({ code: z.string() }).safeParse(detalle);
      if (codigo.success && codigo.data.code === "PGRST202") throw new Error("Pendiente de autorizar la carga histórica y las consultas gerenciales en Supabase.");
      if (respuesta.status === 401 || respuesta.status === 403) throw new Error("Información exclusiva del gerente.");
      throw new Error("No se pudo consultar el dashboard. Vuelve a intentarlo.");
    }
    return dashboardSchema.parse(await respuesta.json());
  },
});