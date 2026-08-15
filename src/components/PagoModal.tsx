import { useState, type FormEvent } from "react";
import type { Alumno, Pago, Plan } from "../lib/types";
import { MODALIDADES_PAGO } from "../lib/types";
import { hoyIso, nombreCompleto } from "../lib/format";
import { Button, Field, Input, Modal, Select, Textarea } from "./ui";

type PagoForm = Omit<Pago, "id">;

export function PagoModal({
  pago,
  alumnos,
  planes,
  onSave,
  onClose,
}: {
  pago: Pago | null; // null = registrar nuevo pago
  alumnos: Alumno[];
  planes: Plan[];
  onSave: (input: PagoForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PagoForm>({
    alumno_id: pago?.alumno_id ?? "",
    concepto: pago?.concepto ?? "",
    monto: pago?.monto ?? 0,
    modalidad_pago: pago?.modalidad_pago ?? "Efectivo",
    estado: pago?.estado ?? "completado",
    fecha_pago: pago?.fecha_pago ?? hoyIso(),
    notas: pago?.notas ?? "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al elegir un plan como concepto, autocompleta el monto con su precio.
  const elegirConcepto = (concepto: string) => {
    const plan = planes.find((p) => p.nombre === concepto);
    setForm((f) => ({ ...f, concepto, monto: plan ? Number(plan.precio) : f.monto }));
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
    <Modal title={pago ? "Editar Pago" : "Registrar Pago"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Alumno">
          <Select
            required
            value={form.alumno_id}
            onChange={(e) => setForm({ ...form, alumno_id: e.target.value })}
          >
            <option value="" disabled>
              Elegir alumno…
            </option>
            {alumnos.map((a) => (
              <option key={a.id} value={a.id}>
                {nombreCompleto(a)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Concepto / Plan">
          <Input
            required
            list="conceptos-planes"
            value={form.concepto}
            onChange={(e) => elegirConcepto(e.target.value)}
            placeholder="Ej: Plan 2 Días (Hatha / Vinyasa)"
          />
          <datalist id="conceptos-planes">
            {planes.map((p) => (
              <option key={p.id} value={p.nombre} />
            ))}
          </datalist>
        </Field>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Fecha de Pago">
            <Input
              type="date"
              required
              value={form.fecha_pago}
              onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })}
            />
          </Field>
          <Field label="Estado">
            <Select
              value={form.estado}
              onChange={(e) =>
                setForm({ ...form, estado: e.target.value as PagoForm["estado"] })
              }
            >
              <option value="completado">Completado</option>
              <option value="pendiente">Pendiente</option>
            </Select>
          </Field>
        </div>

        <Field label="Notas (opcional)">
          <Textarea
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            placeholder="Observaciones del pago…"
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
