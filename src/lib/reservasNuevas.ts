// Aviso de reservas nuevas en el sidebar: se consideran "nuevas" las reservas
// confirmadas creadas después de la última visita a la pantalla de Reservas.
// El registro de "última visita" es local a cada dispositivo (localStorage).

import type { Reserva } from "./types";

const CLAVE_ULTIMA_VISITA = "prana_reservas_ultima_visita";
export const EVENTO_RESERVAS_VISTAS = "prana-reservas-vistas";

/** Marca este momento como "ya vi las reservas" y avisa al sidebar. */
export function marcarReservasVistas(): void {
  localStorage.setItem(CLAVE_ULTIMA_VISITA, String(Date.now()));
  window.dispatchEvent(new Event(EVENTO_RESERVAS_VISTAS));
}

/** Cantidad de reservas confirmadas creadas desde la última visita. */
export function contarReservasNuevas(reservas: Reserva[]): number {
  const ultimaVisita = Number(localStorage.getItem(CLAVE_ULTIMA_VISITA) ?? 0);
  return reservas.filter(
    (r) => r.estado === "confirmada" && new Date(r.created_at).getTime() > ultimaVisita
  ).length;
}
