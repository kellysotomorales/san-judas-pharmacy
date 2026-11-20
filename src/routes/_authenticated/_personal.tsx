import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";

import { Encabezado } from "@/components/encabezado";
import { tieneAccesoAlSistema } from "@/lib/permisos";
import { rolQueryOptions } from "@/lib/sesion";

/** Solo deja pasar a quien tenga rol cajero o gerente en `usuario_roles`. */
export const Route = createFileRoute("/_authenticated/_personal")({
  beforeLoad: async ({ context }) => {
    const rol = await context.queryClient.fetchQuery(rolQueryOptions(context.user.id));
    return { rol };
  },
  component: PersonalLayout,
});

function PersonalLayout() {
  const { rol, user } = Route.useRouteContext();
  if (!tieneAccesoAlSistema(rol)) return <SinAcceso email={user.email} />;
  return <Outlet />;
}

function SinAcceso({ email }: { email: string | undefined }) {
  return (
    <div className="min-h-screen">
      <Encabezado subtitulo="Acceso del personal" email={email} rol={null} />
      <main className="grid place-items-center px-4 py-24">
        <div className="panel max-w-md p-8 text-center" role="alert">
          <ShieldX className="mx-auto size-8 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold">Tu cuenta no tiene acceso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Solo el personal con rol de cajero o gerente puede usar el sistema. Pide a la gerencia
            que te asigne un rol y vuelve a entrar.
          </p>
        </div>
      </main>
    </div>
  );
}
