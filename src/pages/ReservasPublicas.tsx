import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { useData } from "../hooks/useData";
import { createReserva, getClases, getOcupacionReservas } from "../lib/api";
import type { Clase } from "../lib/types";
import { DIAS_SEMANA } from "../lib/types";
import { formatFecha, formatHora } from "../lib/format";
import { Badge, Button, ErrorState, Field, Input, LoadingState } from "../components/ui";
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

export default function ReservasPublicas() {
  const { data: clases, loading, error } = useData(getClases);
  const ocupacion = useData(getOcupacionReservas);
  const [claseId, setClaseId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fecha, setFecha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState<{ clase: Clase; fecha: string } | null>(null);

  const claseElegida = useMemo(
    () => (clases ?? []).find((c) => c.id === claseId) ?? null,
    [clases, claseId]
  );

  /** Lugares libres de una clase para una fecha concreta. */
  const lugaresLibres = (c: Clase, fechaIso: string): number => {
    const reservados = (ocupacion.data ?? []).filter(
      (r) => r.clase_id === c.id && r.fecha_reserva === fechaIso
    ).length;
    return c.cupo_maximo - c.alumno_ids.length - reservados;
  };

  const libresFechaElegida = claseElegida ? lugaresLibres(claseElegida, fecha) : 0;

  const elegirClase = (c: Clase) => {
    setClaseId(c.id);
    setFecha(proximaFecha(c.dia_semana));
    setErrorEnvio(null);
  };

  const reservar = async (e: FormEvent) => {
    e.preventDefault();
    if (!claseElegida) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await createReserva(
        {
          clase_id: claseElegida.id,
          alumno_nombre: nombre.trim(),
          alumno_telefono: telefono.trim(),
          fecha_reserva: fecha,
        },
        claseElegida.cupo_maximo
      );
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
                setNombre("");
                setTelefono("");
              }}
            >
              Hacer otra reserva
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Reservá tu clase</h1>
            <p className="text-muted-foreground mt-1 mb-6">
              Elegí una clase con lugar disponible y completá tus datos. ¡Es muy fácil!
            </p>

            {(loading || ocupacion.loading) && <LoadingState />}
            {error && <ErrorState message={error} />}
            {ocupacion.error && <ErrorState message={ocupacion.error} />}

            {/* Paso 1: elegir clase (muestra el cupo de la próxima fecha) */}
            {clases && ocupacion.data && (
              <div className="space-y-3 mb-8">
                {clases.length === 0 && (
                  <p className="text-muted-foreground">Por el momento no hay clases disponibles.</p>
                )}
                {clases.map((c) => {
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
                          {c.dia_semana} · {formatHora(c.hora_inicio)} – {formatHora(c.hora_fin)} hs
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

            {/* Paso 2: datos del cliente */}
            {claseElegida && (
              <form
                onSubmit={reservar}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4"
              >
                <h2 className="text-xl font-bold">Tus datos</h2>
                <Field label="Nombre y apellido">
                  <Input
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Ana García"
                  />
                </Field>
                <Field label="Teléfono / WhatsApp">
                  <Input
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej: 11 5555 0001"
                  />
                </Field>
                <Field label={`Fecha (la clase es los días ${claseElegida.dia_semana})`}>
                  <Input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </Field>

                {/* Disponibilidad para la fecha elegida */}
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
