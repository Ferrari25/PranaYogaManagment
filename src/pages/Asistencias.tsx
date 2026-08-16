import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useData } from "../hooks/useData";
import { getAlumnos, getAsistencias, getPlanes } from "../lib/api";
import { formatMes, mesActualIso, nombreCompleto, sumarMeses } from "../lib/format";
import { clasesAFavor, cupoMensual, usadasEnMes } from "../lib/asistencias";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/ui";

const LETRAS_DIA = ["D", "L", "M", "X", "J", "V", "S"];

/** Días hábiles (lunes a viernes) del mes YYYY-MM, como día del mes. */
function diasHabiles(mes: string): { dia: number; letra: string; fecha: string }[] {
  const [anio, m] = mes.split("-").map(Number);
  const total = new Date(anio, m, 0).getDate();
  const dias: { dia: number; letra: string; fecha: string }[] = [];
  for (let d = 1; d <= total; d++) {
    const diaSemana = new Date(anio, m - 1, d).getDay();
    if (diaSemana === 0 || diaSemana === 6) continue; // sin fines de semana
    dias.push({
      dia: d,
      letra: LETRAS_DIA[diaSemana],
      fecha: `${mes}-${String(d).padStart(2, "0")}`,
    });
  }
  return dias;
}

export default function Asistencias() {
  const alumnos = useData(getAlumnos);
  const planes = useData(getPlanes);
  const asistencias = useData(getAsistencias);
  const [mes, setMes] = useState(mesActualIso());

  const dias = useMemo(() => diasHabiles(mes), [mes]);

  if (alumnos.loading || planes.loading || asistencias.loading) return <LoadingState />;
  const err = alumnos.error || planes.error || asistencias.error;
  if (err) return <ErrorState message={err} />;

  const listaAsistencias = asistencias.data ?? [];
  const conPlan = (alumnos.data ?? []).filter((a) => a.plan_ids.length > 0);

  /** Marcas del alumno para una fecha (puede tener más de una clase ese día). */
  const marcasDelDia = (alumnoId: string, fecha: string) =>
    listaAsistencias.filter((a) => a.alumno_id === alumnoId && a.fecha === fecha);

  return (
    <div>
      <PageHeader
        title="Asistencias"
        description="Presentes, ausencias y recuperaciones de cada día del mes (lunes a viernes)."
      />

      {/* Selector de mes */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <p className="text-2xl font-bold font-serif min-w-52 text-center">{formatMes(mes)}</p>
        <Button variant="outline" onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Referencias */}
      <div className="flex gap-4 flex-wrap mb-4 text-sm font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-md bg-success-bg text-success flex items-center justify-center font-bold">✓</span>
          Presente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-md bg-danger-bg text-danger flex items-center justify-center font-bold">✗</span>
          Ausente (suma clase a favor)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-md bg-primary/15 text-primary-dark flex items-center justify-center font-bold">R</span>
          Recuperación
        </span>
      </div>

      {conPlan.length === 0 ? (
        <EmptyState message="No hay alumnos con planes asignados." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="sticky left-0 bg-muted px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Alumno
                </th>
                {dias.map((d) => (
                  <th
                    key={d.fecha}
                    className="px-1.5 py-2 text-center text-xs font-bold text-muted-foreground"
                  >
                    <div>{d.letra}</div>
                    <div>{d.dia}</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-center">
                  Usadas / Cupo
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-center">
                  A favor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {conPlan.map((a) => {
                const usadas = usadasEnMes(a.id, listaAsistencias, mes);
                const cupo = cupoMensual(a, planes.data ?? []);
                const aFavor = clasesAFavor(a.id, listaAsistencias);
                return (
                  <tr key={a.id} className="hover:bg-muted/40">
                    <td className="sticky left-0 bg-card px-4 py-3 font-semibold whitespace-nowrap">
                      {nombreCompleto(a)}
                    </td>
                    {dias.map((d) => {
                      const marcas = marcasDelDia(a.id, d.fecha);
                      return (
                        <td key={d.fecha} className="px-1 py-2 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {marcas.map((m) => (
                              <span
                                key={m.id}
                                className={clsx(
                                  "inline-flex w-6 h-6 rounded-md items-center justify-center text-sm font-bold",
                                  m.es_recuperacion
                                    ? "bg-primary/15 text-primary-dark"
                                    : m.presente
                                      ? "bg-success-bg text-success"
                                      : "bg-danger-bg text-danger"
                                )}
                                title={
                                  m.es_recuperacion
                                    ? "Recuperación"
                                    : m.presente
                                      ? "Presente"
                                      : "Ausente"
                                }
                              >
                                {m.es_recuperacion ? "R" : m.presente ? "✓" : "✗"}
                              </span>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-bold whitespace-nowrap">
                      <span className={usadas > cupo ? "text-danger" : ""}>
                        {usadas} / {cupo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {aFavor > 0 ? <Badge tone="primary">{aFavor}</Badge> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-3">
        El cupo mensual se calcula según los planes del alumno: días por semana × 4. Las
        recuperaciones también cuentan como clases usadas.
      </p>
    </div>
  );
}
