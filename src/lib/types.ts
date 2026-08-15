// Tipos del dominio. Los nombres de campos coinciden 1:1 con las columnas de
// Supabase, de modo que no se necesita ninguna capa de mapeo.

export interface Plan {
  id: string;
  nombre: string;
  tipo_clase: string;
  dias_semana: number;
  precio: number;
  descripcion: string;
  activo: boolean;
}

export interface Alumno {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  direccion: string;
  fecha_alta: string; // YYYY-MM-DD
  asistencias_count: number;
  activo: boolean;
  /** Ids de planes asignados (tabla alumno_planes), cargados por la API. */
  plan_ids: string[];
}

export type EstadoPago = "pendiente" | "completado";

export interface Pago {
  id: string;
  alumno_id: string;
  concepto: string;
  monto: number;
  modalidad_pago: string;
  estado: EstadoPago;
  fecha_pago: string; // YYYY-MM-DD
  notas: string;
}

export const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];

export interface Clase {
  id: string;
  nombre: string;
  instructor: string;
  dia_semana: DiaSemana;
  hora_inicio: string; // HH:MM
  hora_fin: string; // HH:MM
  cupo_maximo: number;
}

export type EstadoReserva = "confirmada" | "cancelada";

export interface Reserva {
  id: string;
  clase_id: string;
  alumno_nombre: string;
  alumno_telefono: string;
  fecha_reserva: string; // YYYY-MM-DD
  estado: EstadoReserva;
}

export const MODALIDADES_PAGO = [
  "Efectivo",
  "Transferencia",
  "Mercado Pago",
  "Tarjeta de débito",
  "Tarjeta de crédito",
] as const;
