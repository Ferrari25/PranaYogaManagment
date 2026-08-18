import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Info } from "lucide-react";
import clsx from "clsx";
import { useData } from "../hooks/useData";
import { createReservaAlumno, getAlumnosParaReserva, getClases, getOcupacionReservas } from "../lib/api";
import type { Clase } from "../lib/types";
import { DIAS_SEMANA } from "../lib/types";
import { formatFecha, formatHora } from "../lib/format";
import { tiposHabilitanClase } from "../lib/planes";
import { Badge, Button, ErrorState, Field, Input, LoadingState, Select } from "../components/ui";
import { Logo } from "../components/Logo";

/** Próxima fecha (YYYY-MM-DD) en que cae el día de semana de la clase. */
function proximaFecha(dia: Clase["dia_semana"]): string {
  const objetivo = (DIAS_SEMANA.indexOf(dia) + 1) % 7; // getDay(): Domingo=0
  const fecha = new Date();
  while (fecha.getDay() !== objetivo) fecha.setDate(fecha.getDate() + 1);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const diaMes = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${diaMes}`;
}

/** Etiqueta de disponibilidad según los lugares libres. */
function BadgeCupo({ libres }: { libres: number }) {
  if (libres <= 0) return <Badge tone="danger">Completa</Badge>;
  if (libres <= 3) {
    return (
      <Badge tone="warning">
        ¡{libres === 1 ? "Último lugar" : `Últimos ${libres} lugares`}!
      </Badge>
    );
  }
  return <Badge tone="success">Quedan {libres} lugares</Badge>;
}

/** Aviso fijo sobre el tipo de clase que puede reservar cada alumno. */
function NotaPlan() {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-warning-bg text-warning px-5 py-4 mb-6">
      <Info className="w-6 h-6 shrink-0 mt-0.5" />
      <p className="font-semibold">
        Recordá que las reservas son únicamente para clases del mismo tipo y valor que tu plan. Si
        no se cumple, el profesor podrá anular la reserva porque se eligió una clase fuera del
        plan.
      </p>
    </div>
  );
}

export default function ReservasPublicas() {
  const { data: clases, loading, error } = useData(getClases);
  const ocupacion = useData(getOcupacionReservas);
  const alumnos = useData(getAlumnosParaReserva);

  const [alumnoId, setAlumnoId] = useState("");
  const [claseId, setClaseId] = useState<string | null>(null);
  const [fecha, setFecha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState<{ clase: Clase; fecha: string } | null>(null);

  const alumno = useMemo(
    () => (alumnos.data ?? []).find((a) => a.id === alumnoId) ?? null,
    [alumnos.data, alumnoId]
  );

  // Solo las clases que habilita el plan del alumno, ordenadas por la fecha
  // en que realmente le tocaría reservar (hoy primero, después mañana, etc.),
  // y por horario dentro de un mismo día.
  const clasesDelPlan = useMemo(() => {
    if (!alumno) return [];
    return (clases ?? [])
      .filter((c) => tiposHabilitanClase(alumno.tipos, c))
      .sort((a, b) => {
        const fechaA = proximaFecha(a.dia_semana);
        const fechaB = proximaFecha(b.dia_semana);
        return fechaA !== fechaB
          ? fechaA.localeCompare(fechaB)
          : a.hora_inicio.localeCompare(b.hora_inicio);
      });
  }, [clases, alumno]);

  const claseElegida = useMemo(
    () => clasesDelPlan.find((c) => c.id === claseId) ?? null,
    [clasesDelPlan, claseId]
  );

  /** Lugares libres de una clase para una fecha concreta. */
  const lugaresLibres = (c: Clase, fechaIso: string): number => {
    const ocupados = (ocupacion.data ?? []).filter(
      (r) => r.clase_id === c.id && r.fecha_reserva === fechaIso
    ).length;
    return c.cupo_maximo - c.alumno_ids.length - ocupados;
  };

  const libresFechaElegida = claseElegida ? lugaresLibres(claseElegida, fecha) : 0;

  const elegirAlumno = (id: string) => {
    setAlumnoId(id);
    setClaseId(null);
    setFecha("");
    setErrorEnvio(null);
  };

  const elegirClase = (c: Clase) => {
    setClaseId(c.id);
    setFecha(proximaFecha(c.dia_semana));
    setErrorEnvio(null);
  };

  const reservar = async (e: FormEvent) => {
    e.preventDefault();
    if (!claseElegida || !alumno) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await createReservaAlumno(claseElegida.id, alumno.id, fecha);
      setConfirmada({ clase: claseElegida, fecha });
      ocupacion.reload();
    } catch (err) {
      setErrorEnvio((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border py-6 px-5 text-center">
        <div className="flex items-center justify-center gap-3">
          <Logo className="w-12 h-12" />
          <div className="text-left">
            <p className="font-serif text-xl font-bold tracking-wider leading-none">PRANA YOGA</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-1">
              Estudio &amp; Bienestar
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-5 md:p-8">
        {confirmada ? (
          /* Confirmación visual instantánea */
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
            <h1 className="text-3xl font-bold mt-4">¡Reserva confirmada!</h1>
            <p className="text-lg text-muted-foreground mt-3">
              Te esperamos en <strong>{confirmada.clase.nombre}</strong> el{" "}
              <strong>
                {confirmada.clase.dia_semana} {formatFecha(confirmada.fecha)}
              </strong>{" "}
              a las <strong>{formatHora(confirmada.clase.hora_inicio)} hs</strong>.
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                setConfirmada(null);
                setClaseId(null);
                setFecha("");
              }}
            >
              Hacer otra reserva
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Reservá tu clase</h1>
            <p className="text-muted-foreground mt-1 mb-6">
              Elegí tu nombre y la clase que querés reservar. ¡Es muy fácil!
            </p>

            <NotaPlan />

            {(loading || ocupacion.loading || alumnos.loading) && <LoadingState />}
            {error && <ErrorState message={error} />}
            {ocupacion.error && <ErrorState message={ocupacion.error} />}
            {alumnos.error && <ErrorState message={alumnos.error} />}

            {/* Paso 1: elegir alumno */}
            {alumnos.data && (
              <div className="mb-6">
                <Field label="¿Quién sos?">
                  <Select value={alumnoId} onChange={(e) => elegirAlumno(e.target.value)}>
                    <option value="">Elegí tu nombre de la lista…</option>
                    {alumnos.data.map((a) => (
                      <option key={a.id} value={a.id}>
                        {`${a.nombre} ${a.apellido}`.trim()}
                      </option>
                    ))}
                  </Select>
                </Field>
                <p className="text-sm text-muted-foreground mt-2">
                  Si no encontrás tu nombre, escribile al estudio para que te den de alta.
                </p>
              </div>
            )}

            {/* Paso 2: elegir clase (solo las de su plan) */}
            {alumno && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-1">Clases disponibles para tu plan</h2>
                <p className="text-muted-foreground mb-3">
                  {alumno.tipos.length > 0
                    ? `Tu plan incluye: ${alumno.tipos.join(", ")}.`
                    : "Todavía no tenés un plan asignado."}
                </p>

                {clasesDelPlan.length === 0 ? (
                  <p className="rounded-xl bg-muted px-4 py-3 text-muted-foreground">
                    No hay clases disponibles para tu plan. Consultá con el estudio.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {clasesDelPlan.map((c) => {
                      const fechaCard = claseId === c.id && fecha ? fecha : proximaFecha(c.dia_semana);
                      const libres = lugaresLibres(c, fechaCard);
                      const completa = libres <= 0;
                      return (
                        <button
                          key={c.id}
                          onClick={() => elegirClase(c)}
                          disabled={completa}
                          className={clsx(
                            "w-full flex items-center justify-between gap-3 rounded-2xl border-2 px-5 py-4 text-left transition-colors",
                            claseId === c.id
                              ? "border-primary bg-primary/10"
                              : completa
                                ? "border-border bg-muted/60 opacity-70 cursor-not-allowed"
                                : "border-border bg-card hover:bg-muted"
                          )}
                          aria-pressed={claseId === c.id}
                        >
                          <div>
                            <p className="text-lg font-bold">{c.nombre}</p>
                            <p className="text-muted-foreground">
                              {c.dia_semana} {formatFecha(fechaCard)} ·{" "}
                              {formatHora(c.hora_inicio)} – {formatHora(c.hora_fin)} hs
                              {c.instructor && ` · ${c.instructor}`}
                            </p>
                            <div className="mt-2">
                              <BadgeCupo libres={libres} />
                            </div>
                          </div>
                          <span
                            className={clsx(
                              "w-6 h-6 rounded-full border-2 shrink-0",
                              claseId === c.id ? "border-primary bg-primary" : "border-border",
                              completa && "opacity-40"
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Paso 3: fecha y confirmación */}
            {claseElegida && (
              <form
                onSubmit={reservar}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4"
              >
                <h2 className="text-xl font-bold">Confirmá tu reserva</h2>
                <Field label={`Fecha (la clase es los días ${claseElegida.dia_semana})`}>
                  <Input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </Field>

                {fecha && (
                  <p
                    className={clsx(
                      "rounded-xl px-4 py-3 font-semibold",
                      libresFechaElegida > 0
                        ? "bg-success-bg text-success"
                        : "bg-danger-bg text-danger"
                    )}
                  >
                    {libresFechaElegida > 0
                      ? `Hay ${libresFechaElegida} ${libresFechaElegida === 1 ? "lugar disponible" : "lugares disponibles"} para el ${formatFecha(fecha)}.`
                      : `No queda lugar para el ${formatFecha(fecha)}. Probá con la semana siguiente.`}
                  </p>
                )}

                {errorEnvio && <p className="text-danger font-semibold">{errorEnvio}</p>}

                <Button
                  type="submit"
                  disabled={enviando || libresFechaElegida <= 0}
                  className="w-full text-lg py-4"
                >
                  {enviando ? "Reservando…" : "Confirmar mi reserva"}
                </Button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
