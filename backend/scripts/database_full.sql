-- =========================================================
-- Backup/Init Script - Parroquia DB (PostgreSQL)
-- =========================================================

-- 0) Crear base y usuario (opcional si ya existen)
-- Nota: ejecuta estas 3 primeras solo desde una DB con permisos (e.g. postgres)
-- CREATE DATABASE parroquia_db WITH ENCODING 'UTF8';
-- CREATE USER parroquia_user WITH PASSWORD 'parroquia_password';
-- GRANT ALL PRIVILEGES ON DATABASE parroquia_db TO parroquia_user;

-- 1) Conectarse a la base (psql)
-- \c parroquia_db;

-- 2) Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- 3) Esquema de tablas
-- Usar GENERATED ALWAYS AS IDENTITY en lugar de serial
-- =========================================================

-- Alembic metadata
CREATE TABLE IF NOT EXISTS public.alembic_version (
  version_num VARCHAR(32) PRIMARY KEY
);

-- Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         VARCHAR(100) UNIQUE NOT NULL,
  description  VARCHAR(255),
  permissions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS public.users (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(120) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(50)  NOT NULL DEFAULT 'user',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  last_login     TIMESTAMP WITHOUT TIME ZONE,
  last_activity  TIMESTAMP WITHOUT TIME ZONE
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  jti         VARCHAR(128) UNIQUE,
  expires_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  created_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  revoked     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON public.refresh_tokens(jti);

-- Preferencias de usuario (1:1 con users)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id  INTEGER PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  data     JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- =========================================================
-- 3B) Defaults de permisos para roles y usuarios
--     - admin: todos los permisos del catálogo (según frontend/backend)
--     - user: solo menu_principal
--     - usuarios con permissions vacíos heredan del rol
-- =========================================================

-- Upsert de roles base con permisos por defecto
INSERT INTO public.roles (name, description, permissions, is_active)
VALUES
  (
    'Administrador',
    'Administrador del sistema',
    '[
      "menu_principal",
      "seguridad",
      "personal",
      "liturgico",
      "contabilidad",
      "ventas",
      "compras",
      "almacen",
      "configuracion",
      "reportes"
    ]'::jsonb,
    TRUE
  ),
  (
    'Usuario',
    'Usuario estándar',
    '["menu_principal"]'::jsonb,
    TRUE
  )
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions;

-- El proyecto usa permisos sólo desde roles; no se almacenan en users

-- Limpieza defensiva si existiera la columna antigua en entornos viejos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE public.users DROP COLUMN permissions;
  END IF;
END $$;

-- Geo/Parroquia

-- Departamento
CREATE TABLE IF NOT EXISTS public.departamento (
  departamentoid  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dep_nombre      VARCHAR NOT NULL
);

-- Provincia (N:1 con Departamento)
CREATE TABLE IF NOT EXISTS public.provincia (
  provinciaid     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  prov_nombre     VARCHAR NOT NULL,
  departamentoid  INTEGER NOT NULL REFERENCES public.departamento(departamentoid)
);

-- Distrito (N:1 con Provincia)
CREATE TABLE IF NOT EXISTS public.distrito (
  distritoid   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dis_nombre   VARCHAR NOT NULL,
  provinciaid  INTEGER NOT NULL REFERENCES public.provincia(provinciaid)
);

-- Parroquia (N:1 con Distrito)
CREATE TABLE IF NOT EXISTS public.parroquia (
  parroquiaid    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  par_nombre     VARCHAR NOT NULL,
  par_direccion  VARCHAR NOT NULL,
  distritoid     INTEGER NOT NULL REFERENCES public.distrito(distritoid),
  par_telefono1  VARCHAR NOT NULL,
  par_telefono2  VARCHAR
);

-- Persona (1:1 con users por userid; pertenece a parroquia)
CREATE TABLE IF NOT EXISTS public.persona (
  personaid        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  userid           INTEGER UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  per_nombres      VARCHAR NOT NULL,
  per_apellidos    VARCHAR NOT NULL,
  per_domicilio    VARCHAR,
  per_telefono     VARCHAR,
  fecha_nacimiento DATE    NOT NULL,
  parroquiaid      INTEGER NOT NULL REFERENCES public.parroquia(parroquiaid) ON DELETE RESTRICT,
  created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Actos litúrgicos (nuevo esquema principal)
CREATE TABLE IF NOT EXISTS public.actoliturgico (
  actoliturgicoid  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parroquiaid      INTEGER REFERENCES public.parroquia(parroquiaid) ON DELETE SET NULL,
  act_nombre       VARCHAR(100) NOT NULL, -- misa, bautismo, matrimonio, confirmacion, comunion, exequias
  act_titulo       VARCHAR(200) NOT NULL, -- ej. Misa Dominical, Misa Señor de los Milagros
  act_descripcion  TEXT,
  act_estado       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actoliturgico_parroquia ON public.actoliturgico(parroquiaid);
CREATE INDEX IF NOT EXISTS idx_actoliturgico_estado ON public.actoliturgico(act_estado);

-- Horarios de actos litúrgicos
CREATE TABLE IF NOT EXISTS public.horario (
  horarioid        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actoliturgicoid  INTEGER NOT NULL REFERENCES public.actoliturgico(actoliturgicoid) ON DELETE CASCADE,
  h_fecha          DATE NOT NULL, -- fecha específica del horario
  h_hora           TIME NOT NULL, -- hora específica del horario
  created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_horario_fecha ON public.horario(h_fecha);
CREATE INDEX IF NOT EXISTS idx_horario_acto ON public.horario(actoliturgicoid);

-- Reservas de actos litúrgicos
CREATE TABLE IF NOT EXISTS public.reserva (
  reservaid        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  horarioid        INTEGER NOT NULL REFERENCES public.horario(horarioid) ON DELETE CASCADE,
  personaid        INTEGER REFERENCES public.persona(personaid) ON DELETE SET NULL,
  res_persona_nombre VARCHAR(255), -- Nombre de persona no registrada (si personaid es NULL)
  res_descripcion  TEXT NOT NULL,
  res_estado       BOOLEAN NOT NULL DEFAULT FALSE, -- true: Cancelado, false: Sin pagar
  created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_horario ON public.reserva(horarioid);
CREATE INDEX IF NOT EXISTS idx_reserva_persona ON public.reserva(personaid);
CREATE INDEX IF NOT EXISTS idx_reserva_estado ON public.reserva(res_estado);

-- =========================================================
-- 3C) Migración: Agregar columnas faltantes a tablas existentes
-- =========================================================

-- Agregar columnas created_at y updated_at a tabla persona existente
DO $$
BEGIN
  -- Agregar columna created_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'persona' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.persona ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
  END IF;

  -- Agregar columna updated_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'persona' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.persona ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
  END IF;

  -- Establecer valores por defecto para registros existentes
  UPDATE public.persona SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL OR updated_at IS NULL;
END $$;

-- Agregar columnas created_at y updated_at a otras tablas existentes si es necesario
DO $$
BEGIN
  -- Verificar y agregar a roles si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.roles ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    ALTER TABLE public.roles ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    UPDATE public.roles SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL OR updated_at IS NULL;
  END IF;

  -- Verificar y agregar a users si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    UPDATE public.users SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL OR updated_at IS NULL;
  END IF;

  -- Verificar y agregar a parroquia si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'parroquia' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.parroquia ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    ALTER TABLE public.parroquia ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    UPDATE public.parroquia SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL OR updated_at IS NULL;
  END IF;
END $$;

-- =========================================================
-- 4) Triggers de actualización de updated_at (opcional)
-- =========================================================
-- Si quieres mantener updated_at al día sin lógica de app:
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_roles_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_roles_set_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_persona_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_persona_set_updated_at
    BEFORE UPDATE ON public.persona
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_actoliturgico_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_actoliturgico_set_updated_at
    BEFORE UPDATE ON public.actoliturgico
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_horario_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_horario_set_updated_at
    BEFORE UPDATE ON public.horario
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reserva_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_reserva_set_updated_at
    BEFORE UPDATE ON public.reserva
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- =========================================================
-- 5) Consultas útiles para el sistema litúrgico normalizado
-- =========================================================

-- NOTA: Los campos created_at y updated_at son útiles para:
-- - Auditoría y trazabilidad: saber cuándo se creó/actualizó cada registro
-- - Debugging: rastrear problemas por fecha de creación
-- - Información al usuario: mostrar cuándo se programó un acto
-- - Control de cambios: detectar conflictos de edición
-- - Optimización: evitar reconsultas innecesarias

-- Consulta completa para obtener actos litúrgicos con sus horarios
SELECT
  a.actoliturgicoid,
  a.parroquiaid,
  p.par_nombre as parroquia_nombre,
  a.act_nombre,
  a.act_titulo,
  a.act_descripcion,
  a.act_estado,
  a.created_at,
  a.updated_at,
  h.horarioid,
  h.h_fecha,
  h.h_hora
FROM public.actoliturgico a
LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
WHERE a.act_estado = TRUE
ORDER BY a.actoliturgicoid, h.h_fecha, h.h_hora;

-- Consulta para obtener reservas con información completa
SELECT
  r.reservaid,
  r.horarioid,
  r.personaid,
  r.res_descripcion,
  r.res_estado,
  r.created_at,
  r.updated_at,
  h.h_fecha,
  h.h_hora,
  a.act_nombre,
  a.act_titulo,
  p.par_nombre as parroquia_nombre,
  per.per_nombres || ' ' || per.per_apellidos as persona_nombre
FROM public.reserva r
LEFT JOIN public.horario h ON r.horarioid = h.horarioid
LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
LEFT JOIN public.persona per ON r.personaid = per.personaid
ORDER BY h.h_fecha DESC, h.h_hora DESC;

-- Consulta para obtener actos litúrgicos disponibles (para crear horarios)
SELECT
  actoliturgicoid,
  act_nombre,
  act_titulo,
  act_descripcion,
  p.par_nombre as parroquia_nombre
FROM public.actoliturgico a
LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
WHERE a.act_estado = TRUE
ORDER BY a.act_nombre, a.act_titulo;

-- Consulta para obtener horarios por fecha específica (ejemplo para mañana)
SELECT
  h.horarioid,
  h.h_fecha,
  h.h_hora,
  a.act_nombre,
  a.act_titulo,
  p.par_nombre as parroquia_nombre,
  COUNT(r.reservaid) as reservas_total,
  COUNT(CASE WHEN r.res_estado = FALSE THEN 1 END) as reservas_activas
FROM public.horario h
LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
WHERE h.h_fecha = CURRENT_DATE + INTERVAL '1 day' -- Ejemplo: horarios para mañana
GROUP BY h.horarioid, h.h_fecha, h.h_hora, a.act_nombre, a.act_titulo, p.par_nombre
ORDER BY h.h_hora;

-- Consulta para obtener estadísticas de actos litúrgicos
SELECT
  a.act_nombre,
  COUNT(h.horarioid) as total_horarios,
  COUNT(r.reservaid) as total_reservas,
  COUNT(CASE WHEN r.res_estado = FALSE THEN 1 END) as reservas_activas,
  COUNT(CASE WHEN r.res_estado = TRUE THEN 1 END) as reservas_canceladas
FROM public.actoliturgico a
LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
WHERE a.act_estado = TRUE
GROUP BY a.act_nombre
ORDER BY total_horarios DESC;

-- Consulta para calendario de actos litúrgicos (próximos 30 días)
SELECT
  h.h_fecha,
  h.h_hora,
  a.act_nombre,
  a.act_titulo,
  p.par_nombre as parroquia_nombre,
  COUNT(r.reservaid) as reservas_count,
  COUNT(CASE WHEN r.res_estado = FALSE THEN 1 END) as reservas_activas_count,
  h.horarioid,
  a.actoliturgicoid
FROM public.horario h
LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
WHERE h.h_fecha >= CURRENT_DATE
  AND h.h_fecha < CURRENT_DATE + INTERVAL '30 days'
GROUP BY h.h_fecha, h.h_hora, a.act_nombre, a.act_titulo, p.par_nombre, h.horarioid, a.actoliturgicoid
ORDER BY h.h_fecha, h.h_hora;

-- =========================================================
-- 6) Notas importantes sobre el esquema normalizado
-- =========================================================

-- Estructura de datos:
-- 1. actoliturgico: información básica del acto (nombre, título, descripción)
-- 2. horario: fecha y hora específica donde se realiza el acto
-- 3. reserva: reservas específicas para horarios específicos

-- Ventajas de esta normalización:
-- ✅ Un acto puede tener múltiples horarios (ej. misma misa en diferentes fechas)
-- ✅ Las reservas están ligadas a horarios específicos
-- ✅ Fácil mantenimiento y consultas
-- ✅ Eliminación en cascada automática (borrar acto elimina horarios asociados)

-- Los campos created_at y updated_at proporcionan:
-- ✅ Auditoría completa de cambios
-- ✅ Trazabilidad de cuándo se programó cada acto
-- ✅ Información útil para debugging
-- ✅ Control de versiones de datos

-- 
-- =========================================================
-- 7) Permisos (opcional si usas parroquia_user)
-- =========================================================
-- ALTER TABLE public.* OWNER TO parroquia_user;  -- Ajusta propietario si deseas