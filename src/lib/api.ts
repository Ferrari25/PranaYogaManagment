// Capa de datos: CRUD directo contra Supabase, sin mapeos intermedios.
// Cada función lanza Error con mensaje legible si Supabase responde con error.

import { supabase } from "./supabase";
import { hoyIso, sumarMesesFecha } from "./format";
import type {
  Alumno,
  Asistencia,
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
  telefono_alt: string;
  fecha_nacimiento: string | null;
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
  // Borrado lógico: conserva el historial de pagos completados, pero elimina
  // las cuotas pendientes (nunca se van a cobrar y ensuciarían las métricas).
  const { error: pagosError } = await supabase
    .from("pagos")
    .delete()
    .eq("alumno_id", id)
    .eq("estado", "pendiente");
  check(null, pagosError);

  const { error } = await supabase.from("alumnos").update({ activo: false }).eq("id", id);
  check(null, error);
}

// ---------------------------------------------------------------------------
// ASISTENCIAS Y RECUPERACIONES
// ---------------------------------------------------------------------------
export async function getAsistencias(): Promise<Asistencia[]> {
  const { data, error } = await supabase
    .from("asistencias")
    .select("*")
    .order("fecha", { ascending: false });
  return check(data, error);
}

export interface MarcaAsistencia {
  alumno_id: string;
  presente: boolean;
  es_recuperacion: boolean;
}

/**
 * Guarda la lista de una clase para una fecha: crea o actualiza el registro
 * de cada alumno (única fila por clase + alumno + fecha).
 */
export async function guardarLista(
  claseId: string,
  fecha: string,
  marcas: MarcaAsistencia[]
): Promise<void> {
  if (marcas.length === 0) return;
  const filas = marcas.map((m) => ({ ...m, clase_id: claseId, fecha }));
  const { error } = await supabase
    .from("asistencias")
    .upsert(filas, { onConflict: "clase_id,alumno_id,fecha" });
  check(null, error);
}

/**
 * Anota una recuperación: el alumno usa 1 clase a favor para asistir a esta
 * clase en esta fecha. El control del saldo se hace en la interfaz.
 */
export async function reservarRecuperacion(
  claseId: string,
  alumnoId: string,
  fecha: string
): Promise<void> {
  const { error } = await supabase.from("asistencias").insert({
    clase_id: claseId,
    alumno_id: alumnoId,
    fecha,
    presente: true,
    es_recuperacion: true,
  });
  check(null, error);
}

/** Elimina un registro de asistencia (deshacer una recuperación o un error). */
export async function deleteAsistencia(id: string): Promise<void> {
  const { error } = await supabase.from("asistencias").delete().eq("id", id);
  check(null, error);
}

// ---------------------------------------------------------------------------
// PAGOS
// ---------------------------------------------------------------------------

/** Fechas de inicio de ciclo del alumno (día de alta anclado) hasta hoy. */
function ciclosDesde(fechaAlta: string, hastaIso: string): string[] {
  const ciclos: string[] = [];
  for (let i = 0; i < 240; i++) {
    const ciclo = sumarMesesFecha(fechaAlta, i);
    if (ciclo > hastaIso) break;
    ciclos.push(ciclo);
  }
  return ciclos;
}

let sincronizacionEnCurso: Promise<void> | null = null;

/**
 * Motor de cuotas tipo suscripción, anclado a la fecha de alta de cada alumno
 * (alta el 15/8 -> cuotas que vencen el 15/9, 15/10, ...).
 *
 * Reglas (deterministas, a prueba de duplicados):
 *  - Cada ciclo ya iniciado debe tener EXACTAMENTE un pago (del estado que
 *    sea). Si no existe ninguno para ese mes, se crea uno pendiente con
 *    vencimiento en la fecha del ciclo.
 *  - Si la cuota del ciclo vigente ya está completada, se pre-genera la
 *    pendiente del ciclo siguiente (así el pago "renueva" como suscripción).
 *  - Nunca se modifica ni duplica un pago existente: si ya hay un pago para
 *    ese alumno y ese mes, no se toca.
 */
export function sincronizarCuotas(): Promise<void> {
  // Evita corridas simultáneas (por ejemplo, dos pantallas cargando a la vez).
  sincronizacionEnCurso ??= (async () => {
    const [alumnos, planes, pagos] = await Promise.all([getAlumnos(), getPlanes(), getPagos()]);
    const hoy = hoyIso();
    const filas: Array<Omit<Pago, "id">> = [];

    for (const alumno of alumnos) {
      const susPlanes = planes.filter((p) => alumno.plan_ids.includes(p.id));
      if (susPlanes.length === 0 || !alumno.fecha_alta) continue;

      const monto = susPlanes.reduce((sum, p) => sum + Number(p.precio), 0);
      const concepto = susPlanes.map((p) => p.nombre).join(" + ");
      const mesesConPago = new Set(
        pagos.filter((p) => p.alumno_id === alumno.id).map((p) => p.mes_imputacion)
      );

      const ciclos = ciclosDesde(alumno.fecha_alta, hoy);

      // Si la cuota del ciclo vigente ya se pagó, sumamos el ciclo siguiente.
      const mesVigente = ciclos[ciclos.length - 1]?.slice(0, 7);
      const cuotaVigente = pagos.find(
        (p) => p.alumno_id === alumno.id && p.mes_imputacion === mesVigente
      );
      if (cuotaVigente?.estado === "completado") {
        ciclos.push(sumarMesesFecha(alumno.fecha_alta, ciclos.length));
      }

      for (const inicioCiclo of ciclos) {
        const mes = inicioCiclo.slice(0, 7);
        if (mesesConPago.has(mes)) continue;
        filas.push({
          alumno_id: alumno.id,
          concepto,
          monto,
          modalidad_pago: "Efectivo",
          metodos_pago: [],
          mes_imputacion: mes,
          estado: "pendiente",
          fecha_pago: inicioCiclo,
          notas: "",
        });
      }
    }

    if (filas.length > 0) {
      const { error } = await supabase.from("pagos").insert(filas);
      check(null, error);
    }
  })().finally(() => {
    sincronizacionEnCurso = null;
  });
  return sincronizacionEnCurso;
}

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
 * Ocupación de reservas confirmadas, sin datos personales. Usa la función
 * segura `ocupacion_reservas` de la base: es lo único que el público puede
 * consultar sobre reservas.
 */
export interface OcupacionReserva {
  clase_id: string;
  fecha_reserva: string;
}

export async function getOcupacionReservas(): Promise<OcupacionReserva[]> {
  const { data, error } = await supabase.rpc("ocupacion_reservas");
  return check(data, error);
}

/**
 * Crea una reserva pública mediante la función segura `crear_reserva`, que
 * valida el cupo real en el servidor (alumnos fijos + reservas confirmadas).
 */
export async function createReserva(
  input: Omit<Reserva, "id" | "estado" | "created_at">
): Promise<void> {
  const { error } = await supabase.rpc("crear_reserva", {
    p_clase_id: input.clase_id,
    p_nombre: input.alumno_nombre,
    p_telefono: input.alumno_telefono,
    p_fecha: input.fecha_reserva,
  });
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
