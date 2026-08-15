import { useState } from "react";
import { ExternalLink, Copy, Check, XCircle } from "lucide-react";
import { useData } from "../hooks/useData";
import { cancelarReserva, getClases, getReservas } from "../lib/api";
import type { Reserva } from "../lib/types";
import { formatFecha, formatHora, whatsappUrl } from "../lib/format";
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

export default function ReservasAdmin() {
  const { data: reservas, loading, error, reload } = useData(getReservas);
  const clases = useData(getClases);
  const [copiado, setCopiado] = useState(false);
  const [aCancelar, setACancelar] = useState<Reserva | null>(null);

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

      {(reservas ?? []).length === 0 ? (
        <EmptyState message="Todavía no hay reservas registradas." />
      ) : (
        <Table headers={["Cliente", "Contacto", "Clase", "Fecha", "Estado", "Acciones"]}>
          {(reservas ?? []).map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className="px-5 py-4 font-semibold">{r.alumno_nombre}</td>
              <td className="px-5 py-4">
                {r.alumno_telefono ? (
                  <a
                    href={whatsappUrl(r.alumno_telefono)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-success font-semibold hover:underline"
                  >
                    {r.alumno_telefono} (WhatsApp)
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
