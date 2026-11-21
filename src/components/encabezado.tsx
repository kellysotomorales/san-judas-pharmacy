import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Marca } from "@/components/marca";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Rol } from "@/lib/permisos";

const enlaces = [
  { to: "/productos", etiqueta: "Productos" },
  { to: "/ventas", etiqueta: "Ventas" },
] as const;

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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-8">
          <Marca subtitulo={subtitulo} />
          {rol && (
            <nav className="flex gap-1" aria-label="Secciones">
              {enlaces.map((e) => (
                <Link
                  key={e.to}
                  to={e.to}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                >
                  {e.etiqueta}
                </Link>
              ))}
              {rol === "gerente" && (
                <Link to="/dashboard" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-secondary text-secondary-foreground" }}>
                  Dashboard
                </Link>
              )}
            </nav>
          )}
        </div>
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
