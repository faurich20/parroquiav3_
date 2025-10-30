-- =========================================================
-- BASE DE DATOS COMPLETA - PARROQUIA SYSTEM (PostgreSQL)
-- =========================================================
-- Archivo organizado por secciones para facilitar mantenimiento
-- Version: 2.0 - Sistema de Pagos Integrado
-- Fecha: 2025-01-25

-- =========================================================
-- 0) CONFIGURACIÓN INICIAL
-- =========================================================

-- Crear base y usuario (opcional si ya existen)
-- Nota: ejecuta estas 3 primeras solo desde una DB con permisos (e.g. postgres)
-- CREATE DATABASE parroquia_db WITH ENCODING 'UTF8';
-- CREATE USER parroquia_user WITH PASSWORD 'parroquia_password';
-- GRANT ALL PRIVILEGES ON DATABASE parroquia_db TO parroquia_user;

-- Conectarse a la base (psql)
-- \c parroquia_db;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- 1) TABLAS DEL SISTEMA DE SEGURIDAD
-- =========================================================

-- Metadata de Alembic
CREATE TABLE IF NOT EXISTS public.alembic_version (
  version_num VARCHAR(32) PRIMARY KEY
);

-- Roles del sistema
CREATE TABLE IF NOT EXISTS public.roles (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         VARCHAR(100) UNIQUE NOT NULL,
  description  VARCHAR(255),
  permissions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Usuarios del sistema
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

-- Tokens de refresh para autenticación
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  jti         VARCHAR(128) UNIQUE,
  expires_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  created_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  revoked     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Preferencias de usuario (1:1 con users)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id  INTEGER PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  data     JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Índices para tablas de seguridad
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON public.refresh_tokens(jti);

-- =========================================================
-- 2) TABLAS GEOGRÁFICAS (DEPARTAMENTO/PROVINCIA/DISTRITO)
-- =========================================================

-- Departamentos
CREATE TABLE IF NOT EXISTS public.departamento (
  departamentoid  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dep_nombre      VARCHAR NOT NULL
);

-- Provincias (N:1 con Departamento)
CREATE TABLE IF NOT EXISTS public.provincia (
  provinciaid     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  prov_nombre     VARCHAR NOT NULL,
  departamentoid  INTEGER NOT NULL REFERENCES public.departamento(departamentoid)
);

-- Distritos (N:1 con Provincia)
CREATE TABLE IF NOT EXISTS public.distrito (
  distritoid   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dis_nombre   VARCHAR NOT NULL,
  provinciaid  INTEGER NOT NULL REFERENCES public.provincia(provinciaid)
);

-- =========================================================
-- 3) TABLAS DEL SISTEMA PARROQUIAL
-- =========================================================

-- Parroquias (N:1 con Distrito)
CREATE TABLE IF NOT EXISTS public.parroquia (
  parroquiaid    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  par_nombre     VARCHAR NOT NULL,
  par_direccion  VARCHAR NOT NULL,
  distritoid     INTEGER NOT NULL REFERENCES public.distrito(distritoid),
  par_telefono1  VARCHAR NOT NULL,
  par_telefono2  VARCHAR
);

-- Personas (1:1 con users por userid; pertenece a parroquia)
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

-- =========================================================
-- 4) TABLAS DEL SISTEMA LITÚRGICO
-- =========================================================

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

-- Horarios de actos litúrgicos
CREATE TABLE IF NOT EXISTS public.horario (
  horarioid        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actoliturgicoid  INTEGER NOT NULL REFERENCES public.actoliturgico(actoliturgicoid) ON DELETE CASCADE,
  h_fecha          DATE NOT NULL, -- fecha específica del horario
  h_hora           TIME NOT NULL, -- hora específica del horario
  created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para tablas litúrgicas
CREATE INDEX IF NOT EXISTS idx_actoliturgico_parroquia ON public.actoliturgico(parroquiaid);
CREATE INDEX IF NOT EXISTS idx_actoliturgico_estado ON public.actoliturgico(act_estado);
CREATE INDEX IF NOT EXISTS idx_horario_fecha ON public.horario(h_fecha);
CREATE INDEX IF NOT EXISTS idx_horario_acto ON public.horario(actoliturgicoid);

-- =========================================================
-- 5) TABLAS DEL SISTEMA DE PAGOS
-- =========================================================

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS public.pago (
  pagoid              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pago_medio          VARCHAR(15) NOT NULL CHECK (pago_medio IN ('Yape o Plin', 'Tarjeta', 'Efectivo')),
  pago_monto          NUMERIC(10,2) NOT NULL CHECK (pago_monto >= 0),
  pago_estado         VARCHAR(15) NOT NULL DEFAULT 'pendiente'
                      CHECK (pago_estado IN ('pendiente', 'pagado', 'vencido', 'fallido')),
  pago_descripcion    TEXT,
  pago_fecha          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(), -- cuándo se generó el pago
  pago_confirmado     TIMESTAMP WITHOUT TIME ZONE NULL, -- cuándo se confirmó el pago
  pago_expira         TIMESTAMP WITHOUT TIME ZONE NOT NULL
                      DEFAULT (NOW() + INTERVAL '1 hour'), -- expira en 1 hora
  -- Información adicional para pagos con tarjeta
  pago_tarjeta_ultimos VARCHAR(4), -- últimos 4 dígitos de tarjeta
  pago_tarjeta_tipo    VARCHAR(20), -- Visa, Mastercard, etc.
  -- Información adicional para Yape/Plin
  pago_qr_data         TEXT, -- datos del QR si aplica
  created_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para tabla pago
CREATE INDEX IF NOT EXISTS idx_pago_estado ON public.pago(pago_estado);
CREATE INDEX IF NOT EXISTS idx_pago_fecha ON public.pago(pago_fecha);
CREATE INDEX IF NOT EXISTS idx_pago_expira ON public.pago(pago_expira);
CREATE INDEX IF NOT EXISTS idx_pago_medio ON public.pago(pago_medio);

-- =========================================================
-- 6) TABLAS DEL SISTEMA DE RESERVAS
-- =========================================================

-- Reservas de actos litúrgicos
CREATE TABLE IF NOT EXISTS public.reserva (
  reservaid        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  horarioid        INTEGER NOT NULL REFERENCES public.horario(horarioid) ON DELETE CASCADE,
  personaid        INTEGER REFERENCES public.persona(personaid) ON DELETE SET NULL,
  res_persona_nombre VARCHAR(255), -- Nombre de persona no registrada (si personaid es NULL)
  res_descripcion  TEXT NULL,
  pagoid           INTEGER REFERENCES public.pago(pagoid) ON DELETE SET NULL, -- FK a public.pago
  created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para tabla reserva
CREATE INDEX IF NOT EXISTS idx_reserva_horario ON public.reserva(horarioid);
CREATE INDEX IF NOT EXISTS idx_reserva_persona ON public.reserva(personaid);
CREATE INDEX IF NOT EXISTS idx_reserva_pago ON public.reserva(pagoid);
-- Nota: res_estado eliminado - el estado se obtiene dinámicamente desde tabla pago (pagoid FK)

-- =========================================================
-- 7) DATOS POR DEFECTO E INSERTS
-- =========================================================

-- Insert de roles base con permisos por defecto
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

-- =========================================================
-- 8) MIGRACIONES Y ALTER TABLES
-- =========================================================

-- Agregar columna pagoid a tabla reserva (FK nullable a tabla pago)
DO $$
BEGIN
  -- Asegurar columna pagoid (ya definida en CREATE TABLE, pero por si acaso)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reserva' AND column_name = 'pagoid'
  ) THEN
    ALTER TABLE public.reserva ADD COLUMN pagoid INTEGER REFERENCES public.pago(pagoid) ON DELETE SET NULL;
  END IF;

  -- Asegurar índice sobre pagoid
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_reserva_pago'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_reserva_pago ON public.reserva(pagoid);
  END IF;

  -- Eliminar columna res_estado si existe (para corrección de diseño)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reserva' AND column_name = 'res_estado'
  ) THEN
    ALTER TABLE public.reserva DROP COLUMN res_estado;
  END IF;
END $$;

-- Agregar columnas created_at y updated_at a tablas existentes si no existen
DO $$
BEGIN
  -- Agregar a persona si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'persona' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.persona ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    ALTER TABLE public.persona ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    UPDATE public.persona SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL OR updated_at IS NULL;
  END IF;

  -- Agregar a roles si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.roles ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    ALTER TABLE public.roles ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    UPDATE public.roles SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL OR updated_at IS NULL;
  END IF;

  -- Agregar a users si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    UPDATE public.users SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL OR updated_at IS NULL;
  END IF;

  -- Agregar a parroquia si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'parroquia' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.parroquia ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    ALTER TABLE public.parroquia ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
    UPDATE public.parroquia SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL OR updated_at IS NULL;
  END IF;
END $$;

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

-- =========================================================
-- 9) TRIGGERS PARA UPDATED_AT AUTOMÁTICO
-- =========================================================

-- Función base para actualizar updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para cada tabla
DO $$
BEGIN
  -- Trigger para users
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  -- Trigger para roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_roles_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_roles_set_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  -- Trigger para persona
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_persona_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_persona_set_updated_at
    BEFORE UPDATE ON public.persona
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  -- Trigger para actoliturgico
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_actoliturgico_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_actoliturgico_set_updated_at
    BEFORE UPDATE ON public.actoliturgico
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  -- Trigger para horario
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_horario_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_horario_set_updated_at
    BEFORE UPDATE ON public.horario
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  -- Trigger para reserva
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reserva_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_reserva_set_updated_at
    BEFORE UPDATE ON public.reserva
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  -- Trigger para pago
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pago_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_pago_set_updated_at
    BEFORE UPDATE ON public.pago
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- =========================================================
-- 10) FUNCIONES ÚTILES DEL SISTEMA
-- =========================================================

-- Función para marcar pagos vencidos automáticamente
CREATE OR REPLACE FUNCTION marcar_pagos_vencidos()
RETURNS INTEGER AS $$
DECLARE
  pagos_actualizados INTEGER;
BEGIN
  UPDATE public.pago
  SET pago_estado = 'vencido', updated_at = NOW()
  WHERE pago_estado = 'pendiente'
    AND pago_expira <= NOW();

  GET DIAGNOSTICS pagos_actualizados = ROW_COUNT;
  RETURN pagos_actualizados;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de pagos
CREATE OR REPLACE FUNCTION estadisticas_pagos(fecha_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '30 days', fecha_fin DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  periodo TEXT,
  total_pagos BIGINT,
  pagos_pendientes BIGINT,
  pagos_pagados BIGINT,
  pagos_vencidos BIGINT,
  pagos_fallidos BIGINT,
  monto_total NUMERIC,
  monto_pagado NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Últimos 30 días'::TEXT as periodo,
    COUNT(*) as total_pagos,
    COUNT(CASE WHEN pago_estado = 'pendiente' THEN 1 END) as pagos_pendientes,
    COUNT(CASE WHEN pago_estado = 'pagado' THEN 1 END) as pagos_pagados,
    COUNT(CASE WHEN pago_estado = 'vencido' THEN 1 END) as pagos_vencidos,
    COUNT(CASE WHEN pago_estado = 'fallido' THEN 1 END) as pagos_fallidos,
    COALESCE(SUM(pago_monto), 0) as monto_total,
    COALESCE(SUM(CASE WHEN pago_estado = 'pagado' THEN pago_monto END), 0) as monto_pagado
  FROM public.pago
  WHERE DATE(pago_fecha) >= fecha_inicio
    AND DATE(pago_fecha) <= fecha_fin;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 11) CONSULTAS ÚTILES PARA REPORTES Y DEBUGGING
-- =========================================================

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
  r.res_persona_nombre,
  r.res_descripcion,
  r.pagoid,
  r.created_at as reserva_created_at,
  r.updated_at as reserva_updated_at,
  -- Información del horario
  h.h_fecha,
  h.h_hora,
  a.act_nombre,
  a.act_titulo,
  p.par_nombre as parroquia_nombre,
  -- Información del pago
  pg.pago_medio,
  pg.pago_monto,
  pg.pago_estado,
  pg.pago_fecha,
  pg.pago_confirmado,
  pg.pago_expira,
  -- Estado derivado de pago
  CASE
    WHEN pg.pagoid IS NULL THEN 'Sin pagar'
    WHEN pg.pago_estado = 'pagado' THEN 'Cancelado'
    WHEN pg.pago_estado = 'pendiente' AND pg.pago_expira > NOW() THEN 'Pago pendiente'
    WHEN pg.pago_estado = 'pendiente' AND pg.pago_expira <= NOW() THEN 'Pago vencido'
    WHEN pg.pago_estado = 'fallido' THEN 'Pago fallido'
    ELSE 'Estado desconocido'
  END as estado_texto,
  -- Información de persona
  per.per_nombres || ' ' || per.per_apellidos as persona_nombre
FROM public.reserva r
LEFT JOIN public.horario h ON r.horarioid = h.horarioid
LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
LEFT JOIN public.persona per ON r.personaid = per.personaid
ORDER BY h.h_fecha DESC, h.h_hora DESC;

-- Consulta para pagos pendientes de expirar
SELECT
  pg.pagoid,
  pg.pago_medio,
  pg.pago_monto,
  pg.pago_estado,
  pg.pago_fecha,
  pg.pago_expira,
  EXTRACT(EPOCH FROM (pg.pago_expira - NOW())) / 60 as minutos_restantes,
  -- Información de la reserva
  r.reservaid,
  h.h_fecha,
  h.h_hora,
  a.act_titulo,
  p.par_nombre as parroquia_nombre
FROM public.pago pg
LEFT JOIN public.reserva r ON pg.pagoid = r.pagoid
LEFT JOIN public.horario h ON r.horarioid = h.horarioid
LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
WHERE pg.pago_estado = 'pendiente'
  AND pg.pago_expira > NOW()
ORDER BY pg.pago_expira ASC;

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
  COUNT(CASE WHEN COALESCE(pg.pago_estado, 'pendiente') IN ('pendiente', 'pagado') THEN 1 END) as reservas_activas
FROM public.horario h
LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
WHERE h.h_fecha = CURRENT_DATE + INTERVAL '1 day' -- Ejemplo: horarios para mañana
GROUP BY h.horarioid, h.h_fecha, h.h_hora, a.act_nombre, a.act_titulo, p.par_nombre
ORDER BY h.h_hora;

-- Consulta para obtener estadísticas de actos litúrgicos
SELECT
  a.act_nombre,
  COUNT(h.horarioid) as total_horarios,
  COUNT(r.reservaid) as total_reservas,
  COUNT(CASE WHEN COALESCE(pg.pago_estado, 'pendiente') IN ('pendiente', 'pagado') THEN 1 END) as reservas_activas,
  COUNT(CASE WHEN COALESCE(pg.pago_estado, 'pendiente') IN ('vencido', 'fallido') THEN 1 END) as reservas_canceladas
FROM public.actoliturgico a
LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
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
  COUNT(CASE WHEN COALESCE(pg.pago_estado, 'pendiente') IN ('pendiente', 'pagado') THEN 1 END) as reservas_activas_count,
  h.horarioid,
  a.actoliturgicoid
FROM public.horario h
LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
WHERE h.h_fecha >= CURRENT_DATE
  AND h.h_fecha < CURRENT_DATE + INTERVAL '30 days'
GROUP BY h.h_fecha, h.h_hora, a.act_nombre, a.act_titulo, p.par_nombre, h.horarioid, a.actoliturgicoid
ORDER BY h.h_fecha, h.h_hora;

-- =========================================================
-- 12) NOTAS IMPORTANTES SOBRE EL ESQUEMA
-- =========================================================

-- Estructura de datos normalizada:
-- 1. Sistema de Seguridad: roles, users, refresh_tokens, user_preferences
-- 2. Sistema Geográfico: departamento → provincia → distrito → parroquia
-- 3. Sistema Parroquial: persona (vinculada a parroquia)
-- 4. Sistema Litúrgico: actoliturgico → horario → reserva
-- 5. Sistema de Pagos: pago (vinculado a reserva)

-- Ventajas de esta normalización:
-- ✅ Un acto puede tener múltiples horarios (ej. misma misa en diferentes fechas)
-- ✅ Las reservas están ligadas a horarios específicos
-- ✅ Sistema de pagos completamente integrado
-- ✅ Fácil mantenimiento y consultas
-- ✅ Eliminación en cascada automática
-- ✅ Auditoría completa con created_at/updated_at

-- Campos created_at y updated_at proporcionan:
-- ✅ Auditoría completa de cambios
-- ✅ Trazabilidad de cuándo se programó cada acto
-- ✅ Información útil para debugging
-- ✅ Control de versiones de datos
-- ✅ Optimización: evitar reconsultas innecesarias

-- Estados de pago:
-- 'pendiente' - Pago generado, esperando confirmación
-- 'pagado' - Pago confirmado exitosamente
-- 'vencido' - Tiempo límite expirado sin pago
-- 'fallido' - Error en el proceso de pago

-- =========================================================
-- 13) PERMISOS (OPCIONAL)
-- =========================================================
-- ALTER TABLE public.* OWNER TO parroquia_user;  -- Ajusta propietario si deseas