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
  permissions    JSONB NOT NULL DEFAULT '[]'::jsonb,
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

-- Geo/Parroquia

-- Provincia
CREATE TABLE IF NOT EXISTS public.provincia (
  provinciaid  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  prov_nombre  VARCHAR NOT NULL
);

-- Distrito
CREATE TABLE IF NOT EXISTS public.distrito (
  distritoid  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dis_nombre  VARCHAR NOT NULL
);

-- Departamento (relaciones con provincia y distrito)
CREATE TABLE IF NOT EXISTS public.departamento (
  departamentoid  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dep_nombre      VARCHAR NOT NULL,
  provinciaid     INTEGER REFERENCES public.provincia(provinciaid),
  distritoid      INTEGER REFERENCES public.distrito(distritoid)
);

-- Parroquia (relación con departamento)
CREATE TABLE IF NOT EXISTS public.parroquia (
  parroquiaid   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  par_nombre    VARCHAR NOT NULL,
  par_direccion VARCHAR NOT NULL,
  departamentoid INTEGER REFERENCES public.departamento(departamentoid),
  par_telefono1 VARCHAR NOT NULL,
  par_telefono2 VARCHAR
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
  parroquiaid      INTEGER NOT NULL REFERENCES public.parroquia(parroquiaid) ON DELETE RESTRICT
);

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
END$$;

-- =========================================================
-- 5) Semillas mínimas (opcional)
-- =========================================================
-- INSERT INTO public.roles(name, description, permissions) VALUES
-- ('admin', 'Administrador', '[]'::jsonb) ON CONFLICT DO NOTHING;
-- INSERT INTO public.roles(name, description, permissions) VALUES
-- ('user', 'Usuario', '[]'::jsonb) ON CONFLICT DO NOTHING;

-- =========================================================
-- 6) Permisos (opcional si usas parroquia_user)
-- =========================================================
-- ALTER TABLE public.* OWNER TO parroquia_user;  -- Ajusta propietario si deseas