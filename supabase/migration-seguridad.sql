-- ============================================================================
-- PRANA YOGA - MIGRACIÓN DE SEGURIDAD: login obligatorio para administración
--
-- A partir de esta migración:
--   * Todo el panel administrativo requiere un usuario logueado (Supabase Auth).
--   * El público (rol anon) solo puede: ver la grilla de clases, consultar la
--     ocupación (sin datos personales) y crear una reserva validada.
--
-- Es idempotente: puede ejecutarse más de una vez.
--
-- IMPORTANTE: después de ejecutarla, creá el usuario administrador en
-- Supabase Dashboard -> Authentication -> Users -> "Add user"
-- (email + contraseña, con "Auto Confirm User" activado).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Políticas: se reemplaza el acceso anónimo total por:
--    * authenticated: acceso completo (el panel logueado)
--    * anon: solo lectura de clases y de inscripciones (ids, sin datos
--      personales) para calcular cupos en la página pública
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['planes', 'alumnos', 'alumno_planes', 'pagos', 'clases', 'reservas',
                           'clase_alumnos', 'servicios_terapias', 'turnos_terapias'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "acceso_anon_total" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "acceso_admin_total" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "acceso_admin_total" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "lectura_publica" ON clases;
CREATE POLICY "lectura_publica" ON clases FOR SELECT TO anon USING (true);

-- Solo expone pares de ids (clase, alumno); los datos del alumno siguen
-- inaccesibles porque anon no puede leer la tabla alumnos.
DROP POLICY IF EXISTS "lectura_publica" ON clase_alumnos;
CREATE POLICY "lectura_publica" ON clase_alumnos FOR SELECT TO anon USING (true);

-- ----------------------------------------------------------------------------
-- 2. Función pública de ocupación: devuelve solo clase y fecha de las
--    reservas confirmadas, nunca nombres ni teléfonos.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ocupacion_reservas()
RETURNS TABLE (clase_id UUID, fecha_reserva DATE)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clase_id, fecha_reserva FROM reservas WHERE estado = 'confirmada';
$$;

-- ----------------------------------------------------------------------------
-- 3. Función pública de reserva: valida el cupo real (alumnos fijos +
--    reservas confirmadas) y crea la reserva. Es la única vía de escritura
--    que le queda al público.
-- ----------------------------------------------------------------------------
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
    INTO v_ocupados;

  IF v_ocupados >= v_cupo THEN
    RAISE EXCEPTION 'La clase ya no tiene cupo disponible para esa fecha.';
  END IF;

  INSERT INTO reservas (clase_id, alumno_nombre, alumno_telefono, fecha_reserva, estado)
  VALUES (p_clase_id, trim(p_nombre), trim(coalesce(p_telefono, '')), p_fecha, 'confirmada');
END;
$$;
