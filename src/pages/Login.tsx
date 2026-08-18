import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { LogIn, CalendarCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Button, Field, Input } from "../components/ui";
import { Logo } from "../components/Logo";

/**
 * Acceso al panel administrativo. La sesión queda guardada en el navegador,
 * así que solo hace falta iniciar sesión una vez por dispositivo.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos. Revisá los datos e intentá de nuevo."
          : authError.message
      );
      setEntrando(false);
    }
    // Si el login es correcto, RequireAuth detecta la sesión y muestra el panel.
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <Logo className="w-16 h-16" />
            <h1 className="text-2xl font-bold mt-3">PRANA YOGA</h1>
            <p className="text-muted-foreground mt-1">
              Panel de administración. Ingresá con tu usuario del estudio.
            </p>
          </div>

          <form onSubmit={entrar} className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pranayoga.com"
              />
            </Field>
            <Field label="Contraseña">
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
              />
            </Field>

            {error && <p className="text-danger font-semibold">{error}</p>}

            <Button type="submit" disabled={entrando} className="w-full text-lg py-4">
              <LogIn className="w-5 h-5" />
              {entrando ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </div>

        {/* Los clientes que lleguen acá por error pueden ir a reservar */}
        <Link
          to="/reservas-alumnos"
          className="mt-4 flex items-center justify-center gap-2 text-primary-dark font-semibold hover:underline"
        >
          <CalendarCheck className="w-5 h-5" />
          ¿Venís a reservar una clase? Entrá acá
        </Link>
      </div>
    </div>
  );
}
