// Correspondencia entre el tipo de una clase y el tipo que habilita cada plan.
//
// Los dos lados pueden nombrar VARIOS tipos separados por "/", "&", "+", ","
// o " y ": una clase "Hatha / Vinyasa" sirve para quien tenga plan "Hatha", y
// un plan "Hatha & Kuruntas" habilita las clases de ambos tipos. Por eso cada
// lado se convierte en una lista y alcanza con que compartan un tipo.

import type { Alumno, Clase, Plan } from "./types";

export const TIPO_TODOS = "todos los tipos";

const ACENTOS = /[̀-ͯ]/g;
const SEPARADORES = /[/&+,]|\sy\s/;

/** Lista de tipos que nombra un texto, normalizados (sin acentos ni mayúsculas). */
export function tokensDeTipo(tipo: string): string[] {
  return tipo
    .toLowerCase()
    .normalize("NFD")
    .replace(ACENTOS, "")
    .split(SEPARADORES)
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Tipos de clase que habilitan los planes asignados al alumno. */
export function tiposDelAlumno(alumno: Alumno, planes: Plan[]): string[] {
  return [
    ...new Set(
      planes.filter((p) => alumno.plan_ids.includes(p.id)).map((p) => p.tipo_clase)
    ),
  ];
}

/** True si esos tipos de plan habilitan la clase indicada. */
export function tiposHabilitanClase(tipos: string[], clase: Clase): boolean {
  const deClase = tokensDeTipo(clase.tipo_clase);
  if (deClase.includes(TIPO_TODOS)) return true;

  return tipos.some((t) => {
    const delPlan = tokensDeTipo(t);
    if (delPlan.includes(TIPO_TODOS)) return true;
    return delPlan.some((tipo) => deClase.includes(tipo));
  });
}
