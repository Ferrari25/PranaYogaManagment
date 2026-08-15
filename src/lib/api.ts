// Capa de datos: CRUD directo contra Supabase, sin mapeos intermedios.
// Cada función lanza Error con mensaje legible si Supabase responde con error.

import { supabase } from "./supabase";
import type {
  Alumno,
  Clase,
  Pago,
  Plan,
  Reserva,
  EstadoPago,
  ServicioTerapia,
  TurnoTerapia,
  EstadoTurno,
} from "./types";

function check<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

// ---------------------------------------------------------------------------
// PLANES
// ---------------------------------------------------------------------------
export async function getPlanes(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("planes")
    .select("*")
    .eq("activo", true)
    .order("precio", { ascending: true });
  return check(data, error);
}

export async function createPlan(plan: Omit<Plan, "id" | "activo">): Promise<void> {
  const { error } = await supabase.from("planes").insert(plan);
  check(null, error);
}

export async function updatePlan(id: string, plan: Partial<Plan>): Promise<void> {
  const { error } = await supabase.from("planes").update(plan).eq("id", id);
  check(null, error);
}

export async function deletePlan(id: string): Promise<void> {
  // Borrado lógico: el plan deja de mostrarse pero el historial se conserva.
  const { error } = await supabase.from("planes").update({ activo: false }).eq("id", id);
  check(null, error);
}

// ---------------------------------------------------------------------------
// ALUMNOS
// ---------------------------------------------------------------------------
export async function getAlumnos(): Promise<Alumno[]> {
  const [alumnosRes, planesRes] = await Promise.all([
    supabase.from("alumnos").select("*").eq("activo", true).order("nombre"),
    supabase.from("alumno_planes").select("alumno_id, plan_id"),
  ]);
  const alumnos = check(alumnosRes.data, alumnosRes.error);
  const vinculos = check(planesRes.data, planesRes.error);

  return alumnos.map((a: Omit<Alumno, "plan_ids">) => ({
    ...a,
    plan_ids: vinculos.filter((v) => v.alumno_id === a.id).map((v) => v.plan_id),
  }));
}

export interface AlumnoInput {
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  direccion: string;
  fecha_alta: string;
  plan_ids: string[];
}

/**
 * Crea un alumno, le asigna sus planes y genera automáticamente el primer
 * pago pendiente por el total mensual de los planes elegidos.
 */
export async function createAlumno(input: AlumnoInput, planes: Plan[]): Promise<void> {
  const { plan_ids, ...datos } = input;
  const { data, error } = await supabase.from("alumnos").insert(datos).select("id").single();
  const alumno = check(data, error);

  await setPlanesDeAlumno(alumno.id, plan_ids);

  const elegidos = planes.filter((p) => plan_ids.includes(p.id));
  const total = elegidos.reduce((sum, p) => sum + p.precio, 0);
  if (total > 0) {
    const { error: pagoError } = await supabase.from("pagos").insert({
      alumno_id: alumno.id,
      concepto: elegidos.map((p) => p.nombre).join(" + "),
      monto: total,
      estado: "pendiente",
      fecha_pago: input.fecha_alta,
      mes_imputacion: input.fecha_alta.slice(0, 7),
    });
    check(null, pagoError);
  }
}

export async function updateAlumno(id: string, input: AlumnoInput): Promise<void> {
  const { plan_ids, ...datos } = input;
  const { error } = await supabase.from("alumnos").update(datos).eq("id", id);
  check(null, error);
  await setPlanesDeAlumno(id, plan_ids);
}

async function setPlanesDeAlumno(alumnoId: string, planIds: string[]): Promise<void> {
  const { error: delError } = await supabase
    .from("alumno_planes")
    .delete()
    .eq("alumno_id", alumnoId);
  check(null, delError);

  if (planIds.length > 0) {
    const filas = planIds.map((plan_id) => ({ alumno_id: alumnoId, plan_id }));
    const { error } = await supabase.from("alumno_planes").insert(filas);
    check(null, error);
  }
}

export async function deleteAlumno(id: string): Promise<void> {
  // Borrado lógico: conserva pagos e historial.
  const { error } = await supabase.from("alumnos").update({ activo: false }).eq("id", id);
  check(null, error);
}

export async function registrarAsistencia(alumno: Alumno): Promise<void> {
  const { error } = await supabase
    .from("alumnos")
    .update({ asistencias_count: alumno.asistencias_count + 1 })
    .eq("id", alumno.id);
  check(null, error);
}

// ---------------------------------------------------------------------------
// PAGOS
// ---------------------------------------------------------------------------
export async function getPagos(): Promise<Pago[]> {
  const { data, error } = await supabase
    .from("pagos")
    .select("*")
    .order("fecha_pago", { ascending: false });
  return check(data, error);
}

export async function createPago(pago: Omit<Pago, "id">): Promise<void> {
  const { error } = await supabase.from("pagos").insert(pago);
  check(null, error);
}

export async function updatePago(id: string, pago: Partial<Pago>): Promise<void> {
  const { error } = await supabase.from("pagos").update(pago).eq("id", id);
  check(null, error);
}

export async function setEstadoPago(id: string, estado: EstadoPago): Promise<void> {
  await updatePago(id, { estado });
}

export async function deletePago(id: string): Promise<void> {
  const { error } = await supabase.from("pagos").delete().eq("id", id);
  check(null, error);
}

// ---------------------------------------------------------------------------
// CLASES
// ---------------------------------------------------------------------------
export async function getClases(): Promise<Clase[]> {
  const [clasesRes, inscriptosRes] = await Promise.all([
    supabase.from("clases").select("*").order("hora_inicio"),
    supabase.from("clase_alumnos").select("clase_id, alumno_id"),
  ]);
  const clases = check(clasesRes.data, clasesRes.error);
  const inscriptos = check(inscriptosRes.data, inscriptosRes.error);

  return clases.map((c: Omit<Clase, "alumno_ids">) => ({
    ...c,
    alumno_ids: inscriptos.filter((i) => i.clase_id === c.id).map((i) => i.alumno_id),
  }));
}

export async function createClase(clase: Omit<Clase, "id" | "alumno_ids">): Promise<void> {
  const { error } = await supabase.from("clases").insert(clase);
  check(null, error);
}

/** Inscribe un alumno como asistente fijo de una clase semanal. */
export async function inscribirAlumnoEnClase(claseId: string, alumnoId: string): Promise<void> {
  const { error } = await supabase
    .from("clase_alumnos")
    .insert({ clase_id: claseId, alumno_id: alumnoId });
  check(null, error);
}

export async function removerAlumnoDeClase(claseId: string, alumnoId: string): Promise<void> {
  const { error } = await supabase
    .from("clase_alumnos")
    .delete()
    .eq("clase_id", claseId)
    .eq("alumno_id", alumnoId);
  check(null, error);
}

export async function updateClase(
  id: string,
  clase: Partial<Omit<Clase, "id" | "alumno_ids">>
): Promise<void> {
  const { error } = await supabase.from("clases").update(clase).eq("id", id);
  check(null, error);
}

export async function deleteClase(id: string): Promise<void> {
  const { error } = await supabase.from("clases").delete().eq("id", id);
  check(null, error);
}

// ---------------------------------------------------------------------------
// RESERVAS
// ---------------------------------------------------------------------------
export async function getReservas(): Promise<Reserva[]> {
  const { data, error } = await supabase
    .from("reservas")
    .select("*")
    .order("created_at", { ascending: false });
  return check(data, error);
}

/**
 * Ocupación de reservas confirmadas, sin datos personales: apta para
 * calcular cupos disponibles en la página pública.
 */
export interface OcupacionReserva {
  clase_id: string;
  fecha_reserva: string;
}

export async function getOcupacionReservas(): Promise<OcupacionReserva[]> {
  const { data, error } = await supabase
    .from("reservas")
    .select("clase_id, fecha_reserva")
    .eq("estado", "confirmada");
  return check(data, error);
}

/**
 * Crea una reserva pública validando el cupo real de la clase para esa fecha:
 * lugares = cupo máximo − alumnos fijos inscriptos − reservas confirmadas.
 */
export async function createReserva(
  input: Omit<Reserva, "id" | "estado">,
  cupoMaximo: number
): Promise<void> {
  const [reservasRes, fijosRes] = await Promise.all([
    supabase
      .from("reservas")
      .select("id", { count: "exact", head: true })
      .eq("clase_id", input.clase_id)
      .eq("fecha_reserva", input.fecha_reserva)
      .eq("estado", "confirmada"),
    supabase
      .from("clase_alumnos")
      .select("alumno_id", { count: "exact", head: true })
      .eq("clase_id", input.clase_id),
  ]);
  check(null, reservasRes.error);
  check(null, fijosRes.error);

  const ocupados = (reservasRes.count ?? 0) + (fijosRes.count ?? 0);
  if (ocupados >= cupoMaximo) {
    throw new Error("La clase ya no tiene cupo disponible para esa fecha.");
  }

  const { error } = await supabase.from("reservas").insert({ ...input, estado: "confirmada" });
  check(null, error);
}

export async function cancelarReserva(id: string): Promise<void> {
  const { error } = await supabase.from("reservas").update({ estado: "cancelada" }).eq("id", id);
  check(null, error);
}

// ---------------------------------------------------------------------------
// MASAJES & REIKI: servicios y turnos, módulo independiente del yoga
// ---------------------------------------------------------------------------
export async function getServiciosTerapias(): Promise<ServicioTerapia[]> {
  const { data, error } = await supabase
    .from("servicios_terapias")
    .select("*")
    .eq("activo", true)
    .order("precio", { ascending: true });
  return check(data, error);
}

export async function createServicioTerapia(
  servicio: Omit<ServicioTerapia, "id" | "activo">
): Promise<void> {
  const { error } = await supabase.from("servicios_terapias").insert(servicio);
  check(null, error);
}

export async function updateServicioTerapia(
  id: string,
  servicio: Partial<ServicioTerapia>
): Promise<void> {
  const { error } = await supabase.from("servicios_terapias").update(servicio).eq("id", id);
  check(null, error);
}

export async function deleteServicioTerapia(id: string): Promise<void> {
  // Borrado lógico: los turnos ya registrados conservan la referencia.
  const { error } = await supabase
    .from("servicios_terapias")
    .update({ activo: false })
    .eq("id", id);
  check(null, error);
}

export async function getTurnosTerapias(): Promise<TurnoTerapia[]> {
  const { data, error } = await supabase
    .from("turnos_terapias")
    .select("*")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: true });
  return check(data, error);
}

export async function createTurnoTerapia(turno: Omit<TurnoTerapia, "id">): Promise<void> {
  const { error } = await supabase.from("turnos_terapias").insert(turno);
  check(null, error);
}

export async function updateTurnoTerapia(
  id: string,
  turno: Partial<TurnoTerapia>
): Promise<void> {
  const { error } = await supabase.from("turnos_terapias").update(turno).eq("id", id);
  check(null, error);
}

export async function setEstadoTurno(id: string, estado: EstadoTurno): Promise<void> {
  await updateTurnoTerapia(id, { estado });
}

export async function deleteTurnoTerapia(id: string): Promise<void> {
  const { error } = await supabase.from("turnos_terapias").delete().eq("id", id);
  check(null, error);
}
