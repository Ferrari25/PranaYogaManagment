// Estado de la membresía de un alumno, derivado de sus cuotas completadas.
// La cuota del mes M (mes_imputacion) cubre desde el día ancla (día de alta)
// de M hasta el día ancla del mes siguiente: alta el 15/8 -> la cuota de
// Agosto cubre 15/8 al 15/9.

import type { Alumno, Pago } from "./types";
import { formatFecha, hoyIso, sumarMeses } from "./format";

/** Fin de cobertura de la cuota del mes dado: día ancla del mes siguiente. */
function finDeCiclo(mes: string, diaAncla: number): string {
  const mesSiguiente = sumarMeses(mes, 1);
  const [anio, m] = mesSiguiente.split("-").map(Number);
  const ultimoDia = new Date(anio, m, 0).getDate();
  const dia = Math.min(diaAncla, ultimoDia);
  return `${mesSiguiente}-${String(dia).padStart(2, "0")}`;
}

/** Días entre dos fechas YYYY-MM-DD (positivo si `hasta` < `hoy`). */
function diasTranscurridos(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

export interface EstadoMembresia {
  tone: "success" | "warning" | "danger";
  texto: string;
}

/**
 * Estado de cuota del alumno para mostrar en un badge, o null si no tiene
 * planes asignados (no hay cuota que controlar).
 */
export function estadoMembresia(
  alumno: Alumno,
  pagos: Pago[],
  hoy: string = hoyIso()
): EstadoMembresia | null {
  if (!alumno.fecha_alta || alumno.plan_ids.length === 0) return null;

  const diaAncla = Number(alumno.fecha_alta.split("-")[2]);

  // Cobertura: el fin de ciclo más lejano entre las cuotas completadas.
  // Sin cuotas pagas, la cobertura termina el día del alta.
  let hasta = alumno.fecha_alta;
  for (const p of pagos) {
    if (p.alumno_id !== alumno.id || p.estado !== "completado") continue;
    const fin = finDeCiclo(p.mes_imputacion, diaAncla);
    if (fin > hasta) hasta = fin;
  }

  if (hoy < hasta) {
    return { tone: "success", texto: `Al día hasta ${formatFecha(hasta)}` };
  }
  if (hoy === hasta) {
    return { tone: "warning", texto: "Vence hoy" };
  }

  const dias = diasTranscurridos(hasta, hoy);
  if (dias <= 31) {
    return { tone: "danger", texto: `Vencida hace ${dias} ${dias === 1 ? "día" : "días"}` };
  }
  const meses = Math.floor(dias / 30);
  return { tone: "danger", texto: `Vencida hace ${meses} ${meses === 1 ? "mes" : "meses"}` };
}
