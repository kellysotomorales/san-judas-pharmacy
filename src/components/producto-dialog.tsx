import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

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
import { productoFormSchema, type ProductoForm } from "@/lib/inventario";
import { guardarProducto, type Categoria, type Producto } from "@/lib/productos";

type Campos = Record<keyof ProductoForm, string>;

const vacio: Campos = {
  codigo: "",
  nombre: "",
  categoriaId: "",
  precio: "",
  stock: "",
  stockMinimo: "",
  fechaVencimiento: "",
};

function camposDe(p: Producto | undefined): Campos {
  if (!p) return vacio;
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    categoriaId: String(p.categoriaId),
    precio: p.precio.toFixed(2),
    stock: String(p.stock),
    stockMinimo: String(p.stockMinimo),
    fechaVencimiento: p.fechaVencimiento,
  };
}

export function ProductoDialog({
  abierto,
  onAbiertoChange,
  producto,
  categorias,
}: {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  producto?: Producto | undefined;
  categorias: Categoria[];
}) {
  const queryClient = useQueryClient();
  const [campos, setCampos] = useState<Campos>(() => camposDe(producto));
  const [errores, setErrores] = useState<Partial<Record<keyof ProductoForm, string>>>({});

  useEffect(() => {
    if (abierto) {
      setCampos(camposDe(producto));
      setErrores({});
    }
  }, [abierto, producto]);

  const mutation = useMutation({
    mutationFn: (datos: ProductoForm) => guardarProducto(datos, producto?.id),
    onSuccess: async (_, datos) => {
      await queryClient.invalidateQueries({ queryKey: ["productos"] });
      toast.success(producto ? `Se guardaron los cambios de ${datos.nombre}.` : `Se creó ${datos.nombre}.`);
      onAbiertoChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  });

  function cambiar(campo: keyof Campos, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const resultado = productoFormSchema.safeParse(campos);
    if (!resultado.success) {
      const nuevos: Partial<Record<keyof ProductoForm, string>> = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as keyof ProductoForm;
        nuevos[campo] ??= issue.message;
      }
      setErrores(nuevos);
      return;
    }
    mutation.mutate(resultado.data);
  }

  const campo = (id: keyof Campos, etiqueta: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input
        id={id}
        value={campos[id]}
        onChange={(e) => cambiar(id, e.target.value)}
        aria-invalid={!!errores[id]}
        {...props}
      />
      {errores[id] && <p className="text-xs text-destructive">{errores[id]}</p>}
    </div>
  );

  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{producto ? `Editar ${producto.nombre}` : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {producto
              ? "Los cambios se guardan directamente en el inventario."
              : "El producto quedará registrado en el inventario."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {campo("codigo", "Código", { maxLength: 30, className: "font-mono" })}
          <div className="space-y-1.5">
            <Label htmlFor="categoriaId">Categoría</Label>
            <Select value={campos.categoriaId} onValueChange={(v) => cambiar("categoriaId", v)}>
              <SelectTrigger id="categoriaId" aria-invalid={!!errores.categoriaId}>
                <SelectValue placeholder="Elige una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errores.categoriaId && <p className="text-xs text-destructive">{errores.categoriaId}</p>}
          </div>
          <div className="sm:col-span-2">{campo("nombre", "Nombre", { maxLength: 150 })}</div>
          {campo("precio", "Precio (C$)", { type: "number", inputMode: "decimal", min: 0.01, step: 0.01 })}
          {campo("fechaVencimiento", "Fecha de vencimiento", { type: "date" })}
          <div>
            {campo(
              "stock",
              producto ? "Stock" : "Stock inicial",
              { type: "number", inputMode: "numeric", min: 0, step: 1, disabled: !!producto },
            )}
            {producto && (
              <p className="mt-1 text-xs text-muted-foreground">El stock cambia solo con las ventas.</p>
            )}
          </div>
          {campo("stockMinimo", "Stock mínimo", { type: "number", inputMode: "numeric", min: 0, step: 1 })}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onAbiertoChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : producto ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
