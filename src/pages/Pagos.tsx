import { useMemo, useState } from "react";
import { Plus, Download, Pencil, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { useData } from "../hooks/useData";
import {
  createPago,
  deletePago,
  getAlumnos,
  getPagos,
  getPlanes,
  setEstadoPago,
  updatePago,
} from "../lib/api";
import type { Pago } from "../lib/types";
import { formatFecha, formatPrecio, nombreCompleto } from "../lib/format";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  PageHeader,
  Table,
} from "../components/ui";
import { PagoModal } from "../components/PagoModal";

type Filtro = "todos" | "pendiente" | "completado";

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "pendiente", etiqueta: "Pendientes" },
  { valor: "completado", etiqueta: "Completados" },
];

export default function Pagos() {
  const { data: pagos, loading, error, reload } = useData(getPagos);
  const alumnos = useData(getAlumnos);
  const planes = useData(getPlanes);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modal, setModal] = useState<{ abierto: boolean; pago: Pago | null }>({
    abierto: false,
    pago: null,
  });
  const [aEliminar, setAEliminar] = useState<Pago | null>(null);

  const nombreAlumno = (id: string) => {
    const a = alumnos.data?.find((x) => x.id === id);
    return a ? nombreCompleto(a) : "—";
  };

  const filtrados = useMemo(() => {
    if (filtro === "todos") return pagos ?? [];
    return (pagos ?? []).filter((p) => p.estado === filtro);
  }, [pagos, filtro]);

  const guardar = async (input: Omit<Pago, "id">) => {
    if (modal.pago) {
      await updatePago(modal.pago.id, input);
    } else {
      await createPago(input);
    }
    setModal({ abierto: false, pago: null });
    reload();
  };

  const cambiarEstado = async (p: Pago) => {
    await setEstadoPago(p.id, p.estado === "pendiente" ? "completado" : "pendiente");
    reload();
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    await deletePago(aEliminar.id);
    setAEliminar(null);
    reload();
  };

  // Exporta el historial completo como CSV (abre en Excel).
  const exportarCSV = () => {
    const filas = [
      ["Alumno", "Concepto", "Modalidad", "Detalle métodos", "Monto", "Fecha", "Mes cuota", "Estado", "Notas"],
      ...(pagos ?? []).map((p) => [
        nombreAlumno(p.alumno_id),
        p.concepto,
        p.modalidad_pago,
        (p.metodos_pago ?? []).map((m) => `${m.metodo} $${m.monto}`).join(" + "),
        String(p.monto),
        p.fecha_pago,
        p.mes_imputacion,
        p.estado,
        p.notas,
      ]),
    ];
    const csv = filas
      .map((f) => f.map((celda) => `"${celda.replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pagos-prana-yoga-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading || alumnos.loading || planes.loading) return <LoadingState />;
  const err = error || alumnos.error || planes.error;
  if (err) return <ErrorState message={err} />;

  return (
    <div>
      <PageHeader
        title="Registro de Pagos"
        description="Control de cobros, pendientes y recibos."
        actions={
          <>
            <Button variant="outline" onClick={exportarCSV}>
              <Download className="w-5 h-5" />
              Exportar Historial
            </Button>
            <Button onClick={() => setModal({ abierto: true, pago: null })}>
              <Plus className="w-5 h-5" />
              Registrar Pago
            </Button>
          </>
        }
      />

      {/* Filtros por chips */}
      <div className="flex gap-2 mb-5">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={clsx(
              "rounded-full px-5 py-2.5 text-base font-semibold transition-colors",
              filtro === f.valor
                ? "bg-primary text-white shadow-sm"
                : "bg-card border-2 border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState message="No hay pagos para mostrar con este filtro." />
      ) : (
        <Table
          headers={["Alumno", "Concepto / Plan", "Modalidad", "Monto", "Fecha", "Estado", "Acciones"]}
        >
          {filtrados.map((p) => (
            <tr key={p.id} className="hover:bg-muted/40">
              <td className="px-5 py-4 font-semibold">{nombreAlumno(p.alumno_id)}</td>
              <td className="px-5 py-4">{p.concepto}</td>
              <td
                className="px-5 py-4 text-muted-foreground"
                title={(p.metodos_pago ?? [])
                  .map((m) => `${m.metodo}: ${formatPrecio(Number(m.monto))}`)
                  .join(" + ")}
              >
                {p.modalidad_pago}
              </td>
              <td className="px-5 py-4 font-bold">{formatPrecio(Number(p.monto))}</td>
              <td className="px-5 py-4 text-muted-foreground">{formatFecha(p.fecha_pago)}</td>
              <td className="px-5 py-4">
                {p.estado === "completado" ? (
                  <Badge tone="success">Completado</Badge>
                ) : (
                  <Badge tone="warning">Pendiente</Badge>
                )}
              </td>
              <td className="px-5 py-4">
                <div className="flex gap-2">
                  <IconButton
                    title={p.estado === "pendiente" ? "Marcar como cobrado" : "Volver a pendiente"}
                    onClick={() => cambiarEstado(p)}
                    className={p.estado === "pendiente" ? "text-success" : ""}
                  >
                    {p.estado === "pendiente" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <RotateCcw className="w-5 h-5" />
                    )}
                  </IconButton>
                  <IconButton title="Editar" onClick={() => setModal({ abierto: true, pago: p })}>
                    <Pencil className="w-5 h-5" />
                  </IconButton>
                  <IconButton title="Eliminar" onClick={() => setAEliminar(p)} className="text-danger">
                    <Trash2 className="w-5 h-5" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {modal.abierto && (
        <PagoModal
          pago={modal.pago}
          alumnos={alumnos.data ?? []}
          planes={planes.data ?? []}
          onSave={guardar}
          onClose={() => setModal({ abierto: false, pago: null })}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          title="Eliminar pago"
          message={`¿Seguro que querés eliminar este pago de ${formatPrecio(Number(aEliminar.monto))}? Esta acción no se puede deshacer.`}
          onConfirm={eliminar}
          onCancel={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
