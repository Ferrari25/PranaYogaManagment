import { useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useData } from "../hooks/useData";
import { createClase, deleteClase, getClases, updateClase } from "../lib/api";
import type { Clase } from "../lib/types";
import { DIAS_SEMANA } from "../lib/types";
import { formatHora, hoyDiaSemana } from "../lib/format";
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
import clsx from "clsx";

export default function Clases() {
  const { data: clases, loading, error, reload } = useData(getClases);
  const [modal, setModal] = useState<{ abierto: boolean; clase: Clase | null }>({
    abierto: false,
    clase: null,
  });
  const [aEliminar, setAEliminar] = useState<Clase | null>(null);

  const guardar = async (input: Omit<Clase, "id">) => {
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const lista = clases ?? [];
  // Grilla semanal: solo se muestran los días que tienen clases (más los hábiles).
  const diasConClases = DIAS_SEMANA.filter(
    (d, i) => i < 5 || lista.some((c) => c.dia_semana === d)
  );

  return (
    <div>
      <PageHeader
        title="Clases"
        description="Grilla semanal de clases y horarios del estudio."
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
                          <div>
                            <p className="font-semibold">{c.nombre}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatHora(c.hora_inicio)} – {formatHora(c.hora_fin)}
                              {c.instructor && ` · ${c.instructor}`}
                            </p>
                            <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <Users className="w-4 h-4" /> Cupo: {c.cupo_maximo}
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
          onSave={guardar}
          onClose={() => setModal({ abierto: false, clase: null })}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          title="Eliminar clase"
          message={`¿Seguro que querés eliminar la clase "${aEliminar.nombre}" del día ${aEliminar.dia_semana}? Sus reservas también se eliminarán.`}
          onConfirm={eliminar}
          onCancel={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
