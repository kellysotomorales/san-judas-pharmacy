import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { AlertTriangle, CalendarX2, Database, LogOut, Package, RefreshCw, Search } from "lucide-react";
import { useMemo } from "react";

import { Marca } from "@/components/marca";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  diasParaVencer,
  estadoStock,
  estadoVencimiento,
  formatearFecha,
  formatearPrecio,
} from "@/lib/inventario";
import { productosQueryOptions } from "@/lib/productos";

type BusquedaProductos = { q?: string | undefined; categoria?: string | undefined };

export const Route = createFileRoute("/_authenticated/productos")({
  validateSearch: (search: Record<string, unknown>): BusquedaProductos => ({
    q: typeof search["q"] === "string" && search["q"] ? search["q"] : undefined,
    categoria:
      typeof search["categoria"] === "string" && search["categoria"]
        ? search["categoria"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Productos — Farmacia San Judas SIG" },
      {
        name: "description",
        content: "Inventario de productos con precio, stock y fecha de vencimiento.",
      },
      { property: "og:title", content: "Productos — Farmacia San Judas SIG" },
      {
        property: "og:description",
        content: "Inventario de productos con precio, stock y fecha de vencimiento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productosQueryOptions),
  pendingComponent: () => (
    <div className="grid min-h-screen place-items-center text-muted-foreground">
      Cargando productos…
    </div>
  ),
  errorComponent: ErrorProductos,
  notFoundComponent: () => <div className="p-8">No se encontraron productos.</div>,
  component: ProductosPage,
});

function ErrorProductos({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="panel max-w-md p-8 text-center" role="alert">
        <h1 className="text-xl font-bold">No se pudieron cargar los productos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <Button className="mt-6" onClick={() => router.invalidate()}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

function ProductosPage() {
  const { data: productos, dataUpdatedAt, refetch, isFetching } =
    useSuspenseQuery(productosQueryOptions);
  const { user } = Route.useRouteContext();
  const { q = "", categoria } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const categorias = useMemo(
    () => [...new Set(productos.map((p) => p.categoria))].sort(),
    [productos],
  );

  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return productos.filter(
      (p) =>
        (!categoria || p.categoria === categoria) &&
        (!texto ||
          p.nombre.toLowerCase().includes(texto) ||
          p.codigo.toLowerCase().includes(texto)),
    );
  }, [productos, q, categoria]);

  const stockBajo = productos.filter((p) => estadoStock(p.stock, p.stockMinimo) !== "normal").length;
  const porVencer = productos.filter((p) => estadoVencimiento(p.fechaVencimiento) !== "vigente").length;

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const hora = new Date(dataUpdatedAt).toLocaleTimeString("es-NI", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="min-h-screen">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Marca subtitulo="Inventario" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <Button variant="outline" size="sm" onClick={cerrarSesion}>
              <LogOut /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Productos</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="size-4 text-primary" />
              Datos reales de tu base de datos · actualizado a las {hora}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "animate-spin" : ""} /> Actualizar
          </Button>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Resumen icon={Package} etiqueta="Productos registrados" valor={productos.length} />
          <Resumen icon={AlertTriangle} etiqueta="Con stock bajo o agotado" valor={stockBajo} tono="warning" />
          <Resumen icon={CalendarX2} etiqueta="Vencidos o por vencer (90 días)" valor={porVencer} tono="danger" />
        </section>

        <section className="panel mt-8 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar por nombre o código"
                placeholder="Buscar por nombre o código"
                className="pl-9"
                value={q}
                onChange={(e) =>
                  navigate({ search: (prev) => ({ ...prev, q: e.target.value || undefined }), replace: true })
                }
              />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
              <Button
                size="sm"
                variant={!categoria ? "default" : "outline"}
                onClick={() => navigate({ search: (prev) => ({ ...prev, categoria: undefined }) })}
              >
                Todas
              </Button>
              {categorias.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={categoria === c ? "default" : "outline"}
                  onClick={() => navigate({ search: (prev) => ({ ...prev, categoria: c }) })}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="pr-4">Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p) => {
                const stock = estadoStock(p.stock, p.stockMinimo);
                const venc = estadoVencimiento(p.fechaVencimiento);
                const dias = diasParaVencer(p.fechaVencimiento);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4 font-mono text-xs">{p.codigo}</TableCell>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{p.categoria}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatearPrecio(p.precio)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {stock !== "normal" && (
                          <Badge variant="warning">{stock === "agotado" ? "Agotado" : "Bajo"}</Badge>
                        )}
                        <span className="tabular-nums">{p.stock}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">mín. {p.stockMinimo}</p>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">{formatearFecha(p.fechaVencimiento)}</span>
                        {venc === "vencido" && <Badge variant="danger">Vencido</Badge>}
                        {venc === "por-vencer" && <Badge variant="danger">{dias} días</Badge>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Ningún producto coincide con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </main>
    </div>
  );
}

function Resumen({
  icon: Icon,
  etiqueta,
  valor,
  tono,
}: {
  icon: typeof Package;
  etiqueta: string;
  valor: number;
  tono?: "warning" | "danger";
}) {
  const color =
    tono === "warning" ? "text-warning-foreground" : tono === "danger" ? "text-destructive" : "text-primary";
  return (
    <div className="panel p-5">
      <Icon className={`size-5 ${color}`} />
      <p className="mt-3 font-display text-3xl font-bold tabular-nums">{valor}</p>
      <p className="text-sm text-muted-foreground">{etiqueta}</p>
    </div>
  );
}
