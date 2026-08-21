// Reglas de asistencia y recuperación de clases.
//
// * Cupo mensual del alumno = suma de (días por semana de cada plan × 4).
// * Cada ausencia en una clase común suma 1 clase a favor.
// * Cada recuperación (asistir a otra clase usando el crédito) resta 1.
//   Si falta a la recuperación, el crédito igual se consume (se puede
//   devolver eliminando ese registro desde la lista).
// * Reservar una clase (desde /reservas-alumnos) resta 1 clase usada del mes
//   apenas se reserva, haya asistido o no: el alumno ocupó un lugar que le
//   podría haber tocado a otra persona. Si el profesor cancela esa reserva,
//   deja de contar automáticamente (se calcula solo sobre reservas activas).

import type { Alumno, Asistencia, Plan, Reserva } from "./types";

/** Saldo de clases a favor del alumno (ausencias comunes − recuperaciones). */
export function clasesAFavor(alumnoId: string, asistencias: Asistencia[]): number {
  let credito = 0;
  for (const a of asistencias) {
    if (a.alumno_id !== alumnoId) continue;
    if (a.es_recuperacion) credito -= 1;
    else if (!a.presente) credito += 1;
  }
  return credito;
}

/** Clases mensuales que le corresponden al alumno según sus planes. */
export function cupoMensual(alumno: Alumno, planes: Plan[]): number {
  return planes
    .filter((p) => alumno.plan_ids.includes(p.id))
    .reduce((sum, p) => sum + p.dias_semana * 4, 0);
}

/**
 * Clases usadas por el alumno en un mes YYYY-MM: presentes (asistencia
 * tomada) más reservas confirmadas de ese mes (cuentan apenas se reservan,
 * sin esperar a que se tome asistencia).
 */
export function usadasEnMes(
  alumnoId: string,
  asistencias: Asistencia[],
  reservas: Reserva[],
  mes: string
): number {
  const porAsistencia = asistencias.filter(
    (a) => a.alumno_id === alumnoId && a.presente && a.fecha.startsWith(mes)
  ).length;

  const porReserva = reservas.filter((r) => {
    if (r.alumno_id !== alumnoId || r.estado !== "confirmada") return false;
    if (!r.fecha_reserva.startsWith(mes)) return false;
    // Evita el doble conteo si esa misma clase y fecha ya quedó registrada
    // como asistencia (por ejemplo, si el profesor también pasó lista).
    const yaContadaComoAsistencia = asistencias.some(
      (a) => a.alumno_id === alumnoId && a.clase_id === r.clase_id && a.fecha === r.fecha_reserva
    );
    return !yaContadaComoAsistencia;
  }).length;

  return porAsistencia + porReserva;
}

/** Total histórico de presentes del alumno (para la tabla de Alumnos). */
export function totalPresentes(alumnoId: string, asistencias: Asistencia[]): number {
  return asistencias.filter((a) => a.alumno_id === alumnoId && a.presente).length;
}
