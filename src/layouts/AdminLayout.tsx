import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CreditCard,
  History,
  Sparkles,
  HeartHandshake,
  BookmarkCheck,
  LogOut,
} from "lucide-react";
import clsx from "clsx";
import { Logo } from "../components/Logo";
import { supabase } from "../lib/supabase";
import { getReservas } from "../lib/api";
import { contarReservasNuevas, EVENTO_RESERVAS_VISTAS } from "../lib/reservasNuevas";

const navegacion = [
  { nombre: "Inicio", href: "/", icono: LayoutDashboard },
  { nombre: "Clases", href: "/clases", icono: CalendarDays },
  { nombre: "Alumnos", href: "/alumnos", icono: Users },
  { nombre: "Pagos", href: "/pagos", icono: CreditCard },
  { nombre: "Histórico Mensual", href: "/historico", icono: History },
  { nombre: "Planes", href: "/planes", icono: Sparkles },
  { nombre: "Masajes & Reiki", href: "/terapias", icono: HeartHandshake },
  { nombre: "Reservas", href: "/reservas", icono: BookmarkCheck },
];

export default function AdminLayout() {
  const [reservasNuevas, setReservasNuevas] = useState(0);

  // Recalcula el aviso al abrir el panel, cada minuto, y cuando la pantalla
  // de Reservas marca todo como visto.
  useEffect(() => {
    let activo = true;
    const calcular = () => {
      getReservas()
        .then((reservas) => {
          if (activo) setReservasNuevas(contarReservasNuevas(reservas));
        })
        .catch(() => {
          /* sin conexión o sin permisos: el aviso simplemente no se muestra */
        });
    };
    calcular();
    const timer = setInterval(calcular, 60_000);
    window.addEventListener(EVENTO_RESERVAS_VISTAS, calcular);
    return () => {
      activo = false;
      clearInterval(timer);
      window.removeEventListener(EVENTO_RESERVAS_VISTAS, calcular);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-card border-b md:border-b-0 md:border-r border-border md:min-h-screen flex flex-col shadow-sm shrink-0">
        {/* Branding */}
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl p-1 shadow-sm border border-border">
            <Logo className="w-full h-full" />
          </div>
          <div>
            <p className="font-serif text-lg font-bold tracking-wider leading-none">PRANA YOGA</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-1">
              Estudio &amp; Bienestar
            </p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navegacion.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icono className="w-5 h-5 shrink-0" />
              <span className="flex-1">{item.nombre}</span>
              {item.href === "/reservas" && reservasNuevas > 0 && (
                <span
                  className="min-w-6 h-6 px-1.5 rounded-full bg-danger text-white text-sm font-bold flex items-center justify-center"
                  title={`${reservasNuevas} reserva(s) nueva(s)`}
                >
                  {reservasNuevas}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer: perfil administrador + cierre de sesión */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-sm shrink-0">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Administración</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success inline-block" />
                Sesión iniciada
              </p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-danger transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="p-5 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
