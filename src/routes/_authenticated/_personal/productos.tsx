import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  CalendarX2,
  Database,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Encabezado } from "@/components/encabezado";
import { ProductoDialog } from "@/components/producto-dialog";
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
import {
  DIAS_AVISO_VENCIMIENTO,
  diasParaVencer,
  estadoStock,
  estadoVencimiento,
  formatearFecha,
  formatearPrecio,
  stockEnAlerta,
} from "@/lib/inventario";
import { puedeGestionarProductos } from "@/lib/permisos";
import { categoriasQueryOptions, productosQueryOptions, type Producto } from "@/lib/productos";

type BusquedaProductos = { q?: string | undefined; categoria?: string | undefined };

export const Route = createFileRoute("/_authenticated/_personal/productos")({
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
        content: "Inventario de productos con precio, stock, vencimiento y alertas.",
      },
      { property: "og:title", content: "Productos — Farmacia San Judas SIG" },
      {
        property: "og:description",
        content: "Inventario de productos con precio, stock, vencimiento y alertas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productosQueryOptions),
      context.queryClient.ensureQueryData(categoriasQueryOptions),
    ]),
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
  const { data: categoriasTabla } = useSuspenseQuery(categoriasQueryOptions);
  const { user, rol } = Route.useRouteContext();
  const { q = "", categoria } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const esGerente = puedeGestionarProductos(rol);

  const [dialogo, setDialogo] = useState<{ abierto: boolean; producto?: Producto | undefined }>({
    abierto: false,
  });

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

  const conStockBajo = productos.filter((p) => stockEnAlerta(p.stock, p.stockMinimo)).length;
  const porVencer = productos.filter((p) => estadoVencimiento(p.fechaVencimiento) === "por-vencer").length;
  const vencidos = productos.filter((p) => estadoVencimiento(p.fechaVencimiento) === "vencido").length;

  const hora = new Date(dataUpdatedAt).toLocaleTimeString("es-NI", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="min-h-screen">
      <Encabezado subtitulo="Inventario" email={user.email} rol={rol} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Productos</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="size-4 text-primary" />
              Datos reales de tu base de datos · actualizado a las {hora}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "animate-spin" : ""} /> Actualizar
            </Button>
            {esGerente && (
              <Button onClick={() => setDialogo({ abierto: true })}>
                <Plus /> Nuevo producto
              </Button>
            )}
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Resumen icon={Package} etiqueta="Productos registrados" valor={productos.length} />
          <Resumen
            icon={AlertTriangle}
            etiqueta="Stock igual o menor al mínimo"
            valor={conStockBajo}
            tono="rojo"
          />
          <Resumen
            icon={CalendarClock}
            etiqueta={`Vencen en menos de ${DIAS_AVISO_VENCIMIENTO} días`}
            valor={porVencer}
            tono="naranja"
          />
          <Resumen icon={CalendarX2} etiqueta="Vencidos" valor={vencidos} tono="vencido" />
        </section>

        {!esGerente && (
          <p className="mt-6 text-sm text-muted-foreground">
            Con el rol de cajero puedes consultar los productos. Solo el gerente puede crearlos o
            cambiar sus datos.
          </p>
        )}

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
                <TableHead className={esGerente ? "" : "pr-4"}>Vencimiento</TableHead>
                {esGerente && <TableHead className="pr-4 text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p) => {
                const stock = estadoStock(p.stock, p.stockMinimo);
                const venc = estadoVencimiento(p.fechaVencimiento);
                const dias = diasParaVencer(p.fechaVencimiento);
                return (
                  <TableRow key={p.id} data-testid={`producto-${p.codigo}`}>
                    <TableCell className="pl-4 font-mono text-xs">{p.codigo}</TableCell>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{p.categoria}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatearPrecio(p.precio)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {stock !== "normal" && (
                          <Badge variant="stock">{stock === "agotado" ? "Agotado" : "Stock bajo"}</Badge>
                        )}
                        <span
                          className={`tabular-nums ${stock !== "normal" ? "font-semibold text-destructive" : ""}`}
                        >
                          {p.stock}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">mín. {p.stockMinimo}</p>
                    </TableCell>
                    <TableCell className={esGerente ? "" : "pr-4"}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular-nums">{formatearFecha(p.fechaVencimiento)}</span>
                        {venc === "vencido" && (
                          <Badge variant="vencido">
                            Vencido hace {-dias} {-dias === 1 ? "día" : "días"}
                          </Badge>
                        )}
                        {venc === "por-vencer" && (
                          <Badge variant="por-vencer">
                            {dias === 0 ? "Vence hoy" : `Vence en ${dias} ${dias === 1 ? "día" : "días"}`}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {esGerente && (
                      <TableCell className="pr-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Editar ${p.nombre}`}
                          onClick={() => setDialogo({ abierto: true, producto: p })}
                        >
                          <Pencil /> Editar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={esGerente ? 7 : 6} className="py-10 text-center text-muted-foreground">
                    Ningún producto coincide con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </main>

      {esGerente && (
        <ProductoDialog
          abierto={dialogo.abierto}
          onAbiertoChange={(abierto) => setDialogo((d) => ({ ...d, abierto }))}
          producto={dialogo.producto}
          categorias={categoriasTabla}
        />
      )}
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
  tono?: "rojo" | "naranja" | "vencido";
}) {
  const color =
    tono === "rojo"
      ? "bg-destructive text-destructive-foreground"
      : tono === "naranja"
        ? "bg-naranja text-naranja-foreground"
        : tono === "vencido"
          ? "bg-foreground text-background"
          : "bg-secondary text-primary";
  return (
    <div className="panel p-5">
      <span className={`grid size-9 place-items-center rounded-lg ${color}`}>
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums">{valor}</p>
      <p className="text-sm text-muted-foreground">{etiqueta}</p>
    </div>
  );
}
