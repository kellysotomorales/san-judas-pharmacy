import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, PackageSearch, Receipt } from "lucide-react";

import { Marca } from "@/components/marca";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Farmacia San Judas SIG — Sistema de gestión" },
      {
        name: "description",
        content: "Inventario, vencimientos y ventas de Farmacia San Judas en un solo lugar.",
      },
      { property: "og:title", content: "Farmacia San Judas SIG — Sistema de gestión" },
      {
        property: "og:description",
        content: "Inventario, vencimientos y ventas de Farmacia San Judas en un solo lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const puntos = [
  { icon: PackageSearch, titulo: "Inventario", texto: "Código, precio y stock de cada producto." },
  { icon: CalendarClock, titulo: "Vencimientos", texto: "Avisos de productos vencidos o por vencer." },
  { icon: Receipt, titulo: "Ventas", texto: "Registro de ventas por cliente. Próximamente." },
];

function Index() {
  return (
    <div className="bg-pattern-cross min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <header>
          <Marca />
        </header>
        <main className="flex flex-1 flex-col justify-center py-16">
          <p className="animate-rise font-mono text-xs uppercase tracking-[0.25em] text-primary">
            Sistema de información gerencial
          </p>
          <h1 className="animate-rise mt-4 max-w-2xl text-5xl font-bold leading-[1.02] sm:text-6xl">
            El mostrador, el estante y la bodega, en orden.
          </h1>
          <p className="animate-rise mt-5 max-w-lg text-lg text-muted-foreground">
            Consulta el inventario real de la farmacia, vigila el stock mínimo y adelántate a los
            vencimientos.
          </p>
          <div className="animate-rise mt-8">
            <Button asChild size="lg">
              <Link to="/productos">
                Entrar al sistema <ArrowRight />
              </Link>
            </Button>
          </div>
          <ul className="mt-16 grid gap-4 sm:grid-cols-3">
            {puntos.map(({ icon: Icon, titulo, texto }) => (
              <li key={titulo} className="panel p-5">
                <Icon className="size-5 text-primary" />
                <p className="mt-3 font-semibold">{titulo}</p>
                <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </div>
  );
}
