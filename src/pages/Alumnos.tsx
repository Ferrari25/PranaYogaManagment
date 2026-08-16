import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Phone } from "lucide-react";
import { useData } from "../hooks/useData";
import {
  createAlumno,
  deleteAlumno,
  getAlumnos,
  getAsistencias,
  getPagos,
  getPlanes,
  sincronizarCuotas,
  updateAlumno,
  type AlumnoInput,
} from "../lib/api";
import type { Alumno } from "../lib/types";
import { nombreCompleto, whatsappUrl } from "../lib/format";
import { estadoMembresia } from "../lib/membresia";
import { clasesAFavor, totalPresentes } from "../lib/asistencias";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FiltroSelect,
  IconButton,
  Input,
  LoadingState,
  PageHeader,
  Table,
} from "../components/ui";
import { AlumnoModal } from "../components/AlumnoModal";

type Orden = "nombre" | "nuevos" | "asistencias";

export default function Alumnos() {
  const { data: alumnos, loading, error, reload } = useData(getAlumnos);
  const planes = useData(getPlanes);
  // Las cuotas al día determinan el estado de membresía de cada alumno.
  const pagos = useData(() => sincronizarCuotas().then(getPagos));
  const asistencias = useData(getAsistencias);
  const [busqueda, setBusqueda] = useState("");
  const [planFiltro, setPlanFiltro] = useState("todos");
  const [orden, setOrden] = useState<Orden>("nombre");
  const [modal, setModal] = useState<{ abierto: boolean; alumno: Alumno | null }>({
    abierto: false,
    alumno: null,
  });
  const [aEliminar, setAEliminar] = useState<Alumno | null>(null);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    let lista = alumnos ?? [];
    if (term) {
      lista = lista.filter((a) =>
        [a.nombre, a.apellido, a.telefono, a.telefono_alt].some((campo) =>
          campo.toLowerCase().includes(term)
        )
      );
    }
    if (planFiltro !== "todos") {
      lista = lista.filter((a) => a.plan_ids.includes(planFiltro));
    }

    const ordenada = [...lista];
    if (orden === "nuevos") {
      ordenada.sort((a, b) => b.fecha_alta.localeCompare(a.fecha_alta));
    } else if (orden === "asistencias") {
      const lista_a = asistencias.data ?? [];
      ordenada.sort((a, b) => totalPresentes(b.id, lista_a) - totalPresentes(a.id, lista_a));
    } else {
      ordenada.sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b)));
    }
    return ordenada;
  }, [alumnos, busqueda, planFiltro, orden, asistencias.data]);

  const nombrePlan = (id: string) => planes.data?.find((p) => p.id === id)?.nombre ?? "";

  const guardar = async (input: AlumnoInput) => {
    if (modal.alumno) {
      await updateAlumno(modal.alumno.id, input);
    } else {
      await createAlumno(input, planes.data ?? []);
    }
    setModal({ abierto: false, alumno: null });
    reload();
    pagos.reload();
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    await deleteAlumno(aEliminar.id);
    setAEliminar(null);
    reload();
    pagos.reload();
  };

  if (loading || planes.loading || pagos.loading || asistencias.loading) return <LoadingState />;
  const err = error || planes.error || pagos.error || asistencias.error;
  if (err) return <ErrorState message={err} />;

  return (
    <div>
      <PageHeader
        title="Gestión de Alumnos"
        description="Miembros del estudio, sus planes y asistencias."
        actions={
          <Button onClick={() => setModal({ abierto: true, alumno: null })}>
            <Plus className="w-5 h-5" />
            Añadir Nuevo Miembro
          </Button>
        }
      />

      {/* Buscador en tiempo real + filtros */}
      <div className="flex gap-3 flex-wrap items-end mb-5">
        <div className="relative flex-1 min-w-64 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            className="pl-12"
            placeholder="Buscar por nombre, apellido, teléfono o email…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar alumnos"
          />
        </div>
        <FiltroSelect label="Plan" value={planFiltro} onChange={setPlanFiltro}>
          <option value="todos">Todos los planes</option>
          {(planes.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </FiltroSelect>
        <FiltroSelect label="Ordenar por" value={orden} onChange={(v) => setOrden(v as Orden)}>
          <option value="nombre">Nombre (A-Z)</option>
          <option value="nuevos">Más nuevos</option>
          <option value="asistencias">Más asistencias</option>
        </FiltroSelect>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          message={
            busqueda || planFiltro !== "todos"
              ? "No se encontraron alumnos con esos filtros."
              : "Todavía no hay alumnos. Añadí el primer miembro con el botón de arriba."
          }
        />
      ) : (
        <Table
          headers={["Alumno", "Contacto", "Planes de Membresía", "Estado de Cuota", "Asistencia", "Acciones"]}
        >
          {filtrados.map((a) => {
            const estado = estadoMembresia(a, pagos.data ?? []);
            const presentes = totalPresentes(a.id, asistencias.data ?? []);
            const aFavor = clasesAFavor(a.id, asistencias.data ?? []);
            return (
            <tr key={a.id} className="hover:bg-muted/40">
              <td className="px-5 py-4 font-semibold">{nombreCompleto(a)}</td>
              <td className="px-5 py-4">
                <div className="flex flex-col gap-1">
                  {a.telefono && (
                    <a
                      href={whatsappUrl(a.telefono)}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir chat de WhatsApp"
                      className="text-success font-semibold hover:underline"
                    >
                      {a.telefono}
                    </a>
                  )}
                  {a.telefono_alt && (
                    <span
                      className="flex items-center gap-1.5 text-sm text-muted-foreground"
                      title="Teléfono alternativo"
                    >
                      <Phone className="w-4 h-4" /> {a.telefono_alt}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {a.plan_ids.length === 0 ? (
                    <Badge>Sin plan</Badge>
                  ) : (
                    a.plan_ids.map((pid) => (
                      <Badge key={pid} tone="primary">
                        {nombrePlan(pid)}
                      </Badge>
                    ))
                  )}
                </div>
              </td>
              <td className="px-5 py-4">
                {estado ? <Badge tone={estado.tone}>{estado.texto}</Badge> : "—"}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-lg" title="Clases con presente">
                    {presentes}
                  </span>
                  {aFavor > 0 && (
                    <Badge tone="primary">
                      {aFavor} a favor
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex gap-2">
                  <IconButton title="Editar" onClick={() => setModal({ abierto: true, alumno: a })}>
                    <Pencil className="w-5 h-5" />
                  </IconButton>
                  <IconButton
                    title="Eliminar"
                    onClick={() => setAEliminar(a)}
                    className="text-danger"
                  >
                    <Trash2 className="w-5 h-5" />
                  </IconButton>
                </div>
              </td>
            </tr>
            );
          })}
        </Table>
      )}

      {modal.abierto && (
        <AlumnoModal
          alumno={modal.alumno}
          planes={planes.data ?? []}
          onSave={guardar}
          onClose={() => setModal({ abierto: false, alumno: null })}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          title="Eliminar alumno"
          message={`¿Seguro que querés eliminar a ${nombreCompleto(aEliminar)}? Su historial de pagos se conserva.`}
          onConfirm={eliminar}
          onCancel={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
