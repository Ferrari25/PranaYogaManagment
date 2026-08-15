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

/** Link directo a WhatsApp a partir de un teléfono argentino. */
export function whatsappUrl(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  return `https://wa.me/549${digits}`;
}

/** Nombre completo de un alumno. */
export function nombreCompleto(a: { nombre: string; apellido: string }): string {
  return `${a.nombre} ${a.apellido}`.trim();
}
