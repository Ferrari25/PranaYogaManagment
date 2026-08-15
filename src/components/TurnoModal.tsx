import { useState, type FormEvent } from "react";
import type { ServicioTerapia, TurnoTerapia } from "../lib/types";
import { MODALIDADES_PAGO } from "../lib/types";
import { formatHora, HORARIOS_24HS, hoyIso } from "../lib/format";
import { Button, Field, Input, Modal, Select, Textarea } from "./ui";

type TurnoForm = Omit<TurnoTerapia, "id">;

export function TurnoModal({
  turno,
  servicios,
  onSave,
  onClose,
}: {
  turno: TurnoTerapia | null; // null = nuevo turno
  servicios: ServicioTerapia[];
  onSave: (input: TurnoForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TurnoForm>({
    servicio_id: turno?.servicio_id ?? null,
    cliente_nombre: turno?.cliente_nombre ?? "",
    cliente_telefono: turno?.cliente_telefono ?? "",
    fecha: turno?.fecha ?? hoyIso(),
    hora: formatHora(turno?.hora ?? "09:00"),
    monto: turno?.monto ?? 0,
    modalidad_pago: turno?.modalidad_pago ?? "Efectivo",
    estado: turno?.estado ?? "pendiente",
    notas: turno?.notas ?? "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Al elegir servicio, auto-completa el monto con su precio. */
  const elegirServicio = (servicioId: string) => {
    const servicio = servicios.find((s) => s.id === servicioId);
    setForm((f) => ({
      ...f,
      servicio_id: servicioId || null,
      monto: servicio ? Number(servicio.precio) : f.monto,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onSave({ ...form, monto: Number(form.monto) });
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  };

  return (
    <Modal title={turno ? "Editar Turno" : "Nuevo Turno"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Servicio">
          <Select
            required
            value={form.servicio_id ?? ""}
            onChange={(e) => elegirServicio(e.target.value)}
          >
            <option value="" disabled>
              Elegir servicio…
            </option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} ({s.duracion_minutos} min)
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre del Cliente">
            <Input
              required
              value={form.cliente_nombre}
              onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
              placeholder="Ej: Laura Fernández"
            />
          </Field>
          <Field label="Teléfono">
            <Input
              type="tel"
              value={form.cliente_telefono}
              onChange={(e) => setForm({ ...form, cliente_telefono: e.target.value })}
              placeholder="Ej: 11 5555 0001"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Fecha">
            <Input
              type="date"
              required
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </Field>
          <Field label="Hora (formato 24 hs)">
            <Select value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })}>
              {!HORARIOS_24HS.includes(form.hora) && (
                <option value={form.hora}>{form.hora}</option>
              )}
              {HORARIOS_24HS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Monto ($)">
            <Input
              type="number"
              min={0}
              step="0.01"
              required
              value={form.monto || ""}
              onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })}
            />
          </Field>
          <Field label="Modalidad de Pago">
            <Select
              value={form.modalidad_pago}
              onChange={(e) => setForm({ ...form, modalidad_pago: e.target.value })}
            >
              {MODALIDADES_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Estado del Cobro">
          <Select
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as TurnoForm["estado"] })}
          >
            <option value="pendiente">Pendiente</option>
            <option value="cobrado">Cobrado</option>
          </Select>
        </Field>

        <Field label="Notas (opcional)">
          <Textarea
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            placeholder="Observaciones del turno…"
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
