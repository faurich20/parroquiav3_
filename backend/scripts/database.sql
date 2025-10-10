-- Crear base de datos
CREATE DATABASE parroquia_db WITH ENCODING 'UTF8';

-- Crear usuario (opcional, puedes usar postgres o crear uno específico)
CREATE USER parroquia_user WITH PASSWORD 'parroquia_password';
GRANT ALL PRIVILEGES ON DATABASE parroquia_db TO parroquia_user;

-- Conectarse a la base de datos y crear extensiones si es necesario
\c parroquia_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";