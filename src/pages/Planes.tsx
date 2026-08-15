import { useState } from "react";
import { Plus, Pencil, Trash2, CalendarCheck } from "lucide-react";
import { useData } from "../hooks/useData";
import { createPlan, deletePlan, getPlanes, updatePlan } from "../lib/api";
import type { Plan } from "../lib/types";
import { formatPrecio } from "../lib/format";
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
import { PlanModal } from "../components/PlanModal";

export default function Planes() {
  const { data: planes, loading, error, reload } = useData(getPlanes);
  const [modal, setModal] = useState<{ abierto: boolean; plan: Plan | null }>({
    abierto: false,
    plan: null,
  });
  const [aEliminar, setAEliminar] = useState<Plan | null>(null);

  const guardar = async (input: Omit<Plan, "id" | "activo">) => {
    if (modal.plan) {
      await updatePlan(modal.plan.id, input);
    } else {
      await createPlan(input);
    }
    setModal({ abierto: false, plan: null });
    reload();
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    await deletePlan(aEliminar.id);
    setAEliminar(null);
    reload();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Planes y Tarifas"
        description="Membresías y precios mensuales del estudio."
        actions={
          <Button onClick={() => setModal({ abierto: true, plan: null })}>
            <Plus className="w-5 h-5" />
            Crear Nuevo Plan
          </Button>
        }
      />

      {(planes ?? []).length === 0 ? (
        <EmptyState message="Todavía no hay planes. Creá el primero con el botón de arriba." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(planes ?? []).map((p) => (
            <article
              key={p.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold leading-snug">{p.nombre}</h2>
                <Badge tone="primary">{p.tipo_clase}</Badge>
              </div>

              <p className="text-4xl font-bold font-serif text-primary-dark mt-4">
                {formatPrecio(Number(p.precio))}
                <span className="text-base font-sans font-medium text-muted-foreground"> / mes</span>
              </p>

              <p className="flex items-center gap-2 text-muted-foreground mt-3">
                <CalendarCheck className="w-5 h-5" />
                {p.dias_semana} {p.dias_semana === 1 ? "día" : "días"} por semana
              </p>

              {p.descripcion && (
                <p className="text-muted-foreground mt-3 flex-1">{p.descripcion}</p>
              )}

              <div className="flex gap-2 mt-5 pt-4 border-t border-border">
                <IconButton title="Editar" onClick={() => setModal({ abierto: true, plan: p })}>
                  <Pencil className="w-5 h-5" />
                </IconButton>
                <IconButton title="Eliminar" onClick={() => setAEliminar(p)} className="text-danger">
                  <Trash2 className="w-5 h-5" />
                </IconButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal.abierto && (
        <PlanModal
          plan={modal.plan}
          onSave={guardar}
          onClose={() => setModal({ abierto: false, plan: null })}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          title="Eliminar plan"
          message={`¿Seguro que querés eliminar el plan "${aEliminar.nombre}"? Los alumnos que lo tengan asignado dejarán de verlo.`}
          onConfirm={eliminar}
          onCancel={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
