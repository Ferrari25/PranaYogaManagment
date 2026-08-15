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

/** Parte de un pago dividido: método y monto parcial. */
export interface MetodoPago {
  metodo: string;
  monto: number;
}

export interface Pago {
  id: string;
  alumno_id: string;
  concepto: string;
  monto: number;
  /** Resumen legible de los métodos usados, ej: "Efectivo + Transferencia". */
  modalidad_pago: string;
  /** Detalle del pago dividido; suma siempre igual a `monto`. */
  metodos_pago: MetodoPago[];
  /** Mes de la cuota que se paga (YYYY-MM), independiente de la fecha de cobro. */
  mes_imputacion: string;
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
  hora_inicio: string; // HH:MM (formato 24 hs)
  /** Siempre 1 hora después de hora_inicio; se calcula automáticamente. */
  hora_fin: string; // HH:MM
  cupo_maximo: number;
  /** Ids de alumnos fijos inscriptos (tabla clase_alumnos), cargados por la API. */
  alumno_ids: string[];
}

export type EstadoReserva = "confirmada" | "cancelada";

export interface Reserva {
  id: string;
  clase_id: string;
  alumno_nombre: string;
  alumno_telefono: string;
  fecha_reserva: string; // YYYY-MM-DD
  estado: EstadoReserva;
  created_at: string; // timestamp de creación, para detectar reservas nuevas
}

export const MODALIDADES_PAGO = [
  "Efectivo",
  "Transferencia",
  "Mercado Pago",
  "Tarjeta de débito",
  "Tarjeta de crédito",
] as const;

// ---------------------------------------------------------------------------
// Masajes & Reiki: módulo independiente del yoga (no comparte alumnos,
// planes ni métricas con las clases).
// ---------------------------------------------------------------------------

export interface ServicioTerapia {
  id: string;
  nombre: string;
  precio: number;
  duracion_minutos: number;
  activo: boolean;
}

export type EstadoTurno = "cobrado" | "pendiente";

export interface TurnoTerapia {
  id: string;
  servicio_id: string | null;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  monto: number;
  modalidad_pago: string;
  estado: EstadoTurno;
  notas: string;
}
