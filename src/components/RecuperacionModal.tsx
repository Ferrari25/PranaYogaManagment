import { useMemo, useState, type FormEvent } from "react";
import type { Alumno, Asistencia, Clase } from "../lib/types";
import { DIAS_SEMANA } from "../lib/types";
import { reservarRecuperacion } from "../lib/api";
import { clasesAFavor } from "../lib/asistencias";
import { nombreCompleto } from "../lib/format";
import { Button, Field, Input, Modal, Select } from "./ui";

/** Próxima fecha (hoy o siguiente) en que cae el día de semana de la clase. */
function proximaFecha(dia: Clase["dia_semana"]): string {
  const objetivo = (DIAS_SEMANA.indexOf(dia) + 1) % 7; // getDay(): Domingo=0
  const fecha = new Date();
  while (fecha.getDay() !== objetivo) fecha.setDate(fecha.getDate() + 1);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const diaMes = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${diaMes}`;
}

export function RecuperacionModal({
  clase,
  alumnos,
  asistencias,
  onClose,
  onGuardado,
}: {
  clase: Clase;
  alumnos: Alumno[];
  asistencias: Asistencia[];
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [alumnoId, setAlumnoId] = useState("");
  const [fecha, setFecha] = useState(() => proximaFecha(clase.dia_semana));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Candidatos: alumnos que NO son fijos de esta clase, con su saldo a favor.
  const candidatos = useMemo(
    () =>
      alumnos
        .filter((a) => !clase.alumno_ids.includes(a.id))
        .map((a) => ({ alumno: a, aFavor: clasesAFavor(a.id, asistencias) }))
        .sort((c1, c2) => nombreCompleto(c1.alumno).localeCompare(nombreCompleto(c2.alumno))),
    [alumnos, clase.alumno_ids, asistencias]
  );

  const elegido = candidatos.find((c) => c.alumno.id === alumnoId) ?? null;

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!elegido) return;
    setGuardando(true);
    setError(null);
    try {
      await reservarRecuperacion(clase.id, elegido.alumno.id, fecha);
      onGuardado();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  };

  return (
    <Modal title={`Recuperación — ${clase.nombre}`} onClose={onClose}>
      <form onSubmit={guardar} className="space-y-4">
        <p className="text-muted-foreground">
          Anotá a un alumno que viene a recuperar una clase que faltó. Se le descuenta 1 clase a
          favor y ocupa un lugar en esta clase solo por esa fecha.
        </p>

        <Field label="Alumno">
          <Select required value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)}>
            <option value="" disabled>
              Elegir alumno…
            </option>
            {candidatos.map(({ alumno, aFavor }) => (
              <option key={alumno.id} value={alumno.id}>
                {nombreCompleto(alumno)} — {aFavor} a favor
              </option>
            ))}
          </Select>
        </Field>

        <Field label={`Fecha (la clase es los días ${clase.dia_semana})`}>
          <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>

        {elegido && elegido.aFavor <= 0 && (
          <p className="rounded-xl bg-warning-bg text-warning px-4 py-3 font-semibold">
            {nombreCompleto(elegido.alumno)} no tiene clases a favor. Podés anotarlo igual, pero
            su saldo quedará en {elegido.aFavor - 1}.
          </p>
        )}

        {error && <p className="text-danger font-semibold">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando || !elegido}>
            {guardando ? "Anotando…" : "Anotar Recuperación"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
