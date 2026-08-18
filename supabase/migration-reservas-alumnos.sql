-- ============================================================================
-- PRANA YOGA - MIGRACIÓN: reservas de alumnos con validación por plan.
--
-- A partir de acá la página pública deja de aceptar nombres libres: el alumno
-- se elige de la lista del estudio y solo puede reservar clases del mismo
-- tipo que su plan.
--
-- Es idempotente: puede ejecutarse más de una vez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CLASES: tipo de clase explícito, para cruzarlo con el tipo del plan.
--    Se completa con una heurística sobre el nombre y luego se puede corregir
--    desde el panel (el selector ofrece los tipos que existen en los planes).
-- ----------------------------------------------------------------------------
ALTER TABLE clases ADD COLUMN IF NOT EXISTS tipo_clase TEXT NOT NULL DEFAULT 'Todos los tipos';

UPDATE clases SET tipo_clase = CASE
  WHEN nombre ILIKE '%kurunta%'                            THEN 'Kuruntas'
  WHEN nombre ILIKE '%hatha%' OR nombre ILIKE '%vinyasa%'  THEN 'Hatha / Vinyasa'
  ELSE 'Todos los tipos'
END
WHERE tipo_clase = 'Todos los tipos';

-- ----------------------------------------------------------------------------
-- 2. RESERVAS: quedan vinculadas al alumno del estudio.
--    (alumno_nombre / alumno_telefono se conservan como copia histórica y
--    para las reservas viejas cargadas a mano.)
-- ----------------------------------------------------------------------------
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS alumno_id UUID REFERENCES alumnos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservas_alumno ON reservas(alumno_id);

-- ----------------------------------------------------------------------------
-- 3. Tipos como lista: un texto puede nombrar varios tipos separados por
--    "/", "&", "+", "," o " y ". Así "Hatha / Vinyasa" sirve para un plan
--    "Hatha", y un plan "Hatha & Kuruntas" habilita las clases de ambos.
--    Ignora mayúsculas, acentos y espacios de más.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tokens_tipo(t TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT btrim(regexp_replace(x, '\s+', ' ', 'g'))
      FROM unnest(
        regexp_split_to_array(
          translate(lower(coalesce(t, '')), 'áéíóúü', 'aeiouu'),
          '[/&+,]|\sy\s'
        )
      ) AS x
      WHERE btrim(x) <> ''
    ),
    ARRAY[]::TEXT[]
  );
$$;

-- ----------------------------------------------------------------------------
-- 4. Lista pública de alumnos para el selector de reservas.
--    Devuelve SOLO nombre, apellido y los tipos de clase que habilita su plan.
--    Nunca teléfono, dirección ni datos de pago.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.alumnos_para_reserva()
RETURNS TABLE (id UUID, nombre TEXT, apellido TEXT, tipos TEXT[])
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.nombre,
    a.apellido,
    COALESCE(
      array_agg(DISTINCT p.tipo_clase) FILTER (WHERE p.tipo_clase IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS tipos
  FROM alumnos a
  LEFT JOIN alumno_planes ap ON ap.alumno_id = a.id
  LEFT JOIN planes p         ON p.id = ap.plan_id AND p.activo
  WHERE a.activo
  GROUP BY a.id, a.nombre, a.apellido
  ORDER BY a.nombre, a.apellido;
$$;

-- ----------------------------------------------------------------------------
-- 5. Reserva de un alumno del estudio: valida plan y cupo en el servidor.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_reserva_alumno(
  p_clase_id  UUID,
  p_alumno_id UUID,
  p_fecha     DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alumno   RECORD;
  v_clase    RECORD;
  v_permitido BOOLEAN;
  v_ocupados INTEGER;
BEGIN
  SELECT id, nombre, apellido, telefono INTO v_alumno
  FROM alumnos WHERE id = p_alumno_id AND activo;
  IF v_alumno.id IS NULL THEN
    RAISE EXCEPTION 'El alumno no existe o no está activo.';
  END IF;

  SELECT id, cupo_maximo, tipo_clase INTO v_clase FROM clases WHERE id = p_clase_id;
  IF v_clase.id IS NULL THEN
    RAISE EXCEPTION 'La clase no existe.';
  END IF;

  -- El alumno puede reservar si la clase es abierta a todos los tipos, o si
  -- alguno de sus planes comparte al menos un tipo con la clase.
  SELECT 'todos los tipos' = ANY(tokens_tipo(v_clase.tipo_clase))
      OR EXISTS (
           SELECT 1
           FROM alumno_planes ap
           JOIN planes p ON p.id = ap.plan_id AND p.activo
           WHERE ap.alumno_id = p_alumno_id
             AND (
               'todos los tipos' = ANY(tokens_tipo(p.tipo_clase))
               OR tokens_tipo(p.tipo_clase) && tokens_tipo(v_clase.tipo_clase)
             )
         )
    INTO v_permitido;

  IF NOT v_permitido THEN
    RAISE EXCEPTION 'Esta clase no corresponde al plan del alumno.';
  END IF;

  -- Una sola reserva por alumno, clase y fecha.
  IF EXISTS (
    SELECT 1 FROM reservas
    WHERE clase_id = p_clase_id AND alumno_id = p_alumno_id
      AND fecha_reserva = p_fecha AND estado = 'confirmada'
  ) THEN
    RAISE EXCEPTION 'Ya tenés una reserva para esta clase en esa fecha.';
  END IF;

  SELECT (SELECT count(*) FROM reservas
           WHERE clase_id = p_clase_id AND fecha_reserva = p_fecha AND estado = 'confirmada')
       + (SELECT count(*) FROM clase_alumnos WHERE clase_id = p_clase_id)
       + (SELECT count(*) FROM asistencias
           WHERE clase_id = p_clase_id AND fecha = p_fecha AND es_recuperacion = TRUE)
    INTO v_ocupados;

  IF v_ocupados >= v_clase.cupo_maximo THEN
    RAISE EXCEPTION 'La clase ya no tiene cupo disponible para esa fecha.';
  END IF;

  INSERT INTO reservas (clase_id, alumno_id, alumno_nombre, alumno_telefono, fecha_reserva, estado)
  VALUES (
    p_clase_id,
    p_alumno_id,
    btrim(v_alumno.nombre || ' ' || coalesce(v_alumno.apellido, '')),
    coalesce(v_alumno.telefono, ''),
    p_fecha,
    'confirmada'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Se retira la reserva pública con nombre libre: ya no se usa y permitía
--    cargar reservas de personas que no son alumnas del estudio.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.crear_reserva(UUID, TEXT, TEXT, DATE);

-- Reemplazada por tokens_tipo (comparación por lista de tipos).
DROP FUNCTION IF EXISTS public.normalizar_tipo(TEXT);
