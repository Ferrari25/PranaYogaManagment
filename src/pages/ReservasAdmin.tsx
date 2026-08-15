import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Copy, Check, XCircle } from "lucide-react";
import { useData } from "../hooks/useData";
import { cancelarReserva, getClases, getReservas } from "../lib/api";
import { marcarReservasVistas } from "../lib/reservasNuevas";
import type { Reserva } from "../lib/types";
import { formatFecha, formatHora, whatsappUrl } from "../lib/format";
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

type FiltroEstado = "confirmada" | "cancelada" | "todas";
type Orden = "recientes" | "proximas";

const FILTROS_ESTADO: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: "confirmada", etiqueta: "Confirmadas" },
  { valor: "cancelada", etiqueta: "Canceladas" },
  { valor: "todas", etiqueta: "Todas" },
];

export default function ReservasAdmin() {
  const { data: reservas, loading, error, reload } = useData(getReservas);
  const clases = useData(getClases);
  const [copiado, setCopiado] = useState(false);
  const [aCancelar, setACancelar] = useState<Reserva | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>("confirmada");
  const [claseFiltro, setClaseFiltro] = useState("todas");
  const [orden, setOrden] = useState<Orden>("recientes");

  // Al entrar a esta pantalla, el aviso de reservas nuevas del sidebar se limpia.
  useEffect(() => {
    if (!loading) marcarReservasVistas();
  }, [loading]);

  const filtradas = useMemo(() => {
    let lista = reservas ?? [];
    if (estadoFiltro !== "todas") lista = lista.filter((r) => r.estado === estadoFiltro);
    if (claseFiltro !== "todas") lista = lista.filter((r) => r.clase_id === claseFiltro);

    const ordenada = [...lista];
    if (orden === "proximas") {
      ordenada.sort((a, b) => a.fecha_reserva.localeCompare(b.fecha_reserva));
    } else {
      ordenada.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return ordenada;
  }, [reservas, estadoFiltro, claseFiltro, orden]);

  const urlPublica = `${window.location.origin}/book`;

  const copiarLink = async () => {
    await navigator.clipboard.writeText(urlPublica);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const descClase = (id: string) => {
    const c = clases.data?.find((x) => x.id === id);
    return c ? `${c.nombre} · ${c.dia_semana} ${formatHora(c.hora_inicio)} hs` : "Clase eliminada";
  };

  const cancelar = async () => {
    if (!aCancelar) return;
    await cancelarReserva(aCancelar.id);
    setACancelar(null);
    reload();
  };

  if (loading || clases.loading) return <LoadingState />;
  const err = error || clases.error;
  if (err) return <ErrorState message={err} />;

  return (
    <div>
      <PageHeader
        title="Reservas"
        description="Reservas hechas por clientes desde la página pública."
        actions={
          <>
            <Button variant="outline" onClick={copiarLink}>
              {copiado ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
              {copiado ? "¡Link copiado!" : "Copiar link público"}
            </Button>
            <Button onClick={() => window.open("/book", "_blank")}>
              <ExternalLink className="w-5 h-5" />
              Abrir página de reservas
            </Button>
          </>
        }
      />

      <p className="mb-5 text-muted-foreground">
        Compartí este link con tus clientes para que reserven solos:{" "}
        <code className="font-mono bg-muted px-2 py-1 rounded text-foreground">{urlPublica}</code>
      </p>

      {/* Filtros y ordenamiento */}
      <div className="flex flex-col gap-3 mb-5">
        <ChipsFiltro opciones={FILTROS_ESTADO} valor={estadoFiltro} onChange={setEstadoFiltro} />
        <div className="flex gap-3 flex-wrap items-end">
          <FiltroSelect label="Clase" value={claseFiltro} onChange={setClaseFiltro}>
            <option value="todas">Todas las clases</option>
            {(clases.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} · {c.dia_semana} {formatHora(c.hora_inicio)} hs
              </option>
            ))}
          </FiltroSelect>
          <FiltroSelect label="Ordenar por" value={orden} onChange={(v) => setOrden(v as Orden)}>
            <option value="recientes">Últimas reservadas</option>
            <option value="proximas">Fecha de clase más próxima</option>
          </FiltroSelect>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState message="No hay reservas para mostrar con estos filtros." />
      ) : (
        <Table headers={["Cliente", "Contacto", "Clase", "Fecha", "Estado", "Acciones"]}>
          {filtradas.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className="px-5 py-4 font-semibold">{r.alumno_nombre}</td>
              <td className="px-5 py-4">
                {r.alumno_telefono ? (
                  <a
                    href={whatsappUrl(r.alumno_telefono)}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir chat de WhatsApp"
                    className="text-success font-semibold hover:underline"
                  >
                    {r.alumno_telefono}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-5 py-4">{descClase(r.clase_id)}</td>
              <td className="px-5 py-4 text-muted-foreground">{formatFecha(r.fecha_reserva)}</td>
              <td className="px-5 py-4">
                {r.estado === "confirmada" ? (
                  <Badge tone="success">Confirmada</Badge>
                ) : (
                  <Badge tone="danger">Cancelada</Badge>
                )}
              </td>
              <td className="px-5 py-4">
                {r.estado === "confirmada" && (
                  <IconButton
                    title="Cancelar reserva"
                    onClick={() => setACancelar(r)}
                    className="text-danger"
                  >
                    <XCircle className="w-5 h-5" />
                  </IconButton>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {aCancelar && (
        <ConfirmDialog
          title="Cancelar reserva"
          message={`¿Seguro que querés cancelar la reserva de ${aCancelar.alumno_nombre}?`}
          confirmLabel="Sí, cancelar"
          onConfirm={cancelar}
          onCancel={() => setACancelar(null)}
        />
      )}
    </div>
  );
}
