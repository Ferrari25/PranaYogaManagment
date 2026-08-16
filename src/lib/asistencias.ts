// Reglas de asistencia y recuperación de clases.
//
// * Cupo mensual del alumno = suma de (días por semana de cada plan × 4).
// * Cada ausencia en una clase común suma 1 clase a favor.
// * Cada recuperación (asistir a otra clase usando el crédito) resta 1.
//   Si falta a la recuperación, el crédito igual se consume (se puede
//   devolver eliminando ese registro desde la lista).

import type { Alumno, Asistencia, Plan } from "./types";

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

/** Clases efectivamente usadas (presentes) por el alumno en un mes YYYY-MM. */
export function usadasEnMes(alumnoId: string, asistencias: Asistencia[], mes: string): number {
  return asistencias.filter(
    (a) => a.alumno_id === alumnoId && a.presente && a.fecha.startsWith(mes)
  ).length;
}

/** Total histórico de presentes del alumno (para la tabla de Alumnos). */
export function totalPresentes(alumnoId: string, asistencias: Asistencia[]): number {
  return asistencias.filter((a) => a.alumno_id === alumnoId && a.presente).length;
}
