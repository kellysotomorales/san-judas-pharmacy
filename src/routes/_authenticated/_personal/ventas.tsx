import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { CheckCircle2, Minus, Plus, Search, ShoppingCart, Trash2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Encabezado } from "@/components/encabezado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  agregarProducto,
  cambiarCantidad,
  excedeStock,
  motivoNoVendible,
  quitarLinea,
  subtotalLinea,
  totalVenta,
  type LineaVenta,
} from "@/lib/carrito";
import { formatearPrecio } from "@/lib/inventario";
import { productosQueryOptions } from "@/lib/productos";
import {
  clientesQueryOptions,
  registrarVenta,
  VentaRechazadaError,
  type VentaRegistrada,
} from "@/lib/ventas";

export const Route = createFileRoute("/_authenticated/_personal/ventas")({
  head: () => ({
    meta: [
      { title: "Ventas — Farmacia San Judas SIG" },
      { name: "description", content: "Registro de ventas por cliente con descuento automático de stock." },
      { property: "og:title", content: "Ventas — Farmacia San Judas SIG" },
      {
        property: "og:description",
        content: "Registro de ventas por cliente con descuento automático de stock.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productosQueryOptions),
      context.queryClient.ensureQueryData(clientesQueryOptions),
    ]),
  pendingComponent: () => (
    <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando ventas…</div>
  ),
  errorComponent: ErrorVentas,
  component: VentasPage,
});

function ErrorVentas({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="panel max-w-md p-8 text-center" role="alert">
        <h1 className="text-xl font-bold">No se pudo abrir la pantalla de ventas</h1>
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

function VentasPage() {
  const { data: productos } = useSuspenseQuery(productosQueryOptions);
  const { data: clientes } = useSuspenseQuery(clientesQueryOptions);
  const { user, rol } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const [clienteId, setClienteId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [lineas, setLineas] = useState<LineaVenta[]>([]);
  const [rechazo, setRechazo] = useState<{ titulo: string; detalle: string | null } | null>(null);
  const [confirmada, setConfirmada] = useState<VentaRegistrada | null>(null);

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return [];
    return productos
      .filter((p) => p.codigo.toLowerCase().includes(texto) || p.nombre.toLowerCase().includes(texto))
      .slice(0, 8);
  }, [productos, busqueda]);

  const total = totalVenta(lineas);
  const cliente = clientes.find((c) => String(c.id) === clienteId);

  const mutation = useMutation({
    mutationFn: () => registrarVenta(Number(clienteId), lineas),
    onSuccess: async (venta) => {
      setConfirmada(venta);
      setRechazo(null);
      await queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (err) => {
      if (err instanceof VentaRechazadaError) {
        setRechazo({ titulo: err.message, detalle: err.detalle ?? null });
        toast.error(err.message);
        // Actualiza existencias por si cambiaron mientras se armaba la venta.
        queryClient.invalidateQueries({ queryKey: ["productos"] });
      } else {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    },
  });

  function cambiarLineas(nuevas: LineaVenta[]) {
    setLineas(nuevas);
    setRechazo(null);
  }

  function nuevaVenta() {
    setConfirmada(null);
    setLineas([]);
    setClienteId("");
    setBusqueda("");
  }

  const puedeRegistrar = !!cliente && lineas.length > 0 && !mutation.isPending;

  return (
    <div className="min-h-screen">
      <Encabezado subtitulo="Ventas" email={user.email} rol={rol} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-4xl font-bold">Nueva venta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Los precios y existencias vienen del inventario. Los productos vencidos no se pueden vender. El stock se descuenta al registrar la venta.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="space-y-6">
            <div className="panel space-y-2 p-5">
              <Label htmlFor="cliente">Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger id="cliente">
                  <SelectValue placeholder="Elige un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                      {c.telefono ? ` · ${c.telefono}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="panel p-5">
              <Label htmlFor="buscar-producto">Agregar productos</Label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="buscar-producto"
                  placeholder="Buscar por código o nombre"
                  className="pl-9"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <ul className="mt-3 divide-y" aria-label="Resultados de búsqueda">
                {resultados.map((p) => {
                  const motivo = motivoNoVendible(p);
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.nombre}</p>
                        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{p.codigo}</span>
                          <span>{formatearPrecio(p.precio)}</span>
                          <span>Stock {p.stock}</span>
                          {motivo === "vencido" && <Badge variant="vencido">Vencido · no se vende</Badge>}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={motivo !== null}
                        aria-label={`Agregar ${p.nombre}`}
                        onClick={() => cambiarLineas(agregarProducto(lineas, p))}
                      >
                        {motivo === "vencido" ? "Vencido" : motivo === "agotado" ? "Agotado" : <><Plus /> Agregar</>}
                      </Button>
                    </li>
                  );
                })}
                {busqueda.trim() && resultados.length === 0 && (
                  <li className="py-4 text-sm text-muted-foreground">Ningún producto coincide.</li>
                )}
                {!busqueda.trim() && (
                  <li className="py-4 text-sm text-muted-foreground">
                    Escribe un código (por ejemplo MED001) o un nombre.
                  </li>
                )}
              </ul>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b p-5">
              <ShoppingCart className="size-5 text-primary" />
              <h2 className="text-lg font-bold">Detalle de la venta</h2>
              {cliente && <span className="ml-auto text-sm text-muted-foreground">{cliente.nombre}</span>}
            </div>

            {rechazo !== null && (
              <div
                role="alert"
                className="flex items-start gap-3 border-b bg-destructive/10 p-4 text-sm text-destructive"
              >
                <XCircle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-semibold">{rechazo.titulo}</p>
                  <p>La venta no se registró. {rechazo.detalle}</p>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Producto</TableHead>
                  <TableHead className="text-right">Precio unitario</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="pr-5">
                    <span className="sr-only">Quitar</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineas.map((l) => (
                  <TableRow key={l.productoId}>
                    <TableCell className="pl-5">
                      <p className="font-medium">{l.nombre}</p>
                      <p className="font-mono text-xs text-muted-foreground">{l.codigo}</p>
                      {excedeStock(l) && (
                        <p className="text-xs font-semibold text-destructive">
                          Stock insuficiente · disponible {l.stockDisponible}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatearPrecio(l.precioUnitario)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label={`Restar uno a ${l.nombre}`}
                          disabled={l.cantidad <= 1}
                          onClick={() => cambiarLineas(cambiarCantidad(lineas, l.productoId, l.cantidad - 1))}
                        >
                          <Minus />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          aria-label={`Cantidad de ${l.nombre}`}
                          className="h-8 w-16 text-center tabular-nums"
                          value={l.cantidad}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (!Number.isNaN(n)) cambiarLineas(cambiarCantidad(lineas, l.productoId, n));
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label={`Sumar uno a ${l.nombre}`}
                          onClick={() => cambiarLineas(cambiarCantidad(lineas, l.productoId, l.cantidad + 1))}
                        >
                          <Plus />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatearPrecio(subtotalLinea(l))}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Quitar ${l.nombre}`}
                        onClick={() => cambiarLineas(quitarLinea(lineas, l.productoId))}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {lineas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Todavía no agregaste productos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="pl-5 text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-display text-xl font-bold tabular-nums" data-testid="total">
                    {formatearPrecio(total)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>

            <div className="flex flex-wrap items-center justify-end gap-3 p-5">
              {!cliente && lineas.length > 0 && (
                <p className="text-sm text-muted-foreground">Elige un cliente para registrar.</p>
              )}
              <Button size="lg" disabled={!puedeRegistrar} onClick={() => mutation.mutate()}>
                {mutation.isPending ? "Registrando…" : "Registrar venta"}
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Dialog open={confirmada !== null} onOpenChange={(abierto) => !abierto && nuevaVenta()}>
        <DialogContent className="sm:max-w-md">
          {confirmada && (
            <>
              <DialogHeader>
                <CheckCircle2 className="size-8 text-primary" />
                <DialogTitle>Venta registrada</DialogTitle>
                <DialogDescription>
                  Venta N.º {confirmada.ventaId} · {cliente?.nombre} ·{" "}
                  {new Date(confirmada.fecha).toLocaleString("es-NI", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </DialogDescription>
              </DialogHeader>
              <ul className="divide-y text-sm">
                {confirmada.lineas.map((l) => (
                  <li key={l.codigo} className="flex justify-between gap-3 py-2">
                    <span>
                      {l.cantidad} × {l.nombre}{" "}
                      <span className="text-muted-foreground">({formatearPrecio(l.precioUnitario)})</span>
                    </span>
                    <span className="tabular-nums">{formatearPrecio(l.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t pt-3 font-display text-lg font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatearPrecio(confirmada.total)}</span>
              </div>
              <DialogFooter>
                <Button onClick={nuevaVenta}>Nueva venta</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
