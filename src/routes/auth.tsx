import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Marca } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Farmacia San Judas SIG" },
      { name: "description", content: "Acceso del personal de Farmacia San Judas al sistema." },
      { property: "og:title", content: "Iniciar sesión — Farmacia San Judas SIG" },
      {
        property: "og:description",
        content: "Acceso del personal de Farmacia San Judas al sistema.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "registro">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/productos" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/productos` },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/productos" });
        } else {
          toast.success("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");
          setModo("entrar");
        }
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      toast.error(
        mensaje === "Invalid login credentials" ? "Correo o contraseña incorrectos." : mensaje,
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="bg-pattern-cross grid min-h-screen place-items-center px-4">
      <div className="panel animate-rise w-full max-w-sm p-8">
        <Marca subtitulo="Acceso del personal" />
        <h1 className="mt-8 text-2xl font-bold">
          {modo === "entrar" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Un momento…" : modo === "entrar" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setModo(modo === "entrar" ? "registro" : "entrar")}
          className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {modo === "entrar" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  );
}
