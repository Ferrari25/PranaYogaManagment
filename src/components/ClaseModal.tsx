import { useState, type FormEvent } from "react";
import type { Clase, DiaSemana } from "../lib/types";
import { DIAS_SEMANA } from "../lib/types";
import { formatHora, HORARIOS_24HS, sumarUnaHora } from "../lib/format";
import { Button, Field, Input, Modal, Select } from "./ui";

// La clase dura exactamente 1 hora: solo se elige la hora de inicio (24 hs)
// y la hora de fin se calcula automáticamente.
type ClaseForm = Omit<Clase, "id" | "alumno_ids" | "hora_fin">;

export function ClaseModal({
  clase,
  tipos,
  onSave,
  onClose,
}: {
  clase: Clase | null; // null = crear nueva clase
  /** Tipos de clase disponibles, tomados de los planes del estudio. */
  tipos: string[];
  onSave: (input: Omit<Clase, "id" | "alumno_ids">) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ClaseForm>({
    nombre: clase?.nombre ?? "",
    tipo_clase: clase?.tipo_clase ?? tipos[0] ?? "Todos los tipos",
    instructor: clase?.instructor ?? "",
    dia_semana: clase?.dia_semana ?? "Lunes",
    hora_inicio: formatHora(clase?.hora_inicio ?? "09:00"),
    cupo_maximo: clase?.cupo_maximo ?? 10,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const horaFin = sumarUnaHora(form.hora_inicio);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onSave({
        ...form,
        hora_fin: horaFin,
        cupo_maximo: Number(form.cupo_maximo),
      });
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

        <Field label="Tipo de Clase">
          <Select
            value={form.tipo_clase}
            onChange={(e) => setForm({ ...form, tipo_clase: e.target.value })}
          >
            {/* Conserva un tipo viejo que ya no exista entre los planes */}
            {!tipos.includes(form.tipo_clase) && (
              <option value={form.tipo_clase}>{form.tipo_clase}</option>
            )}
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <p className="-mt-2 text-sm text-muted-foreground">
          Define qué planes pueden reservar esta clase. Los tipos salen de los planes del estudio.
        </p>

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

        <Field label="Hora de inicio (formato 24 hs)">
          <Select
            value={form.hora_inicio}
            onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
          >
            {/* Conserva horarios viejos que no caigan en pasos de 30 minutos */}
            {!HORARIOS_24HS.includes(form.hora_inicio) && (
              <option value={form.hora_inicio}>{form.hora_inicio}</option>
            )}
            {HORARIOS_24HS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
        </Field>

        <p className="rounded-xl bg-muted px-4 py-3 text-base">
          La clase dura 1 hora: de <strong>{form.hora_inicio}</strong> a{" "}
          <strong>{horaFin}</strong> hs.
        </p>

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
