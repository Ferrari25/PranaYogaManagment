-- ============================================================================
-- PRANA YOGA - MIGRACIÓN: inscripciones a clases, pagos divididos,
-- histórico mensual y módulo Masajes & Reiki.
--
-- Para bases que YA ejecutaron schema.sql. Es idempotente: puede ejecutarse
-- más de una vez. (Las instalaciones nuevas solo necesitan schema.sql, que ya
-- incluye todo esto.)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CLASE_ALUMNOS: alumnos fijos inscriptos en cada clase semanal
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clase_alumnos (
  clase_id   UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
  alumno_id  UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (clase_id, alumno_id)
);

-- ----------------------------------------------------------------------------
-- 2. PAGOS: métodos de pago divididos + mes de imputación de la cuota
-- ----------------------------------------------------------------------------
-- metodos_pago: detalle de un pago combinado, ej:
--   [{"metodo": "Efectivo", "monto": 18000}, {"metodo": "Transferencia", "monto": 12000}]
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS metodos_pago JSONB NOT NULL DEFAULT '[]';

-- mes_imputacion: a qué mes corresponde la cuota (formato YYYY-MM). Permite
-- cobrar en septiembre una cuota de agosto sin perder el mes real.
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS mes_imputacion TEXT;
UPDATE pagos SET mes_imputacion = to_char(fecha_pago, 'YYYY-MM') WHERE mes_imputacion IS NULL;
ALTER TABLE pagos ALTER COLUMN mes_imputacion SET DEFAULT to_char(CURRENT_DATE, 'YYYY-MM');
ALTER TABLE pagos ALTER COLUMN mes_imputacion SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pagos_mes ON pagos(mes_imputacion);

-- ----------------------------------------------------------------------------
-- 3. SERVICIOS_TERAPIAS: catálogo de Masajes & Reiki (independiente del yoga)
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
-- 4. TURNOS_TERAPIAS: turnos y cobros de Masajes & Reiki
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

CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos_terapias(fecha);

-- ----------------------------------------------------------------------------
-- Seguridad (RLS) para las tablas nuevas
-- ----------------------------------------------------------------------------
ALTER TABLE clase_alumnos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_terapias ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos_terapias    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clase_alumnos', 'servicios_terapias', 'turnos_terapias'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "acceso_anon_total" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "acceso_anon_total" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Seed: servicios iniciales de Masajes & Reiki (solo si la tabla está vacía)
-- ----------------------------------------------------------------------------
INSERT INTO servicios_terapias (nombre, precio, duracion_minutos)
SELECT * FROM (VALUES
  ('Masaje Descontracturante', 15000::numeric, 60),
  ('Sesión de Reiki',          12000::numeric, 60),
  ('Masaje + Reiki combinado', 20000::numeric, 90)
) AS v(nombre, precio, duracion_minutos)
WHERE NOT EXISTS (SELECT 1 FROM servicios_terapias);
