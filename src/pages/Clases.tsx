import { useState } from "react";
import { Plus, Pencil, Trash2, Users, X, ClipboardCheck, Repeat } from "lucide-react";
import clsx from "clsx";
import { useData } from "../hooks/useData";
import {
  createClase,
  deleteClase,
  getAlumnos,
  getAsistencias,
  getClases,
  getPlanes,
  inscribirAlumnoEnClase,
  removerAlumnoDeClase,
  updateClase,
} from "../lib/api";
import type { Alumno, Clase } from "../lib/types";
import { DIAS_SEMANA } from "../lib/types";
import { formatHora, hoyDiaSemana, nombreCompleto } from "../lib/format";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  PageHeader,
} from "../components/ui";
import { ClaseModal } from "../components/ClaseModal";
import { ListaModal } from "../components/ListaModal";
import { RecuperacionModal } from "../components/RecuperacionModal";

/** Lista de inscriptos de una clase con alta/baja rápida de alumnos. */
function InscriptosDeClase({
  clase,
  alumnos,
  onChange,
}: {
  clase: Clase;
  alumnos: Alumno[];
  onChange: () => void;
}) {
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inscriptos = clase.alumno_ids
    .map((id) => alumnos.find((a) => a.id === id))
    .filter((a): a is Alumno => Boolean(a));
  const disponibles = alumnos.filter((a) => !clase.alumno_ids.includes(a.id));
  const completa = inscriptos.length >= clase.cupo_maximo;

  const agregar = async (alumnoId: string) => {
    if (!alumnoId) return;
    setTrabajando(true);
    setError(null);
    try {
      await inscribirAlumnoEnClase(clase.id, alumnoId);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  };

  const remover = async (alumnoId: string) => {
    setTrabajando(true);
    setError(null);
    try {
      await removerAlumnoDeClase(clase.id, alumnoId);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground mb-2">
        <Users className="w-4 h-4" />
        Alumnos fijos:{" "}
        <span className={completa ? "text-danger" : ""}>
          {inscriptos.length}/{clase.cupo_maximo}
        </span>
      </p>

      {inscriptos.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-2">
          {inscriptos.map((a) => (
            <li
              key={a.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary-dark pl-3 pr-1 py-0.5 text-sm font-semibold"
            >
              {nombreCompleto(a)}
              <button
                onClick={() => remover(a.id)}
                disabled={trabajando}
                title={`Quitar a ${nombreCompleto(a)}`}
                aria-label={`Quitar a ${nombreCompleto(a)}`}
                className="rounded-full p-1 hover:bg-danger-bg hover:text-danger transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {disponibles.length > 0 && (
        <select
          value=""
          disabled={trabajando}
          onChange={(e) => agregar(e.target.value)}
          aria-label={`Agregar alumno a ${clase.nombre}`}
          className="w-full rounded-lg border-2 border-dashed border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="">+ Agregar alumno…</option>
          {disponibles.map((a) => (
            <option key={a.id} value={a.id}>
              {nombreCompleto(a)}
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-danger text-sm font-semibold mt-2">{error}</p>}
    </div>
  );
}

export default function Clases() {
  const { data: clases, loading, error, reload } = useData(getClases);
  const alumnos = useData(getAlumnos);
  const asistencias = useData(getAsistencias);
  const planes = useData(getPlanes);
  const [modal, setModal] = useState<{ abierto: boolean; clase: Clase | null }>({
    abierto: false,
    clase: null,
  });
  const [claseLista, setClaseLista] = useState<Clase | null>(null);
  const [claseRecuperacion, setClaseRecuperacion] = useState<Clase | null>(null);
  const [aEliminar, setAEliminar] = useState<Clase | null>(null);

  const guardar = async (input: Omit<Clase, "id" | "alumno_ids">) => {
    if (modal.clase) {
      await updateClase(modal.clase.id, input);
    } else {
      await createClase(input);
    }
    setModal({ abierto: false, clase: null });
    reload();
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    await deleteClase(aEliminar.id);
    setAEliminar(null);
    reload();
  };

  if (loading || alumnos.loading || asistencias.loading || planes.loading) {
    return <LoadingState />;
  }
  const err = error || alumnos.error || asistencias.error || planes.error;
  if (err) return <ErrorState message={err} />;

  const lista = clases ?? [];
  // Tipos ofrecidos al crear/editar una clase: los de los planes del estudio.
  const tipos = [
    ...new Set([...(planes.data ?? []).map((p) => p.tipo_clase), "Todos los tipos"]),
  ];
  // Grilla semanal: días hábiles siempre visibles + fin de semana si tiene clases.
  const diasConClases = DIAS_SEMANA.filter(
    (d, i) => i < 5 || lista.some((c) => c.dia_semana === d)
  );

  return (
    <div>
      <PageHeader
        title="Clases"
        description="Grilla semanal, horarios y alumnos fijos de cada clase."
        actions={
          <Button onClick={() => setModal({ abierto: true, clase: null })}>
            <Plus className="w-5 h-5" />
            Nueva Clase
          </Button>
        }
      />

      {lista.length === 0 ? (
        <EmptyState message="Todavía no hay clases en la grilla. Creá la primera con el botón de arriba." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {diasConClases.map((dia) => {
            const delDia = lista.filter((c) => c.dia_semana === dia);
            const esHoy = dia === hoyDiaSemana();
            return (
              <section
                key={dia}
                className={clsx(
                  "rounded-2xl border bg-card p-5 shadow-sm",
                  esHoy ? "border-primary border-2" : "border-border"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{dia}</h2>
                  {esHoy && <Badge tone="primary">Hoy</Badge>}
                </div>

                {delDia.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin clases.</p>
                ) : (
                  <ul className="space-y-3">
                    {delDia.map((c) => (
                      <li key={c.id} className="rounded-xl bg-muted/60 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold">{c.nombre}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatHora(c.hora_inicio)} – {formatHora(c.hora_fin)} hs
                              {c.instructor && ` · ${c.instructor}`}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Tipo: <span className="font-semibold">{c.tipo_clase}</span>
                            </p>
                          </div>
                          <div className="flex gap-1.5">
                            <IconButton
                              title="Editar"
                              onClick={() => setModal({ abierto: true, clase: c })}
                              className="w-9 h-9"
                            >
                              <Pencil className="w-4 h-4" />
                            </IconButton>
                            <IconButton
                              title="Eliminar"
                              onClick={() => setAEliminar(c)}
                              className="w-9 h-9 text-danger"
                            >
                              <Trash2 className="w-4 h-4" />
                            </IconButton>
                          </div>
                        </div>

                        <InscriptosDeClase
                          clase={c}
                          alumnos={alumnos.data ?? []}
                          onChange={reload}
                        />

                        {/* Acciones de asistencia */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setClaseLista(c)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-primary-dark px-3 py-2 text-sm font-bold hover:bg-primary/20 transition-colors"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                            Pasar Lista
                          </button>
                          <button
                            onClick={() => setClaseRecuperacion(c)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <Repeat className="w-4 h-4" />
                            Recuperación
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {modal.abierto && (
        <ClaseModal
          clase={modal.clase}
          tipos={tipos}
          onSave={guardar}
          onClose={() => setModal({ abierto: false, clase: null })}
        />
      )}

      {claseLista && (
        <ListaModal
          clase={claseLista}
          alumnos={alumnos.data ?? []}
          asistencias={asistencias.data ?? []}
          onClose={() => setClaseLista(null)}
          onGuardado={asistencias.reload}
        />
      )}

      {claseRecuperacion && (
        <RecuperacionModal
          clase={claseRecuperacion}
          alumnos={alumnos.data ?? []}
          asistencias={asistencias.data ?? []}
          onClose={() => setClaseRecuperacion(null)}
          onGuardado={asistencias.reload}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          title="Eliminar clase"
          message={`¿Seguro que querés eliminar la clase "${aEliminar.nombre}" del día ${aEliminar.dia_semana}? Sus inscripciones y reservas también se eliminarán.`}
          onConfirm={eliminar}
          onCancel={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
