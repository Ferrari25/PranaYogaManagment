import { useState, type FormEvent } from "react";
import type { ServicioTerapia } from "../lib/types";
import { Button, Field, Input, Modal, MoneyInput } from "./ui";

type ServicioForm = Omit<ServicioTerapia, "id" | "activo">;

export function ServicioModal({
  servicio,
  onSave,
  onClose,
}: {
  servicio: ServicioTerapia | null; // null = crear nuevo servicio
  onSave: (input: ServicioForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ServicioForm>({
    nombre: servicio?.nombre ?? "",
    precio: servicio?.precio ?? 0,
    duracion_minutos: servicio?.duracion_minutos ?? 60,
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
        duracion_minutos: Number(form.duracion_minutos),
      });
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  };

  return (
    <Modal title={servicio ? "Editar Servicio" : "Nuevo Servicio"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre del Servicio">
          <Input
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Masaje Descontracturante"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Precio ($)">
            <MoneyInput
              required
              value={form.precio}
              onChange={(precio) => setForm({ ...form, precio })}
            />
          </Field>
          <Field label="Duración (minutos)">
            <Input
              type="number"
              min={15}
              step={15}
              required
              value={form.duracion_minutos}
              onChange={(e) => setForm({ ...form, duracion_minutos: Number(e.target.value) })}
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
