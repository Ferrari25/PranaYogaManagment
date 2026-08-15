// Primitivas de UI del estudio: botones grandes, alto contraste y foco visible,
// pensadas para usuarios adultos mayores.

import { type ReactNode, type ComponentProps } from "react";
import { X, AlertTriangle } from "lucide-react";
import clsx from "clsx";

// ---------------------------------------------------------------------------
// Botones
// ---------------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark shadow-sm",
  secondary: "bg-secondary text-white hover:opacity-90 shadow-sm",
  outline: "border-2 border-border bg-card text-foreground hover:bg-muted",
  danger: "bg-danger text-white hover:opacity-90 shadow-sm",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold",
        "transition-colors focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        buttonStyles[variant],
        className
      )}
      {...props}
    />
  );
}

/** Botón chico de ícono para acciones de fila (editar / eliminar). */
export function IconButton({
  title,
  className,
  ...props
}: ComponentProps<"button"> & { title: string }) {
  return (
    <button
      title={title}
      aria-label={title}
      className={clsx(
        "inline-flex items-center justify-center w-11 h-11 rounded-lg border border-border bg-card",
        "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
        "focus-visible:outline-3 focus-visible:outline-primary",
        className
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Campos de formulario
// ---------------------------------------------------------------------------
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-base font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-base text-foreground " +
  "placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={clsx(inputClass, props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={clsx(inputClass, props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={clsx(inputClass, "bg-card", props.className)} />;
}

// ---------------------------------------------------------------------------
// Badges de estado y categoría
// ---------------------------------------------------------------------------
type BadgeTone = "success" | "warning" | "danger" | "neutral" | "primary";

const badgeStyles: Record<BadgeTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary-dark",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap",
        badgeStyles[tone]
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Chips de filtro rápido (Todos | Pendientes | ...)
// ---------------------------------------------------------------------------
export function ChipsFiltro<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: ReadonlyArray<{ valor: T; etiqueta: string }>;
  valor: T;
  onChange: (valor: T) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {opciones.map((o) => (
        <button
          key={o.valor}
          onClick={() => onChange(o.valor)}
          className={clsx(
            "rounded-full px-5 py-2.5 text-base font-semibold transition-colors",
            valor === o.valor
              ? "bg-primary text-white shadow-sm"
              : "bg-card border-2 border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

/** Select compacto con etiqueta, para barras de filtros. */
export function FiltroSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border-2 border-border bg-card px-3 py-2.5 text-base text-foreground focus:outline-none focus:border-primary"
      >
        {children}
      </select>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Encabezado de página
// ---------------------------------------------------------------------------
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {actions && <div className="flex gap-3 flex-wrap">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal accesible
// ---------------------------------------------------------------------------
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-card shadow-xl mt-8 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <IconButton title="Cerrar" onClick={onClose} className="border-0">
            <X className="w-6 h-6" />
          </IconButton>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/** Diálogo de confirmación para acciones destructivas. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Sí, eliminar",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-8 h-8 text-danger shrink-0 mt-0.5" />
        <p className="text-base">{message}</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Estados de página (carga / error / vacío)
// ---------------------------------------------------------------------------
export function LoadingState() {
  return <p className="text-center text-muted-foreground py-16">Cargando…</p>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-danger-bg text-danger px-5 py-4 my-6">
      <p className="font-semibold">Ocurrió un error al cargar los datos</p>
      <p className="text-sm mt-1">{message}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-center text-muted-foreground py-16">{message}</p>;
}

// ---------------------------------------------------------------------------
// Tabla estándar
// ---------------------------------------------------------------------------
export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {headers.map((h) => (
              <th
                key={h}
                className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
