-- ============================================================================
-- PRANA YOGA - MIGRACIÓN: ficha de alumno ampliada + asistencias y
-- recuperación de clases.
--
-- Es idempotente: puede ejecutarse más de una vez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ALUMNOS: fecha de nacimiento y teléfono alternativo
--    (la columna email se conserva en la base pero deja de usarse en la app)
-- ----------------------------------------------------------------------------
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS telefono_alt TEXT NOT NULL DEFAULT '';

-- ----------------------------------------------------------------------------
-- 2. ASISTENCIAS: registro por clase, alumno y fecha.
--    * presente = true/false al pasar lista.
--    * es_recuperacion = true cuando el alumno asiste usando una clase a favor.
--    Las clases a favor se calculan: ausencias comunes - recuperaciones usadas.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asistencias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id        UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
  alumno_id       UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  presente        BOOLEAN NOT NULL DEFAULT TRUE,
  es_recuperacion BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clase_id, alumno_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_fecha  ON asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_alumno ON asistencias(alumno_id);

ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acceso_admin_total" ON asistencias;
CREATE POLICY "acceso_admin_total" ON asistencias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 3. Cupos públicos: las recuperaciones también ocupan lugar, así que las
--    funciones públicas de ocupación y reserva pasan a contarlas.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ocupacion_reservas()
RETURNS TABLE (clase_id UUID, fecha_reserva DATE)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clase_id, fecha_reserva FROM reservas WHERE estado = 'confirmada'
  UNION ALL
  SELECT clase_id, fecha FROM asistencias WHERE es_recuperacion = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.crear_reserva(
  p_clase_id UUID,
  p_nombre   TEXT,
  p_telefono TEXT,
  p_fecha    DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cupo     INTEGER;
  v_ocupados INTEGER;
BEGIN
  IF trim(coalesce(p_nombre, '')) = '' THEN
    RAISE EXCEPTION 'El nombre es obligatorio.';
  END IF;

  SELECT cupo_maximo INTO v_cupo FROM clases WHERE id = p_clase_id;
  IF v_cupo IS NULL THEN
    RAISE EXCEPTION 'La clase no existe.';
  END IF;

  SELECT (SELECT count(*) FROM reservas
           WHERE clase_id = p_clase_id AND fecha_reserva = p_fecha AND estado = 'confirmada')
       + (SELECT count(*) FROM clase_alumnos WHERE clase_id = p_clase_id)
       + (SELECT count(*) FROM asistencias
           WHERE clase_id = p_clase_id AND fecha = p_fecha AND es_recuperacion = TRUE)
    INTO v_ocupados;

  IF v_ocupados >= v_cupo THEN
    RAISE EXCEPTION 'La clase ya no tiene cupo disponible para esa fecha.';
  END IF;

  INSERT INTO reservas (clase_id, alumno_nombre, alumno_telefono, fecha_reserva, estado)
  VALUES (p_clase_id, trim(p_nombre), trim(coalesce(p_telefono, '')), p_fecha, 'confirmada');
END;
$$;
