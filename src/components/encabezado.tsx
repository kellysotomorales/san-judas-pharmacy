import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Marca } from "@/components/marca";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Rol } from "@/lib/permisos";

export function Encabezado({
  subtitulo,
  email,
  rol,
}: {
  subtitulo: string;
  email: string | undefined;
  rol: Rol | null;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Marca subtitulo={subtitulo} />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
          {rol && (
            <Badge variant="secondary" className="capitalize">
              {rol}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={cerrarSesion}>
            <LogOut /> Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
