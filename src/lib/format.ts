/** Formatea un monto en pesos: 16000 -> "$16.000" */
export function formatPrecio(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`;
}

/** Formatea una fecha ISO (YYYY-MM-DD) como DD/MM/YYYY. */
export function formatFecha(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${Number(d)}/${Number(m)}/${y}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (zona horaria local). */
export function hoyIso(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Nombre del día de la semana de hoy, en español. */
export function hoyDiaSemana(): string {
  return ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][
    new Date().getDay()
  ];
}

/** Recorta una hora "HH:MM:SS" de Postgres a "HH:MM". */
export function formatHora(hora: string): string {
  return hora ? hora.slice(0, 5) : "";
}

/** Formatea un timestamp ISO (con hora) como "DD/MM/YYYY · HH:MM". */
export function formatFechaHora(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const fecha = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fecha} · ${hora}`;
}

/** Link directo a WhatsApp a partir de un teléfono argentino, con mensaje opcional. */
export function whatsappUrl(telefono: string, mensaje?: string): string {
  const digits = telefono.replace(/\D/g, "");
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/549${digits}${texto}`;
}

/** Mes actual en formato YYYY-MM. */
export function mesActualIso(): string {
  return hoyIso().slice(0, 7);
}

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Formatea un mes YYYY-MM como "Agosto 2026". */
export function formatMes(mesIso: string): string {
  const [anio, mes] = mesIso.split("-").map(Number);
  return `${NOMBRES_MESES[mes - 1] ?? ""} ${anio}`;
}

/** Suma o resta meses a un YYYY-MM. */
export function sumarMeses(mesIso: string, delta: number): string {
  const [anio, mes] = mesIso.split("-").map(Number);
  const d = new Date(anio, mes - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Suma meses a una fecha YYYY-MM-DD manteniendo el día (ancla de la cuota).
 * Si el mes destino es más corto, ajusta al último día (31/1 -> 28/2).
 */
export function sumarMesesFecha(fechaIso: string, delta: number): string {
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const totalMeses = mes - 1 + delta;
  const anioDestino = anio + Math.floor(totalMeses / 12);
  const mesDestino = ((totalMeses % 12) + 12) % 12;
  const ultimoDia = new Date(anioDestino, mesDestino + 1, 0).getDate();
  const diaDestino = Math.min(dia, ultimoDia);
  return `${anioDestino}-${String(mesDestino + 1).padStart(2, "0")}-${String(diaDestino).padStart(2, "0")}`;
}

/** Suma exactamente 1 hora a una hora HH:MM (formato 24 hs). */
export function sumarUnaHora(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Opciones de horario en formato 24 hs, cada 10 minutos (06:00 a 22:00). */
export const HORARIOS_24HS: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h < 22; h++) {
    for (let m = 0; m < 60; m += 10) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  out.push("22:00");
  return out;
})();

/** Nombre completo de un alumno. */
export function nombreCompleto(a: { nombre: string; apellido: string }): string {
  return `${a.nombre} ${a.apellido}`.trim();
}
