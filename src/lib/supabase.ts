import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True cuando las variables de entorno de Supabase están configuradas. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// Si falta configuración, la app muestra una pantalla de ayuda (ver App.tsx)
// en lugar de romperse: el cliente se crea con valores placeholder inertes.
export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder"
);
