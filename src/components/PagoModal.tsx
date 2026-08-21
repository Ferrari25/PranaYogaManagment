import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Alumno, MetodoPago, Pago, Plan } from "../lib/types";
import { MODALIDADES_PAGO } from "../lib/types";
import { formatPrecio, hoyIso, mesActualIso, nombreCompleto } from "../lib/format";
import { Button, Field, IconButton, Input, Modal, MoneyInput, Select, Textarea } from "./ui";
import clsx from "clsx";

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
  const [form, setForm] = useState<Omit<PagoForm, "modalidad_pago" | "metodos_pago">>({
    alumno_id: pago?.alumno_id ?? "",
    concepto: pago?.concepto ?? "",
    monto: pago?.monto ?? 0,
    estado: pago?.estado ?? "completado",
    fecha_pago: pago?.fecha_pago ?? hoyIso(),
    mes_imputacion: pago?.mes_imputacion ?? mesActualIso(),
    notas: pago?.notas ?? "",
  });

  // Métodos del pago (puede ser uno solo o dividido en varios). Mientras haya
  // un único método, su monto se mantiene sincronizado con el total.
  const [metodos, setMetodos] = useState<MetodoPago[]>(() => {
    if (pago?.metodos_pago && pago.metodos_pago.length > 0) return pago.metodos_pago;
    return [{ metodo: pago?.modalidad_pago ?? "Efectivo", monto: pago?.monto ?? 0 }];
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sumaMetodos = metodos.reduce((sum, m) => sum + Number(m.monto || 0), 0);
  const diferencia = Number(form.monto) - sumaMetodos;
  const montosCoinciden = metodos.length === 1 || diferencia === 0;

  const setTotal = (monto: number) => {
    setForm((f) => ({ ...f, monto }));
    // Con un solo método no hay división: el parcial sigue al total.
    setMetodos((ms) => (ms.length === 1 ? [{ ...ms[0], monto }] : ms));
  };

  /** Al elegir alumno, auto-completa concepto y monto con sus planes asignados. */
  const elegirAlumno = (alumnoId: string) => {
    setForm((f) => ({ ...f, alumno_id: alumnoId }));
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno) return;
    const susPlanes = planes.filter((p) => alumno.plan_ids.includes(p.id));
    if (susPlanes.length > 0) {
      const total = susPlanes.reduce((sum, p) => sum + Number(p.precio), 0);
      setForm((f) => ({
        ...f,
        alumno_id: alumnoId,
        concepto: susPlanes.map((p) => p.nombre).join(" + "),
      }));
      setTotal(total);
    }
  };

  const cambiarMetodo = (idx: number, cambio: Partial<MetodoPago>) => {
    setMetodos((ms) => ms.map((m, i) => (i === idx ? { ...m, ...cambio } : m)));
  };

  const agregarMetodo = () => {
    setMetodos((ms) => [...ms, { metodo: "Transferencia", monto: Math.max(diferencia, 0) }]);
  };

  const quitarMetodo = (idx: number) => {
    setMetodos((ms) => {
      const nuevos = ms.filter((_, i) => i !== idx);
      // Si vuelve a quedar un solo método, se re-sincroniza con el total.
      return nuevos.length === 1 ? [{ ...nuevos[0], monto: Number(form.monto) }] : nuevos;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const total = Number(form.monto);
    const metodosFinales =
      metodos.length === 1 ? [{ ...metodos[0], monto: total }] : metodos;

    if (metodos.length > 1 && diferencia !== 0) {
      setError(
        `Los montos parciales suman ${formatPrecio(sumaMetodos)} pero el total es ${formatPrecio(total)}. Ajustá la diferencia de ${formatPrecio(Math.abs(diferencia))}.`
      );
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await onSave({
        ...form,
        monto: total,
        metodos_pago: metodosFinales.map((m) => ({ ...m, monto: Number(m.monto) })),
        modalidad_pago: metodosFinales.map((m) => m.metodo).join(" + "),
      });
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
            onChange={(e) => elegirAlumno(e.target.value)}
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
            onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            placeholder="Se completa al elegir el alumno"
          />
          <datalist id="conceptos-planes">
            {planes.map((p) => (
              <option key={p.id} value={p.nombre} />
            ))}
          </datalist>
        </Field>

        <Field label="Monto Total ($)">
          <MoneyInput required value={form.monto} onChange={setTotal} />
        </Field>

        {/* Métodos de pago: uno solo o dividido en varios */}
        <div>
          <p className="text-base font-semibold mb-2">
            {metodos.length > 1 ? "Métodos de pago (pago dividido)" : "Modalidad de Pago"}
          </p>
          <div className="space-y-2">
            {metodos.map((m, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Select
                  value={m.metodo}
                  onChange={(e) => cambiarMetodo(idx, { metodo: e.target.value })}
                  className="flex-1"
                >
                  {MODALIDADES_PAGO.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </Select>
                {metodos.length > 1 && (
                  <>
                    <MoneyInput
                      required
                      value={m.monto}
                      onChange={(monto) => cambiarMetodo(idx, { monto })}
                      className="w-36"
                      aria-label={`Monto parcial en ${m.metodo}`}
                    />
                    <IconButton
                      title="Quitar método"
                      onClick={() => quitarMetodo(idx)}
                      className="text-danger shrink-0"
                      type="button"
                    >
                      <Trash2 className="w-5 h-5" />
                    </IconButton>
                  </>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={agregarMetodo}
            className="mt-2 inline-flex items-center gap-1.5 text-primary-dark font-semibold hover:underline"
          >
            <Plus className="w-4 h-4" />
            Dividir en otro método de pago
          </button>

          {metodos.length > 1 && (
            <p
              className={clsx(
                "mt-2 rounded-xl px-4 py-2.5 font-semibold",
                montosCoinciden ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
              )}
            >
              {montosCoinciden
                ? `Los parciales suman ${formatPrecio(sumaMetodos)}: coincide con el total.`
                : `Suman ${formatPrecio(sumaMetodos)} de ${formatPrecio(Number(form.monto))} — ${
                    diferencia > 0 ? "faltan" : "sobran"
                  } ${formatPrecio(Math.abs(diferencia))}.`}
            </p>
          )}
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
          <Field label="Mes de la cuota">
            <Input
              type="month"
              required
              value={form.mes_imputacion}
              onChange={(e) => setForm({ ...form, mes_imputacion: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Estado">
          <Select
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as PagoForm["estado"] })}
          >
            <option value="completado">Completado</option>
            <option value="pendiente">Pendiente</option>
          </Select>
        </Field>

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
          <Button type="submit" disabled={guardando || !montosCoinciden}>
            {guardando ? "Guardando…" : "Confirmar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
