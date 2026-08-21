import { useState, type FormEvent } from "react";
import type { Plan } from "../lib/types";
import { Button, Field, Input, Modal, MoneyInput, Textarea } from "./ui";

type PlanForm = Omit<Plan, "id" | "activo">;

export function PlanModal({
  plan,
  onSave,
  onClose,
}: {
  plan: Plan | null; // null = crear nuevo plan
  onSave: (input: PlanForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PlanForm>({
    nombre: plan?.nombre ?? "",
    tipo_clase: plan?.tipo_clase ?? "Todos los tipos",
    dias_semana: plan?.dias_semana ?? 1,
    precio: plan?.precio ?? 0,
    descripcion: plan?.descripcion ?? "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onSave({
        ...form,
        precio: Number(form.precio),
        dias_semana: Number(form.dias_semana),
      });
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  };

  return (
    <Modal title={plan ? "Editar Plan" : "Crear Nuevo Plan"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre del Plan">
          <Input
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Plan 2 Días (Hatha / Vinyasa)"
          />
        </Field>

        <Field label="Tipo de Clase Aplicable">
          <Input
            value={form.tipo_clase}
            onChange={(e) => setForm({ ...form, tipo_clase: e.target.value })}
            placeholder="Ej: Hatha / Vinyasa, Kuruntas, Todos los tipos"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Días a la semana">
            <Input
              type="number"
              min={1}
              max={7}
              required
              value={form.dias_semana}
              onChange={(e) => setForm({ ...form, dias_semana: Number(e.target.value) })}
            />
          </Field>
          <Field label="Precio Mensual ($)">
            <MoneyInput
              required
              value={form.precio}
              onChange={(precio) => setForm({ ...form, precio })}
            />
          </Field>
        </div>

        <Field label="Descripción / Notas">
          <Textarea
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Detalle del plan…"
          />
        </Field>

        {error && <p className="text-danger font-semibold">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Confirmar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
