import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { CalendarClock, ChartColumn, Receipt, RefreshCw, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Encabezado } from "@/components/encabezado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dashboardQueryOptions } from "@/lib/gerencia";
import { formatearFecha, formatearPrecio } from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/_personal/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard gerencial — Farmacia San Judas SIG" },
    { name: "description", content: "Ventas mensuales, ticket promedio, vencimientos y rotación de productos de Farmacia San Judas." },
    { property: "og:title", content: "Dashboard gerencial — Farmacia San Judas SIG" },
    { property: "og:description", content: "Indicadores y análisis gerencial de Farmacia San Judas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: ({ context }) => {
    if (context.rol !== "gerente") throw redirect({ to: "/productos" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQueryOptions(context.user.id)),
  pendingComponent: () => <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando indicadores…</div>,
  errorComponent: ErrorDashboard,
  notFoundComponent: () => <div className="p-8">No se encontró el dashboard.</div>,
  component: DashboardPage,
});

function ErrorDashboard({ error }: ErrorComponentProps) {
  const router = useRouter();
  return <main className="mx-auto max-w-2xl px-6 py-16" role="alert">
    <ChartColumn className="size-8 text-primary" />
    <h1 className="mt-4 text-3xl font-bold">Dashboard gerencial</h1>
    <p className="mt-3 text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Button onClick={() => router.invalidate()}><RefreshCw />Reintentar</Button>
      <Button asChild variant="outline"><Link to="/productos">Volver a productos</Link></Button>
    </div>
  </main>;
}

function DashboardPage() {
  const { user, rol } = Route.useRouteContext();
  const { data, refetch, isFetching } = useSuspenseQuery(dashboardQueryOptions(user.id));
  const nombreMes = new Intl.DateTimeFormat("es-NI", { month: "long", year: "numeric", timeZone: "America/Managua" }).format(new Date(`${data.mes}-15T12:00:00-06:00`));
  const meses = data.meses.map((m) => ({ ...m, nombre: ({ "2026-09": "Septiembre", "2026-10": "Octubre", "2026-11": "Noviembre" } as Record<string, string>)[m.mes] ?? m.mes }));
  const bajas = data.rotacion.filter((p) => p.clasificacion === "Baja rotación").length;
  return <div className="min-h-screen">
    <Encabezado subtitulo="Gerencia" email={user.email} rol={rol} />
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-medium capitalize text-primary">{nombreMes}</p><h1 className="mt-1 text-4xl font-bold">Dashboard gerencial</h1><p className="mt-2 text-sm text-muted-foreground">Al {formatearFecha(data.hoy)} · America/Managua</p></div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={isFetching ? "animate-spin" : ""} />Actualizar</Button>
      </div>
      <section aria-label="Indicadores del mes" className="mt-8 grid gap-4 md:grid-cols-3">
        <Indicador icon={TrendingUp} titulo="Ventas del mes" valor={formatearPrecio(data.ventasMes)} detalle={`${data.cantidadVentasMes} ventas`} />
        <Indicador icon={Receipt} titulo="Ticket promedio" valor={formatearPrecio(data.ticketPromedio)} detalle={nombreMes} />
        <Indicador icon={CalendarClock} titulo="Productos por vencer" valor={String(data.productosPorVencer)} detalle="Hoy y próximos 30 días" />
      </section>
      <section className="mt-10 border-t pt-8" aria-labelledby="ventas-mensuales">
        <h2 id="ventas-mensuales" className="text-2xl font-bold">Ventas mensuales</h2><p className="mt-1 text-sm text-muted-foreground">Septiembre — noviembre 2026 · C$</p>
        <ChartContainer config={{ total: { label: "Ingresos", color: "var(--chart-1)" } }} className="mt-6 h-72 w-full aspect-auto" aria-label="Gráfico de ingresos mensuales">
          <BarChart data={meses} accessibilityLayer margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="nombre" tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis width={58} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toLocaleString("es-NI")} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-medium tabular-nums">{formatearPrecio(Number(v))}</span>} />} />
            <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={100} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        <dl className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-3">{meses.map((m) => <div key={m.mes}><dt className="text-sm text-muted-foreground">{m.nombre} · {m.cantidad} ventas</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{formatearPrecio(m.total)}</dd></div>)}</dl>
      </section>
      <section className="mt-10 border-t pt-8" aria-labelledby="rotacion">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="rotacion" className="text-2xl font-bold">Rotación de productos</h2><Badge variant="warning">{bajas} de baja rotación</Badge></div>
        <p className="mt-2 text-sm text-muted-foreground">{formatearFecha(data.inicioRotacion)} — {formatearFecha(data.finRotacion)} · 90 días · baja rotación: ≤ 3 unidades</p>
        <div className="mt-5 border-y"><Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Producto</TableHead><TableHead className="text-right">Unidades vendidas</TableHead><TableHead className="text-right">Existencias</TableHead><TableHead>Rotación</TableHead></TableRow></TableHeader><TableBody>
          {data.rotacion.map((p) => <TableRow key={p.id}><TableCell className="font-mono text-xs">{p.codigo}</TableCell><TableCell className="min-w-40 font-medium">{p.nombre}</TableCell><TableCell className="text-right tabular-nums">{p.unidades}</TableCell><TableCell className="text-right tabular-nums">{p.stock}</TableCell><TableCell><Badge variant={p.clasificacion === "Baja rotación" ? "warning" : "secondary"} className="whitespace-nowrap">{p.clasificacion}</Badge></TableCell></TableRow>)}
          {data.rotacion.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay productos registrados.</TableCell></TableRow>}
        </TableBody></Table></div>
      </section>
    </main>
  </div>;
}
function Indicador({ icon: Icon, titulo, valor, detalle }: { icon: typeof Receipt; titulo: string; valor: string; detalle: string }) {
  return <div className="min-w-0 rounded-lg border bg-surface p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-muted-foreground">{titulo}</p><Icon className="size-5 shrink-0 text-primary" /></div><p className="mt-4 break-words text-3xl font-bold tabular-nums">{valor}</p><p className="mt-2 text-sm capitalize text-muted-foreground">{detalle}</p></div>;
}