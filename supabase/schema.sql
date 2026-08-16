-- ============================================================================
-- PRANA YOGA - ESTUDIO & BIENESTAR
-- Esquema de base de datos para Supabase (PostgreSQL)
--
-- Instrucciones: copiar y pegar este archivo completo en el SQL Editor de
-- Supabase y ejecutar. Es idempotente: puede ejecutarse más de una vez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PLANES: tarifas y tipos de membresía del estudio
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  tipo_clase  TEXT NOT NULL DEFAULT 'Todos los tipos',
  dias_semana INTEGER NOT NULL DEFAULT 1 CHECK (dias_semana BETWEEN 1 AND 7),
  precio      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  descripcion TEXT NOT NULL DEFAULT '',
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. ALUMNOS: miembros del estudio
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alumnos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            TEXT NOT NULL,
  apellido          TEXT NOT NULL DEFAULT '',
  telefono          TEXT NOT NULL DEFAULT '',
  telefono_alt      TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  fecha_nacimiento  DATE,
  direccion         TEXT NOT NULL DEFAULT '',
  fecha_alta        DATE NOT NULL DEFAULT CURRENT_DATE,
  asistencias_count INTEGER NOT NULL DEFAULT 0,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. ALUMNO_PLANES: tabla intermedia — un alumno puede tener varios planes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alumno_planes (
  alumno_id  UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  plan_id    UUID NOT NULL REFERENCES planes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (alumno_id, plan_id)
);

-- ----------------------------------------------------------------------------
-- 4. PAGOS: registro de cobros del estudio
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id      UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  concepto       TEXT NOT NULL DEFAULT '',
  monto          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  modalidad_pago TEXT NOT NULL DEFAULT 'Efectivo',
  -- Detalle de pago combinado: [{"metodo": "Efectivo", "monto": 18000}, ...]
  metodos_pago   JSONB NOT NULL DEFAULT '[]',
  -- Mes de la cuota que se está pagando (YYYY-MM), independiente de la fecha de cobro
  mes_imputacion TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
  estado         TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado')),
  fecha_pago     DATE NOT NULL DEFAULT CURRENT_DATE,
  notas          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. CLASES: grilla semanal de clases del estudio
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  instructor  TEXT NOT NULL DEFAULT '',
  dia_semana  TEXT NOT NULL DEFAULT 'Lunes'
              CHECK (dia_semana IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')),
  hora_inicio TIME NOT NULL DEFAULT '09:00',
  hora_fin    TIME NOT NULL DEFAULT '10:00',
  cupo_maximo INTEGER NOT NULL DEFAULT 10 CHECK (cupo_maximo > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. RESERVAS: reservas públicas de cupo hechas por clientes externos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id        UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
  alumno_nombre   TEXT NOT NULL,
  alumno_telefono TEXT NOT NULL DEFAULT '',
  fecha_reserva   DATE NOT NULL DEFAULT CURRENT_DATE,
  estado          TEXT NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'cancelada')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. CLASE_ALUMNOS: alumnos fijos inscriptos en cada clase semanal
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clase_alumnos (
  clase_id   UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
  alumno_id  UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (clase_id, alumno_id)
);

-- ----------------------------------------------------------------------------
-- 8. SERVICIOS_TERAPIAS: catálogo de Masajes & Reiki (independiente del yoga)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios_terapias (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           TEXT NOT NULL,
  precio           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  duracion_minutos INTEGER NOT NULL DEFAULT 60 CHECK (duracion_minutos > 0),
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. TURNOS_TERAPIAS: turnos y cobros de Masajes & Reiki
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS turnos_terapias (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id      UUID REFERENCES servicios_terapias(id) ON DELETE SET NULL,
  cliente_nombre   TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL DEFAULT '',
  fecha            DATE NOT NULL DEFAULT CURRENT_DATE,
  hora             TIME NOT NULL DEFAULT '09:00',
  monto            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  modalidad_pago   TEXT NOT NULL DEFAULT 'Efectivo',
  estado           TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('cobrado', 'pendiente')),
  notas            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. ASISTENCIAS: registro por clase, alumno y fecha.
--     presente al pasar lista; es_recuperacion cuando usa una clase a favor.
--     Clases a favor = ausencias comunes - recuperaciones usadas.
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

-- ----------------------------------------------------------------------------
-- Índices de rendimiento
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pagos_alumno    ON pagos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado    ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha     ON pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_mes       ON pagos(mes_imputacion);
CREATE INDEX IF NOT EXISTS idx_reservas_clase  ON reservas(clase_id);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha  ON reservas(fecha_reserva);
CREATE INDEX IF NOT EXISTS idx_alumnos_nombre  ON alumnos(nombre, apellido);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha    ON turnos_terapias(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha  ON asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_alumno ON asistencias(alumno_id);

-- ----------------------------------------------------------------------------
-- Seguridad (RLS):
--   * authenticated: acceso completo (panel administrativo con login).
--     Crear el usuario admin en: Authentication -> Users -> "Add user".
--   * anon (público): solo lectura de clases/inscripciones y las funciones
--     de reserva de más abajo. Nunca ve datos personales.
-- ----------------------------------------------------------------------------
ALTER TABLE planes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumno_planes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clase_alumnos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_terapias ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos_terapias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias        ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['planes', 'alumnos', 'alumno_planes', 'pagos', 'clases', 'reservas',
                           'clase_alumnos', 'servicios_terapias', 'turnos_terapias', 'asistencias'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "acceso_anon_total" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "acceso_admin_total" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "acceso_admin_total" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "lectura_publica" ON clases;
CREATE POLICY "lectura_publica" ON clases FOR SELECT TO anon USING (true);

-- Solo pares de ids (clase, alumno); anon no puede leer la tabla alumnos.
DROP POLICY IF EXISTS "lectura_publica" ON clase_alumnos;
CREATE POLICY "lectura_publica" ON clase_alumnos FOR SELECT TO anon USING (true);

-- Ocupación pública: reservas confirmadas + recuperaciones (ambas ocupan
-- lugar), solo clase y fecha, sin datos personales.
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

-- Reserva pública: valida cupo real (alumnos fijos + reservas) e inserta.
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

-- ============================================================================
-- SEED DATA: planes reales del estudio + datos de prueba
-- ============================================================================

-- Planes (solo se insertan si la tabla está vacía)
INSERT INTO planes (nombre, tipo_clase, dias_semana, precio, descripcion)
SELECT * FROM (VALUES
  ('Plan 2 Días (Hatha / Vinyasa)', 'Hatha / Vinyasa', 2, 16000::numeric, 'Ideal para practicantes que asisten 2 clases de Hatha/Vinyasa por semana.'),
  ('Plan 3 Días (Hatha / Vinyasa)', 'Hatha / Vinyasa', 3, 20000::numeric, 'Acceso a 3 clases de Hatha/Vinyasa semanales.'),
  ('Plan Kuruntas (1 Día)',         'Kuruntas',        1, 12000::numeric, 'Acceso a 1 clase semanal especial de Yoga Kuruntas.'),
  ('Plan Pase Libre',               'Todos los tipos', 5, 28000::numeric, 'Acceso ilimitado a todas las disciplinas de lunes a viernes.'),
  ('Clase Suelta',                  'Todos los tipos', 1,  5000::numeric, 'Pase por una clase individual sin compromiso mensual.')
) AS v(nombre, tipo_clase, dias_semana, precio, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM planes);

-- Clases de la grilla semanal (solo si la tabla está vacía)
INSERT INTO clases (nombre, instructor, dia_semana, hora_inicio, hora_fin, cupo_maximo)
SELECT * FROM (VALUES
  ('Hatha Yoga',    'María',  'Lunes',     '09:00'::time, '10:15'::time, 12),
  ('Vinyasa Flow',  'María',  'Martes',    '18:30'::time, '19:45'::time, 12),
  ('Hatha Yoga',    'María',  'Miércoles', '09:00'::time, '10:15'::time, 12),
  ('Yoga Kuruntas', 'Laura',  'Jueves',    '10:30'::time, '11:45'::time,  8),
  ('Vinyasa Flow',  'María',  'Viernes',   '18:30'::time, '19:45'::time, 12)
) AS v(nombre, instructor, dia_semana, hora_inicio, hora_fin, cupo_maximo)
WHERE NOT EXISTS (SELECT 1 FROM clases);

-- Servicios iniciales de Masajes & Reiki (solo si la tabla está vacía)
INSERT INTO servicios_terapias (nombre, precio, duracion_minutos)
SELECT * FROM (VALUES
  ('Masaje Descontracturante', 15000::numeric, 60),
  ('Sesión de Reiki',          12000::numeric, 60),
  ('Masaje + Reiki combinado', 20000::numeric, 90)
) AS v(nombre, precio, duracion_minutos)
WHERE NOT EXISTS (SELECT 1 FROM servicios_terapias);

-- Alumnos de prueba con plan asignado y pago inicial (solo si la tabla está vacía)
DO $$
DECLARE
  v_alumno UUID;
  v_plan   RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM alumnos) THEN
    RETURN;
  END IF;

  SELECT id, nombre, precio INTO v_plan FROM planes WHERE nombre LIKE 'Plan 2 Días%' LIMIT 1;
  INSERT INTO alumnos (nombre, apellido, telefono, email, direccion)
  VALUES ('Ana', 'García', '1155550001', 'ana.garcia@example.com', 'Av. Siempreviva 123')
  RETURNING id INTO v_alumno;
  INSERT INTO alumno_planes (alumno_id, plan_id) VALUES (v_alumno, v_plan.id);
  INSERT INTO pagos (alumno_id, concepto, monto, estado)
  VALUES (v_alumno, v_plan.nombre, v_plan.precio, 'completado');

  SELECT id, nombre, precio INTO v_plan FROM planes WHERE nombre LIKE 'Plan Pase Libre%' LIMIT 1;
  INSERT INTO alumnos (nombre, apellido, telefono, email, direccion)
  VALUES ('Carlos', 'Pérez', '1155550002', 'carlos.perez@example.com', 'Calle Falsa 456')
  RETURNING id INTO v_alumno;
  INSERT INTO alumno_planes (alumno_id, plan_id) VALUES (v_alumno, v_plan.id);
  INSERT INTO pagos (alumno_id, concepto, monto, estado)
  VALUES (v_alumno, v_plan.nombre, v_plan.precio, 'pendiente');

  SELECT id, nombre, precio INTO v_plan FROM planes WHERE nombre LIKE 'Plan Kuruntas%' LIMIT 1;
  INSERT INTO alumnos (nombre, apellido, telefono, email, direccion)
  VALUES ('Marta', 'López', '1155550003', 'marta.lopez@example.com', '')
  RETURNING id INTO v_alumno;
  INSERT INTO alumno_planes (alumno_id, plan_id) VALUES (v_alumno, v_plan.id);
  INSERT INTO pagos (alumno_id, concepto, monto, estado)
  VALUES (v_alumno, v_plan.nombre, v_plan.precio, 'pendiente');
END $$;
