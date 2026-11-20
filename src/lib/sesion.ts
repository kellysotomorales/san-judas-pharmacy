import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { rolValido, type Rol } from "@/lib/permisos";

/** Lee el rol asignado en `usuario_roles`. La base de datos solo deja ver el rol propio. */
export const rolQueryOptions = (usuarioId: string) =>
  queryOptions({
    queryKey: ["rol", usuarioId],
    queryFn: async (): Promise<Rol | null> => {
      const { data, error } = await supabase
        .from("usuario_roles")
        .select("roles(nombre)")
        .eq("usuario_id", usuarioId)
        .maybeSingle();
      if (error) throw new Error(`No se pudo comprobar tu rol: ${error.message}`);
      return rolValido(data?.roles?.nombre ?? null);
    },
    staleTime: 30_000,
  });
