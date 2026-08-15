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
} from "lucide-react";
import clsx from "clsx";
import { Logo } from "../components/Logo";

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
              {item.nombre}
            </NavLink>
          ))}
        </nav>

        {/* Footer: perfil administrador simplificado */}
        <div className="p-4 border-t border-border mt-auto hidden md:block">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-sm">
              AD
            </div>
            <div>
              <p className="text-sm font-semibold">Administración</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success inline-block" />
                Estudio activo
              </p>
            </div>
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
