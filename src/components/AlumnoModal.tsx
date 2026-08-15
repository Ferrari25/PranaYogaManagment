import { useState, type FormEvent } from "react";
import type { Alumno, Plan } from "../lib/types";
import { type AlumnoInput } from "../lib/api";
import { formatPrecio, hoyIso } from "../lib/format";
import { Button, Field, Input, Modal } from "./ui";
import clsx from "clsx";

export function AlumnoModal({
  alumno,
  planes,
  onSave,
  onClose,
}: {
  alumno: Alumno | null; // null = alta de nuevo miembro
  planes: Plan[];
  onSave: (input: AlumnoInput) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AlumnoInput>({
    nombre: alumno?.nombre ?? "",
    apellido: alumno?.apellido ?? "",
    telefono: alumno?.telefono ?? "",
    email: alumno?.email ?? "",
    direccion: alumno?.direccion ?? "",
    fecha_alta: alumno?.fecha_alta ?? hoyIso(),
    plan_ids: alumno?.plan_ids ?? [],
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalMensual = planes
    .filter((p) => form.plan_ids.includes(p.id))
    .reduce((sum, p) => sum + Number(p.precio), 0);

  const togglePlan = (planId: string) => {
    setForm((f) => ({
      ...f,
      plan_ids: f.plan_ids.includes(planId)
        ? f.plan_ids.filter((id) => id !== planId)
        : [...f.plan_ids, planId],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  };

  return (
    <Modal title={alumno ? "Editar Miembro" : "Añadir Nuevo Miembro"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre">
            <Input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Ana"
            />
          </Field>
          <Field label="Apellido">
            <Input
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              placeholder="Ej: García"
            />
          </Field>
        </div>

        <Field label="Nro de Teléfono">
          <Input
            type="tel"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            placeholder="Ej: 11 5555 0001"
          />
        </Field>

        <Field label="Correo Electrónico">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="ana@ejemplo.com"
          />
        </Field>

        <Field label="Dirección">
          <Input
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            placeholder="Calle y número"
          />
        </Field>

        {/* Selector múltiple de planes */}
        <div>
          <p className="text-base font-semibold mb-2">Planes de Membresía</p>
          <div className="space-y-2">
            {planes.map((p) => {
              const activo = form.plan_ids.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => togglePlan(p.id)}
                  className={clsx(
                    "w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors",
                    activo
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted"
                  )}
                  aria-pressed={activo}
                >
                  <span className="font-semibold">{p.nombre}</span>
                  <span className="text-muted-foreground">{formatPrecio(Number(p.precio))}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-lg font-bold text-primary-dark">
            Total a Abonar mensual: {formatPrecio(totalMensual)} / mes
          </p>
        </div>

        <Field label="Fecha de Alta / Inicio">
          <Input
            type="date"
            required
            value={form.fecha_alta}
            onChange={(e) => setForm({ ...form, fecha_alta: e.target.value })}
          />
        </Field>

        {error && <p className="text-danger font-semibold">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : alumno ? "Guardar Cambios" : "Confirmar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
