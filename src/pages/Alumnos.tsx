import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Mail, CheckCircle2 } from "lucide-react";
import { useData } from "../hooks/useData";
import {
  createAlumno,
  deleteAlumno,
  getAlumnos,
  getPlanes,
  registrarAsistencia,
  updateAlumno,
  type AlumnoInput,
} from "../lib/api";
import type { Alumno } from "../lib/types";
import { nombreCompleto, whatsappUrl } from "../lib/format";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  LoadingState,
  PageHeader,
  Table,
} from "../components/ui";
import { AlumnoModal } from "../components/AlumnoModal";

export default function Alumnos() {
  const { data: alumnos, loading, error, reload } = useData(getAlumnos);
  const planes = useData(getPlanes);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<{ abierto: boolean; alumno: Alumno | null }>({
    abierto: false,
    alumno: null,
  });
  const [aEliminar, setAEliminar] = useState<Alumno | null>(null);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return alumnos ?? [];
    return (alumnos ?? []).filter((a) =>
      [a.nombre, a.apellido, a.telefono, a.email].some((campo) =>
        campo.toLowerCase().includes(term)
      )
    );
  }, [alumnos, busqueda]);

  const nombrePlan = (id: string) => planes.data?.find((p) => p.id === id)?.nombre ?? "";

  const guardar = async (input: AlumnoInput) => {
    if (modal.alumno) {
      await updateAlumno(modal.alumno.id, input);
    } else {
      await createAlumno(input, planes.data ?? []);
    }
    setModal({ abierto: false, alumno: null });
    reload();
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    await deleteAlumno(aEliminar.id);
    setAEliminar(null);
    reload();
  };

  const marcarAsistencia = async (a: Alumno) => {
    await registrarAsistencia(a);
    reload();
  };

  if (loading || planes.loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (planes.error) return <ErrorState message={planes.error} />;

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

      {/* Buscador en tiempo real */}
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          className="pl-12"
          placeholder="Buscar por nombre, apellido, teléfono o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar alumnos"
        />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          message={
            busqueda
              ? "No se encontraron alumnos con esa búsqueda."
              : "Todavía no hay alumnos. Añadí el primer miembro con el botón de arriba."
          }
        />
      ) : (
        <Table headers={["Alumno", "Contacto", "Planes de Membresía", "Asistencia", "Acciones"]}>
          {filtrados.map((a) => (
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
                  {a.email && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" /> {a.email}
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
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{a.asistencias_count}</span>
                  <IconButton
                    title="Registrar asistencia"
                    onClick={() => marcarAsistencia(a)}
                    className="text-success"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </IconButton>
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
          ))}
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
