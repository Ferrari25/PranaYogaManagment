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
  email             TEXT NOT NULL DEFAULT '',
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
-- Índices de rendimiento
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pagos_alumno    ON pagos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado    ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha     ON pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_reservas_clase  ON reservas(clase_id);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha  ON reservas(fecha_reserva);
CREATE INDEX IF NOT EXISTS idx_alumnos_nombre  ON alumnos(nombre, apellido);

-- ----------------------------------------------------------------------------
-- Seguridad (RLS): la app opera sin login (panel abierto para el estudio),
-- por lo que se habilita acceso con la clave anónima a todas las tablas.
-- ----------------------------------------------------------------------------
ALTER TABLE planes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumno_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas      ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['planes', 'alumnos', 'alumno_planes', 'pagos', 'clases', 'reservas'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "acceso_anon_total" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "acceso_anon_total" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

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
