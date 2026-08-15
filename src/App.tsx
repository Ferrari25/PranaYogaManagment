import { createBrowserRouter, RouterProvider } from "react-router";
import AdminLayout from "./layouts/AdminLayout";
import RequireAuth from "./components/RequireAuth";
import Inicio from "./pages/Inicio";
import Clases from "./pages/Clases";
import Alumnos from "./pages/Alumnos";
import Pagos from "./pages/Pagos";
import Planes from "./pages/Planes";
import HistoricoMensual from "./pages/HistoricoMensual";
import MasajesReiki from "./pages/MasajesReiki";
import ReservasAdmin from "./pages/ReservasAdmin";
import ReservasPublicas from "./pages/ReservasPublicas";
import { isSupabaseConfigured } from "./lib/supabase";

const router = createBrowserRouter([
  // Vista pública para clientes: sin login y sin sidebar de administración
  { path: "/book", Component: ReservasPublicas },
  {
    path: "/",
    Component: RequireAuth, // todo lo administrativo exige sesión iniciada
    children: [
      {
        Component: AdminLayout,
        children: [
          { index: true, Component: Inicio },
          { path: "clases", Component: Clases },
          { path: "alumnos", Component: Alumnos },
          { path: "pagos", Component: Pagos },
          { path: "historico", Component: HistoricoMensual },
          { path: "planes", Component: Planes },
          { path: "terapias", Component: MasajesReiki },
          { path: "reservas", Component: ReservasAdmin },
        ],
      },
    ],
  },
]);

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-3">Falta configurar Supabase</h1>
          <p className="text-muted-foreground">
            Copiá el archivo <code className="font-mono bg-muted px-1.5 py-0.5 rounded">.env.example</code>{" "}
            como <code className="font-mono bg-muted px-1.5 py-0.5 rounded">.env</code>, completá{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> y{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>{" "}
            con los datos de tu proyecto, y reiniciá el servidor. Los pasos completos están en{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded">DEPLOY.md</code>.
          </p>
        </div>
      </div>
    );
  }
  return <RouterProvider router={router} />;
}
