import { useState, type ReactNode } from "react";
import { Users, CalendarDays, TrendingUp, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "../hooks/useData";
import { getAlumnos, getClases, getPagos, sincronizarCuotas } from "../lib/api";
import {
  formatFecha,
  formatHora,
  formatMes,
  formatPrecio,
  hoyDiaSemana,
  mesActualIso,
  nombreCompleto,
  sumarMeses,
} from "../lib/format";
import type { Pago } from "../lib/types";
import { Badge, Button, ErrorState, LoadingState } from "../components/ui";

/** Mes al que corresponde la cuota de un pago. */
function mesDelPago(p: Pago): string {
  return p.mes_imputacion || p.fecha_pago.slice(0, 7);
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 text-muted-foreground">
        {icon}
        <span className="text-sm font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold font-serif mt-3">{value}</p>
      {detail && <p className="text-sm text-muted-foreground mt-1">{detail}</p>}
    </div>
  );
}

export default function Inicio() {
  const alumnos = useData(getAlumnos);
  // Al abrir el panel se generan las cuotas de los ciclos que hayan vencido.
  const pagos = useData(() => sincronizarCuotas().then(getPagos));
  const clases = useData(getClases);
  const [mes, setMes] = useState(mesActualIso());

  if (alumnos.loading || pagos.loading || clases.loading) return <LoadingState />;
  const error = alumnos.error || pagos.error || clases.error;
  if (error) return <ErrorState message={error} />;

  const listaPagos = pagos.data ?? [];
  const listaAlumnos = alumnos.data ?? [];

  // Métricas del mes seleccionado, por mes de cuota (mes_imputacion): la
  // cuota de septiembre no aparece en "por cobrar" mientras mirás agosto.
  const ingresosMes = listaPagos
    .filter((p) => p.estado === "completado" && mesDelPago(p) === mes)
    .reduce((sum, p) => sum + Number(p.monto), 0);

  const pendientes = listaPagos.filter((p) => p.estado === "pendiente" && mesDelPago(p) === mes);
  const totalPendiente = pendientes.reduce((sum, p) => sum + Number(p.monto), 0);

  const clasesHoy = (clases.data ?? []).filter((c) => c.dia_semana === hoyDiaSemana());

  const nombreAlumno = (id: string) => {
    const a = listaAlumnos.find((x) => x.id === id);
    return a ? nombreCompleto(a) : "Alumno";
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inicio</h1>
          <p className="text-muted-foreground mt-1">Resumen general del estudio.</p>
        </div>
        {/* Selector de mes para las métricas de cobros */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <p className="text-xl font-bold font-serif min-w-44 text-center">{formatMes(mes)}</p>
          <Button variant="outline" onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Alumnos activos"
          value={String(listaAlumnos.length)}
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5" />}
          label="Clases de hoy"
          value={String(clasesHoy.length)}
          detail={hoyDiaSemana()}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Ingresos del mes"
          value={formatPrecio(ingresosMes)}
          detail={`Cuotas de ${formatMes(mes)} cobradas`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Por cobrar"
          value={formatPrecio(totalPendiente)}
          detail={`${pendientes.length} cuota(s) de ${formatMes(mes)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Clases de hoy */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Clases de hoy</h2>
          {clasesHoy.length === 0 ? (
            <p className="text-muted-foreground">No hay clases programadas para hoy.</p>
          ) : (
            <ul className="space-y-3">
              {clasesHoy.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{c.nombre}</p>
                    <p className="text-sm text-muted-foreground">{c.instructor}</p>
                  </div>
                  <Badge tone="primary">
                    {formatHora(c.hora_inicio)} – {formatHora(c.hora_fin)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pagos pendientes del mes seleccionado */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Pagos pendientes de {formatMes(mes)}</h2>
          {pendientes.length === 0 ? (
            <p className="text-muted-foreground">No hay pagos pendientes este mes. ¡Todo al día!</p>
          ) : (
            <ul className="space-y-3">
              {pendientes.slice(0, 6).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{nombreAlumno(p.alumno_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.concepto} · {formatFecha(p.fecha_pago)}
                    </p>
                  </div>
                  <Badge tone="warning">{formatPrecio(Number(p.monto))}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
