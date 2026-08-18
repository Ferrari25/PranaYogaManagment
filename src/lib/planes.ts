// Correspondencia entre el tipo de clase y el tipo que habilita cada plan.
// Ambos lados guardan el tipo de forma explícita (clases.tipo_clase y
// planes.tipo_clase): la comparación es exacta salvo mayúsculas, acentos y
// espacios, para no caer en adivinanzas por palabras sueltas.

import type { Alumno, Clase, Plan } from "./types";

export const TIPO_TODOS = "todos los tipos";

const ACENTOS = /[̀-ͯ]/g;

export function normalizarTipo(tipo: string): string {
  return tipo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(ACENTOS, "")
    .replace(/\s+/g, " ");
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
  const tipoClase = normalizarTipo(clase.tipo_clase);
  if (tipoClase === TIPO_TODOS) return true;
  return tipos.some((t) => {
    const tipoPlan = normalizarTipo(t);
    return tipoPlan === TIPO_TODOS || tipoPlan === tipoClase;
  });
}
