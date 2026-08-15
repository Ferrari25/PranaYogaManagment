import { useState, type FormEvent } from "react";
import type { Clase, DiaSemana } from "../lib/types";
import { DIAS_SEMANA } from "../lib/types";
import { formatHora } from "../lib/format";
import { Button, Field, Input, Modal, Select } from "./ui";

type ClaseForm = Omit<Clase, "id">;

export function ClaseModal({
  clase,
  onSave,
  onClose,
}: {
  clase: Clase | null; // null = crear nueva clase
  onSave: (input: ClaseForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ClaseForm>({
    nombre: clase?.nombre ?? "",
    instructor: clase?.instructor ?? "",
    dia_semana: clase?.dia_semana ?? "Lunes",
    hora_inicio: formatHora(clase?.hora_inicio ?? "09:00"),
    hora_fin: formatHora(clase?.hora_fin ?? "10:00"),
    cupo_maximo: clase?.cupo_maximo ?? 10,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onSave({ ...form, cupo_maximo: Number(form.cupo_maximo) });
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  };

  return (
    <Modal title={clase ? "Editar Clase" : "Nueva Clase"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre de la Clase">
          <Input
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Hatha Yoga"
          />
        </Field>

        <Field label="Instructor/a">
          <Input
            value={form.instructor}
            onChange={(e) => setForm({ ...form, instructor: e.target.value })}
            placeholder="Ej: María"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Día de la semana">
            <Select
              value={form.dia_semana}
              onChange={(e) => setForm({ ...form, dia_semana: e.target.value as DiaSemana })}
            >
              {DIAS_SEMANA.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cupo máximo">
            <Input
              type="number"
              min={1}
              required
              value={form.cupo_maximo}
              onChange={(e) => setForm({ ...form, cupo_maximo: Number(e.target.value) })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Hora de inicio">
            <Input
              type="time"
              required
              value={form.hora_inicio}
              onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
            />
          </Field>
          <Field label="Hora de fin">
            <Input
              type="time"
              required
              value={form.hora_fin}
              onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
            />
          </Field>
        </div>

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
