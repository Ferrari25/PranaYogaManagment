import { useMemo, useState, type FormEvent } from "react";
import { Check, X, Undo2 } from "lucide-react";
import clsx from "clsx";
import type { Alumno, Asistencia, Clase } from "../lib/types";
import { DIAS_SEMANA } from "../lib/types";
import { guardarLista, deleteAsistencia, type MarcaAsistencia } from "../lib/api";
import { nombreCompleto } from "../lib/format";
import { Badge, Button, Field, Input, Modal } from "./ui";

/** Última fecha (hoy o anterior) en que cayó el día de semana de la clase. */
function ultimaFecha(dia: Clase["dia_semana"]): string {
  const objetivo = (DIAS_SEMANA.indexOf(dia) + 1) % 7; // getDay(): Domingo=0
  const fecha = new Date();
  while (fecha.getDay() !== objetivo) fecha.setDate(fecha.getDate() - 1);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const diaMes = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${diaMes}`;
}

export function ListaModal({
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
  const [fecha, setFecha] = useState(() => ultimaFecha(clase.dia_semana));
  const [marcas, setMarcas] = useState<Record<string, boolean>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registros ya guardados para esta clase y fecha (lista previa o recuperaciones).
  const registrosDia = useMemo(
    () => asistencias.filter((a) => a.clase_id === clase.id && a.fecha === fecha),
    [asistencias, clase.id, fecha]
  );

  // A quiénes pasarles lista: los alumnos fijos + cualquiera con registro ese
  // día (incluye recuperaciones anotadas).
  const filas = useMemo(() => {
    const ids = new Set<string>(clase.alumno_ids);
    registrosDia.forEach((r) => ids.add(r.alumno_id));
    return [...ids]
      .map((id) => {
        const alumno = alumnos.find((a) => a.id === id);
        if (!alumno) return null;
        const registro = registrosDia.find((r) => r.alumno_id === id) ?? null;
        return { alumno, registro };
      })
      .filter((f): f is { alumno: Alumno; registro: Asistencia | null } => f !== null)
      .sort((f1, f2) => nombreCompleto(f1.alumno).localeCompare(nombreCompleto(f2.alumno)));
  }, [clase.alumno_ids, registrosDia, alumnos]);

  // Presente por defecto; si ya hay registro guardado, se respeta.
  const estaPresente = (alumnoId: string): boolean => {
    if (alumnoId in marcas) return marcas[alumnoId];
    const registro = registrosDia.find((r) => r.alumno_id === alumnoId);
    return registro ? registro.presente : true;
  };

  const quitarRecuperacion = async (registro: Asistencia) => {
    setError(null);
    try {
      await deleteAsistencia(registro.id);
      onGuardado();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const lista: MarcaAsistencia[] = filas.map(({ alumno, registro }) => ({
        alumno_id: alumno.id,
        presente: estaPresente(alumno.id),
        es_recuperacion: registro?.es_recuperacion ?? false,
      }));
      await guardarLista(clase.id, fecha, lista);
      onGuardado();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  };

  return (
    <Modal title={`Pasar Lista — ${clase.nombre}`} onClose={onClose}>
      <form onSubmit={guardar} className="space-y-4">
        <Field label={`Fecha de la clase (los días ${clase.dia_semana})`}>
          <Input
            type="date"
            required
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setMarcas({});
            }}
          />
        </Field>

        {filas.length === 0 ? (
          <p className="text-muted-foreground py-4">
            Esta clase no tiene alumnos fijos ni recuperaciones para esta fecha.
          </p>
        ) : (
          <ul className="space-y-2">
            {filas.map(({ alumno, registro }) => {
              const presente = estaPresente(alumno.id);
              return (
                <li
                  key={alumno.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{nombreCompleto(alumno)}</p>
                    {registro?.es_recuperacion && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge tone="primary">Recuperación</Badge>
                        <button
                          type="button"
                          onClick={() => quitarRecuperacion(registro)}
                          className="inline-flex items-center gap-1 text-sm text-danger font-semibold hover:underline"
                          title="Quitar la recuperación y devolver la clase a favor"
                        >
                          <Undo2 className="w-4 h-4" /> Quitar
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMarcas({ ...marcas, [alumno.id]: true })}
                      className={clsx(
                        "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-bold transition-colors",
                        presente
                          ? "bg-success text-white shadow-sm"
                          : "bg-card border-2 border-border text-muted-foreground hover:bg-muted"
                      )}
                      aria-pressed={presente}
                    >
                      <Check className="w-5 h-5" /> Presente
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarcas({ ...marcas, [alumno.id]: false })}
                      className={clsx(
                        "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-bold transition-colors",
                        !presente
                          ? "bg-danger text-white shadow-sm"
                          : "bg-card border-2 border-border text-muted-foreground hover:bg-muted"
                      )}
                      aria-pressed={!presente}
                    >
                      <X className="w-5 h-5" /> Ausente
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-sm text-muted-foreground">
          Cada ausencia suma 1 clase a favor al alumno para recuperar otro día.
        </p>

        {error && <p className="text-danger font-semibold">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando || filas.length === 0}>
            {guardando ? "Guardando…" : "Guardar Lista"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
