import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import Login from "../pages/Login";
import { LoadingState } from "./ui";

/**
 * Guardia de las rutas administrativas: si no hay sesión iniciada muestra el
 * login; si la hay, renderiza el panel. La sesión persiste en el navegador.
 */
export default function RequireAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setVerificando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (verificando) return <LoadingState />;
  if (!session) return <Login />;
  return <Outlet />;
}
