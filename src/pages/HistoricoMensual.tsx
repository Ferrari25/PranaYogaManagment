import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Clock, MessageCircle, HandCoins } from "lucide-react";
import { useData } from "../hooks/useData";
import { createPago, getAlumnos, getPagos, getPlanes, setEstadoPago } from "../lib/api";
import type { Alumno, Pago } from "../lib/types";
import {
  formatMes,
  formatPrecio,
  hoyIso,
  mesActualIso,
  nombreCompleto,
  sumarMeses,
  whatsappUrl,
} from "../lib/format";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Table,
} from "../components/ui";

/** Mes de arranque del histórico: agosto 2026 (creación del sistema). */
const MES_INICIO = "2026-08";

/** Mes al que corresponde un pago (cuota imputada; cae en fecha_pago si falta). */
function mesDelPago(p: Pago): string {
  return p.mes_imputacion || p.fecha_pago.slice(0, 7);
}

interface Deudor {
  alumno: Alumno;
  /** Pago pendiente ya registrado del mes, si existe. */
  pagoPendiente: Pago | null;
  /** Monto adeudado: el del pago pendiente, o la cuota esperada por sus planes. */
  monto: number;
  concepto: string;
}

export default function HistoricoMensual() {
  const alumnos = useData(getAlumnos);
  const planes = useData(getPlanes);
  const { data: pagos, loading, error, reload } = useData(getPagos);

  const [mes, setMes] = useState(() =>
    mesActualIso() < MES_INICIO ? MES_INICIO : mesActualIso()
  );
  const [cobrando, setCobrando] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  if (loading || alumnos.loading || planes.loading) return <LoadingState />;
  const err = error || alumnos.error || planes.error;
  if (err) return <ErrorState message={err} />;

  const listaPagos = pagos ?? [];
  const pagosDelMes = listaPagos.filter((p) => mesDelPago(p) === mes);

  const ingresosCobrados = pagosDelMes
    .filter((p) => p.estado === "completado")
    .reduce((sum, p) => sum + Number(p.monto), 0);

  const pendientePorCobrar = pagosDelMes
    .filter((p) => p.estado === "pendiente")
    .reduce((sum, p) => sum + Number(p.monto), 0);

  // Deudores del mes: SOLO alumnos con planes asignados que no tienen ningún
  // pago completado imputado a este mes. Los que ya pagaron no aparecen.
  const deudores: Deudor[] = (alumnos.data ?? [])
    .filter((a) => a.plan_ids.length > 0)
    .flatMap((a) => {
      const susPagos = pagosDelMes.filter((p) => p.alumno_id === a.id);
      if (susPagos.some((p) => p.estado === "completado")) return [];

      const susPlanes = (planes.data ?? []).filter((p) => a.plan_ids.includes(p.id));
      const cuota = susPlanes.reduce((sum, p) => sum + Number(p.precio), 0);
      const pagoPendiente = susPagos.find((p) => p.estado === "pendiente") ?? null;

      return [
        {
          alumno: a,
          pagoPendiente,
          monto: pagoPendiente ? Number(pagoPendiente.monto) : cuota,
          concepto: pagoPendiente?.concepto || susPlanes.map((p) => p.nombre).join(" + "),
        },
      ];
    })
    .sort((d1, d2) => nombreCompleto(d1.alumno).localeCompare(nombreCompleto(d2.alumno)));

  /** Cobro directo: completa el pago pendiente o registra uno nuevo cobrado hoy. */
  const cobrar = async (d: Deudor) => {
    setCobrando(d.alumno.id);
    setErrorAccion(null);
    try {
      if (d.pagoPendiente) {
        await setEstadoPago(d.pagoPendiente.id, "completado");
      } else {
        await createPago({
          alumno_id: d.alumno.id,
          concepto: d.concepto,
          monto: d.monto,
          modalidad_pago: "Efectivo",
          metodos_pago: [{ metodo: "Efectivo", monto: d.monto }],
          mes_imputacion: mes,
          estado: "completado",
          fecha_pago: hoyIso(),
          notas: "",
        });
      }
      reload();
    } catch (e) {
      setErrorAccion((e as Error).message);
    } finally {
      setCobrando(null);
    }
  };

  const mensajeRecordatorio = (d: Deudor) =>
    `Hola ${d.alumno.nombre}! Te escribimos de PRANA YOGA. Te recordamos que está pendiente la cuota de ${formatMes(mes)} (${formatPrecio(d.monto)}). ¡Gracias!`;

  return (
    <div>
      <PageHeader
        title="Histórico Mensual"
        description="Resumen de cobros del mes y alumnos con cuota pendiente."
      />

      {/* Selector de mes */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          onClick={() => setMes(sumarMeses(mes, -1))}
          disabled={mes <= MES_INICIO}
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <p className="text-2xl font-bold font-serif min-w-52 text-center">{formatMes(mes)}</p>
        <Button variant="outline" onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Métricas del mes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">
              Ingresos totales cobrados
            </span>
          </div>
          <p className="text-3xl font-bold font-serif mt-3 text-success">
            {formatPrecio(ingresosCobrados)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">
              Monto pendiente por cobrar
            </span>
          </div>
          <p className="text-3xl font-bold font-serif mt-3 text-warning">
            {formatPrecio(pendientePorCobrar)}
          </p>
        </div>
      </div>

      {/* Lista exclusiva de deudores */}
      <h2 className="text-2xl font-bold mb-1">Cuotas pendientes de {formatMes(mes)}</h2>
      <p className="text-muted-foreground mb-4">
        Solo aparecen los alumnos que todavía no pagaron este mes.
      </p>

      {errorAccion && <ErrorState message={errorAccion} />}

      {deudores.length === 0 ? (
        <EmptyState message="¡Excelente! Todos los alumnos están al día este mes." />
      ) : (
        <Table headers={["Alumno", "Concepto", "Monto adeudado", "Estado", "Acciones"]}>
          {deudores.map((d) => (
            <tr key={d.alumno.id} className="hover:bg-muted/40">
              <td className="px-5 py-4 font-semibold">{nombreCompleto(d.alumno)}</td>
              <td className="px-5 py-4 text-muted-foreground">{d.concepto || "—"}</td>
              <td className="px-5 py-4 font-bold">{formatPrecio(d.monto)}</td>
              <td className="px-5 py-4">
                {d.pagoPendiente ? (
                  <Badge tone="warning">Pago pendiente</Badge>
                ) : (
                  <Badge tone="danger">Sin registrar</Badge>
                )}
              </td>
              <td className="px-5 py-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => cobrar(d)}
                    disabled={cobrando === d.alumno.id}
                    className="px-4 py-2 text-sm"
                  >
                    <HandCoins className="w-4 h-4" />
                    {cobrando === d.alumno.id ? "Cobrando…" : "Registrar cobro"}
                  </Button>
                  {d.alumno.telefono && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(
                          whatsappUrl(d.alumno.telefono, mensajeRecordatorio(d)),
                          "_blank"
                        )
                      }
                      className="px-4 py-2 text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Recordatorio
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
