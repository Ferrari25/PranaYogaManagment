import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Clock3,
  CheckCircle2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useData } from "../hooks/useData";
import {
  createServicioTerapia,
  createTurnoTerapia,
  deleteServicioTerapia,
  deleteTurnoTerapia,
  getServiciosTerapias,
  getTurnosTerapias,
  setEstadoTurno,
  updateServicioTerapia,
  updateTurnoTerapia,
} from "../lib/api";
import type { ServicioTerapia, TurnoTerapia } from "../lib/types";
import {
  formatFecha,
  formatHora,
  formatMes,
  formatPrecio,
  mesActualIso,
  sumarMeses,
  whatsappUrl,
} from "../lib/format";
import {
  Badge,
  Button,
  ChipsFiltro,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  PageHeader,
  Table,
} from "../components/ui";
import { ServicioModal } from "../components/ServicioModal";
import { TurnoModal } from "../components/TurnoModal";

type FiltroTurnos = "todos" | "cobrado" | "pendiente";

const FILTROS_TURNOS: { valor: FiltroTurnos; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "pendiente", etiqueta: "Pendientes" },
  { valor: "cobrado", etiqueta: "Cobrados" },
];

export default function MasajesReiki() {
  const servicios = useData(getServiciosTerapias);
  const turnos = useData(getTurnosTerapias);

  const [mes, setMes] = useState(mesActualIso());
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroTurnos>("todos");
  const [modalServicio, setModalServicio] = useState<{
    abierto: boolean;
    servicio: ServicioTerapia | null;
  }>({ abierto: false, servicio: null });
  const [modalTurno, setModalTurno] = useState<{ abierto: boolean; turno: TurnoTerapia | null }>({
    abierto: false,
    turno: null,
  });
  const [servicioAEliminar, setServicioAEliminar] = useState<ServicioTerapia | null>(null);
  const [turnoAEliminar, setTurnoAEliminar] = useState<TurnoTerapia | null>(null);

  const guardarServicio = async (input: Omit<ServicioTerapia, "id" | "activo">) => {
    if (modalServicio.servicio) {
      await updateServicioTerapia(modalServicio.servicio.id, input);
    } else {
      await createServicioTerapia(input);
    }
    setModalServicio({ abierto: false, servicio: null });
    servicios.reload();
  };

  const guardarTurno = async (input: Omit<TurnoTerapia, "id">) => {
    if (modalTurno.turno) {
      await updateTurnoTerapia(modalTurno.turno.id, input);
    } else {
      await createTurnoTerapia(input);
    }
    setModalTurno({ abierto: false, turno: null });
    turnos.reload();
  };

  const eliminarServicio = async () => {
    if (!servicioAEliminar) return;
    await deleteServicioTerapia(servicioAEliminar.id);
    setServicioAEliminar(null);
    servicios.reload();
  };

  const eliminarTurno = async () => {
    if (!turnoAEliminar) return;
    await deleteTurnoTerapia(turnoAEliminar.id);
    setTurnoAEliminar(null);
    turnos.reload();
  };

  const cambiarEstado = async (t: TurnoTerapia) => {
    await setEstadoTurno(t.id, t.estado === "pendiente" ? "cobrado" : "pendiente");
    turnos.reload();
  };

  if (servicios.loading || turnos.loading) return <LoadingState />;
  const err = servicios.error || turnos.error;
  if (err) return <ErrorState message={err} />;

  const nombreServicio = (id: string | null) =>
    servicios.data?.find((s) => s.id === id)?.nombre ?? "Servicio eliminado";

  // Métricas propias del módulo, filtradas por mes (independientes del yoga).
  const turnosDelMes = (turnos.data ?? []).filter((t) => t.fecha.startsWith(mes));
  const recaudadoMes = turnosDelMes
    .filter((t) => t.estado === "cobrado")
    .reduce((sum, t) => sum + Number(t.monto), 0);
  const pendienteMes = turnosDelMes
    .filter((t) => t.estado === "pendiente")
    .reduce((sum, t) => sum + Number(t.monto), 0);

  const turnosFiltrados =
    estadoFiltro === "todos"
      ? turnosDelMes
      : turnosDelMes.filter((t) => t.estado === estadoFiltro);

  return (
    <div>
      <PageHeader
        title="Masajes & Reiki"
        description="Servicios independientes del estudio: turnos, precios y cobros propios."
        actions={
          <>
            <Button variant="outline" onClick={() => setModalServicio({ abierto: true, servicio: null })}>
              <Plus className="w-5 h-5" />
              Nuevo Servicio
            </Button>
            <Button onClick={() => setModalTurno({ abierto: true, turno: null })}>
              <Plus className="w-5 h-5" />
              Nuevo Turno
            </Button>
          </>
        }
      />

      {/* Selector de mes + métrica independiente */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <p className="text-xl font-bold font-serif min-w-44 text-center">{formatMes(mes)}</p>
          <Button variant="outline" onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 rounded-2xl border border-border bg-card px-5 py-3 shadow-sm flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-2 text-muted-foreground text-sm font-semibold uppercase tracking-wide">
            <TrendingUp className="w-5 h-5" />
            Recaudado en Masajes &amp; Reiki
          </span>
          <span className="text-2xl font-bold font-serif text-success">
            {formatPrecio(recaudadoMes)}
          </span>
          {pendienteMes > 0 && (
            <Badge tone="warning">Pendiente: {formatPrecio(pendienteMes)}</Badge>
          )}
        </div>
      </div>

      {/* Catálogo de servicios */}
      <h2 className="text-2xl font-bold mb-4">Servicios y Precios</h2>
      {(servicios.data ?? []).length === 0 ? (
        <EmptyState message="Todavía no hay servicios. Creá el primero con el botón de arriba." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {(servicios.data ?? []).map((s) => (
            <article
              key={s.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col"
            >
              <h3 className="text-lg font-bold">{s.nombre}</h3>
              <p className="text-3xl font-bold font-serif text-primary-dark mt-2">
                {formatPrecio(Number(s.precio))}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground mt-2 flex-1">
                <Clock3 className="w-4 h-4" />
                {s.duracion_minutos} minutos
              </p>
              <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                <IconButton
                  title="Editar"
                  onClick={() => setModalServicio({ abierto: true, servicio: s })}
                >
                  <Pencil className="w-5 h-5" />
                </IconButton>
                <IconButton
                  title="Eliminar"
                  onClick={() => setServicioAEliminar(s)}
                  className="text-danger"
                >
                  <Trash2 className="w-5 h-5" />
                </IconButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Turnos del mes */}
      <h2 className="text-2xl font-bold mb-4">Turnos de {formatMes(mes)}</h2>
      <div className="mb-4">
        <ChipsFiltro opciones={FILTROS_TURNOS} valor={estadoFiltro} onChange={setEstadoFiltro} />
      </div>
      {turnosFiltrados.length === 0 ? (
        <EmptyState message="No hay turnos para mostrar con este filtro." />
      ) : (
        <Table
          headers={["Cliente", "Contacto", "Servicio", "Fecha", "Hora", "Monto", "Estado", "Acciones"]}
        >
          {turnosFiltrados.map((t) => (
            <tr key={t.id} className="hover:bg-muted/40">
              <td className="px-5 py-4 font-semibold">{t.cliente_nombre}</td>
              <td className="px-5 py-4">
                {t.cliente_telefono ? (
                  <a
                    href={whatsappUrl(t.cliente_telefono)}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir chat de WhatsApp"
                    className="text-success font-semibold hover:underline"
                  >
                    {t.cliente_telefono}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-5 py-4">{nombreServicio(t.servicio_id)}</td>
              <td className="px-5 py-4 text-muted-foreground">{formatFecha(t.fecha)}</td>
              <td className="px-5 py-4 text-muted-foreground">{formatHora(t.hora)} hs</td>
              <td className="px-5 py-4 font-bold">{formatPrecio(Number(t.monto))}</td>
              <td className="px-5 py-4">
                {t.estado === "cobrado" ? (
                  <Badge tone="success">Cobrado</Badge>
                ) : (
                  <Badge tone="warning">Pendiente</Badge>
                )}
              </td>
              <td className="px-5 py-4">
                <div className="flex gap-2">
                  <IconButton
                    title={t.estado === "pendiente" ? "Marcar como cobrado" : "Volver a pendiente"}
                    onClick={() => cambiarEstado(t)}
                    className={t.estado === "pendiente" ? "text-success" : ""}
                  >
                    {t.estado === "pendiente" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <RotateCcw className="w-5 h-5" />
                    )}
                  </IconButton>
                  <IconButton
                    title="Editar"
                    onClick={() => setModalTurno({ abierto: true, turno: t })}
                  >
                    <Pencil className="w-5 h-5" />
                  </IconButton>
                  <IconButton
                    title="Eliminar"
                    onClick={() => setTurnoAEliminar(t)}
                    className="text-danger"
                  >
                    <Trash2 className="w-5 h-5" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {modalServicio.abierto && (
        <ServicioModal
          servicio={modalServicio.servicio}
          onSave={guardarServicio}
          onClose={() => setModalServicio({ abierto: false, servicio: null })}
        />
      )}

      {modalTurno.abierto && (
        <TurnoModal
          turno={modalTurno.turno}
          servicios={servicios.data ?? []}
          onSave={guardarTurno}
          onClose={() => setModalTurno({ abierto: false, turno: null })}
        />
      )}

      {servicioAEliminar && (
        <ConfirmDialog
          title="Eliminar servicio"
          message={`¿Seguro que querés eliminar el servicio "${servicioAEliminar.nombre}"? Los turnos ya registrados se conservan.`}
          onConfirm={eliminarServicio}
          onCancel={() => setServicioAEliminar(null)}
        />
      )}

      {turnoAEliminar && (
        <ConfirmDialog
          title="Eliminar turno"
          message={`¿Seguro que querés eliminar el turno de ${turnoAEliminar.cliente_nombre}? Esta acción no se puede deshacer.`}
          onConfirm={eliminarTurno}
          onCancel={() => setTurnoAEliminar(null)}
        />
      )}
    </div>
  );
}
