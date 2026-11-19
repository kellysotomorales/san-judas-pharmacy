import { Cross } from "lucide-react";

export function Marca({ subtitulo = "SIG" }: { subtitulo?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Cross className="size-5" strokeWidth={2.5} />
      </span>
      <div className="leading-tight">
        <p className="font-display text-lg font-bold tracking-tight">Farmacia San Judas</p>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {subtitulo}
        </p>
      </div>
    </div>
  );
}
