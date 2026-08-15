import { useMemo, useState } from "react";
import { Plus, Download, Pencil, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import { useData } from "../hooks/useData";
import {
  createPago,
  deletePago,
  getAlumnos,
  getPagos,
  getPlanes,
  setEstadoPago,
  sincronizarCuotas,
  updatePago,
} from "../lib/api";
import type { Pago } from "../lib/types";
import { formatFecha, formatMes, formatPrecio, nombreCompleto } from "../lib/format";
import {
  Badge,
  Button,
  ChipsFiltro,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FiltroSelect,
  IconButton,
  LoadingState,
  PageHeader,
  Table,
} from "../components/ui";
import { PagoModal } from "../components/PagoModal";

type Filtro = "todos" | "pendiente" | "completado";
type Orden = "recientes" | "antiguos" | "monto";

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "pendiente", etiqueta: "Pendientes" },
  { valor: "completado", etiqueta: "Completados" },
];

export default function Pagos() {
  // La sincronización genera las cuotas pendientes de cada ciclo antes de listar.
  const { data: pagos, loading, error, reload } = useData(() =>
    sincronizarCuotas().then(getPagos)
  );
  const alumnos = useData(getAlumnos);
  const planes = useData(getPlanes);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [alumnoFiltro, setAlumnoFiltro] = useState("todos");
  const [mesFiltro, setMesFiltro] = useState("todos");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [modal, setModal] = useState<{ abierto: boolean; pago: Pago | null }>({
    abierto: false,
    pago: null,
  });
  const [aEliminar, setAEliminar] = useState<Pago | null>(null);

  const nombreAlumno = (id: string) => {
    const a = alumnos.data?.find((x) => x.id === id);
    return a ? nombreCompleto(a) : "—";
  };

  // Meses de cuota presentes en los pagos, del más nuevo al más viejo.
  const mesesDisponibles = useMemo(
    () => [...new Set((pagos ?? []).map((p) => p.mes_imputacion))].sort().reverse(),
    [pagos]
  );

  const filtrados = useMemo(() => {
    let lista = pagos ?? [];
    if (filtro !== "todos") lista = lista.filter((p) => p.estado === filtro);
    if (alumnoFiltro !== "todos") lista = lista.filter((p) => p.alumno_id === alumnoFiltro);
    if (mesFiltro !== "todos") lista = lista.filter((p) => p.mes_imputacion === mesFiltro);

    const ordenada = [...lista];
    if (orden === "monto") {
      ordenada.sort((a, b) => Number(b.monto) - Number(a.monto));
    } else if (orden === "antiguos") {
      ordenada.sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago));
    } else {
      ordenada.sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago));
    }
    return ordenada;
  }, [pagos, filtro, alumnoFiltro, mesFiltro, orden]);

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

      {/* Filtros y ordenamiento */}
      <div className="flex flex-col gap-3 mb-5">
        <ChipsFiltro opciones={FILTROS} valor={filtro} onChange={setFiltro} />
        <div className="flex gap-3 flex-wrap items-end">
          <FiltroSelect label="Alumno" value={alumnoFiltro} onChange={setAlumnoFiltro}>
            <option value="todos">Todos los alumnos</option>
            {(alumnos.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {nombreCompleto(a)}
              </option>
            ))}
          </FiltroSelect>
          <FiltroSelect label="Mes de la cuota" value={mesFiltro} onChange={setMesFiltro}>
            <option value="todos">Todos los meses</option>
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>
                {formatMes(m)}
              </option>
            ))}
          </FiltroSelect>
          <FiltroSelect
            label="Ordenar por"
            value={orden}
            onChange={(v) => setOrden(v as Orden)}
          >
            <option value="recientes">Más recientes</option>
            <option value="antiguos">Más antiguos</option>
            <option value="monto">Mayor monto</option>
          </FiltroSelect>
        </div>
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
