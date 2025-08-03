/*
  # Initial Schema for Certificate Management System

  1. New Tables
    - `settings`
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (text)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `products`
      - `id` (uuid, primary key)
      - `codificacion` (text, unique)
      - `titular` (text)
      - `tipo_certificacion` (text)
      - `estado` (text)
      - `en_proceso_renovacion` (text)
      - `cuit` (text)
      - `direccion_legal` (text)
      - `fabricante` (text)
      - `planta_fabricacion` (text)
      - `origen` (text)
      - `producto` (text)
      - `marca` (text)
      - `modelo` (text)
      - `caracteristicas_tecnicas` (text)
      - `normas_aplicacion` (text)
      - `informe_ensayo_nro` (text)
      - `laboratorio` (text)
      - `ocp_extranjero` (text)
      - `certificado_extranjero_nro` (text)
      - `fecha_emision_cert_extranjero` (date)
      - `disposicion_convenio` (text)
      - `cod_rubro` (text)
      - `cod_subrubro` (text)
      - `nombre_subrubro` (text)
      - `fecha_emision` (date)
      - `fecha_ultima_vigilancia` (date)
      - `vencimiento` (date)
      - `fecha_cancelacion` (date)
      - `motivo_cancelacion` (text)
      - `dias_para_vencer` (integer)
      - `certificates_path` (text)
      - `djc_path` (text)
      - `qr_code_path` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `clients`
      - `id` (uuid, primary key)
      - `cuit` (text, unique)
      - `razon_social` (text)
      - `nombre_comercial` (text)
      - `domicilio_legal` (text)
      - `domicilio_planta` (text)
      - `telefono` (text)
      - `correo_electronico` (text)
      - `representante_nombre` (text)
      - `representante_domicilio` (text)
      - `representante_cuit` (text)
      - `enlace_djc` (text)
      - `documents_path` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `analytics`
      - `id` (uuid, primary key)
      - `user_id` (uuid references auth.users)
      - `action_type` (text)
      - `section` (text)
      - `details` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codificacion text UNIQUE NOT NULL,
  titular text,
  tipo_certificacion text,
  estado text,
  en_proceso_renovacion text,
  cuit text,
  direccion_legal text,
  fabricante text,
  planta_fabricacion text,
  origen text,
  producto text,
  marca text,
  modelo text,
  caracteristicas_tecnicas text,
  normas_aplicacion text,
  informe_ensayo_nro text,
  laboratorio text,
  ocp_extranjero text,
  certificado_extranjero_nro text,
  fecha_emision_cert_extranjero date,
  disposicion_convenio text,
  cod_rubro text,
  cod_subrubro text,
  nombre_subrubro text,
  fecha_emision date,
  fecha_ultima_vigilancia date,
  vencimiento date,
  fecha_cancelacion date,
  motivo_cancelacion text,
  dias_para_vencer integer,
  certificates_path text,
  djc_path text,
  qr_code_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuit text UNIQUE NOT NULL,
  razon_social text,
  nombre_comercial text,
  domicilio_legal text,
  domicilio_planta text,
  telefono text,
  correo_electronico text,
  representante_nombre text,
  representante_domicilio text,
  representante_cuit text,
  enlace_djc text,
  documents_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  section text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage settings" ON settings
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can manage products" ON products
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can manage clients" ON clients
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can manage their analytics" ON analytics
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('SPREADSHEET_ID_PRODUCTS', '', 'ID del Google Sheet de Productos'),
  ('SPREADSHEET_ID_CLIENTS', '', 'ID del Google Sheet de Clientes'),
  ('RES_16_ID', '', 'ID del documento de Resolución 16/2025 en Google Drive'),
  ('RES_17_ID', '', 'ID del documento de Resolución 17/2025 en Google Drive'),
  ('DJC_TEMPLATES', '[]', 'IDs de plantillas de Google Docs para DJC (JSON array)'),
  ('DRIVE_FOLDER_DJC', '', 'Ruta de carpeta en Google Drive para DJC generadas'),
  ('STORAGE_BUCKET_CERTIFICATES', 'certificates', 'Bucket para certificados'),
  ('STORAGE_BUCKET_CLIENT_DOCS', 'client_docs', 'Bucket para documentos de clientes'),
  ('STORAGE_BUCKET_QRS', 'qrs', 'Bucket para códigos QR'),
  ('CRITICAL_DAYS_THRESHOLD', '30', 'Días para vencimiento crítico')
ON CONFLICT (key) DO NOTHING;