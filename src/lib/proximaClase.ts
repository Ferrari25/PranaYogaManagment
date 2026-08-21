// Calcula cuál es, entre todas las clases del estudio, la próxima que se
// dicta en el calendario real (hoy, mañana, o varios días después — la que
// corresponda cronológicamente).

import type { Clase } from "./types";
import { DIAS_SEMANA } from "./types";

/**
 * Próxima ocurrencia de una clase: su fecha (YYYY-MM-DD) y el instante exacto
 * en que arranca. Si la clase es hoy y todavía no pasaron `minutosCorte`
 * desde que empezó, la ocurrencia de hoy sigue siendo la "próxima"; una vez
 * pasado ese margen, salta directo a la semana siguiente.
 */
export function proximaOcurrencia(
  clase: Pick<Clase, "dia_semana" | "hora_inicio">,
  ahora: Date = new Date(),
  minutosCorte = 10
): { fecha: string; instante: Date } {
  const objetivo = (DIAS_SEMANA.indexOf(clase.dia_semana) + 1) % 7; // getDay(): Domingo=0
  const [h, m] = clase.hora_inicio.split(":").map(Number);

  const candidato = new Date(ahora);
  candidato.setHours(0, 0, 0, 0);
  while (candidato.getDay() !== objetivo) {
    candidato.setDate(candidato.getDate() + 1);
  }
  candidato.setHours(h, m, 0, 0);

  // Si esa ocurrencia (normalmente la de hoy) ya pasó el margen, es la de
  // la semana próxima.
  const limite = new Date(candidato.getTime() + minutosCorte * 60_000);
  if (ahora >= limite) {
    candidato.setDate(candidato.getDate() + 7);
  }

  const anio = candidato.getFullYear();
  const mes = String(candidato.getMonth() + 1).padStart(2, "0");
  const dia = String(candidato.getDate()).padStart(2, "0");
  return { fecha: `${anio}-${mes}-${dia}`, instante: candidato };
}

/** La clase que, entre todas, se dicta primero a partir de ahora. */
export function claseSiguiente(
  clases: Clase[],
  ahora: Date = new Date()
): { clase: Clase; fecha: string; instante: Date } | null {
  let mejor: { clase: Clase; fecha: string; instante: Date } | null = null;
  for (const clase of clases) {
    const { fecha, instante } = proximaOcurrencia(clase, ahora);
    if (!mejor || instante < mejor.instante) {
      mejor = { clase, fecha, instante };
    }
  }
  return mejor;
}
