import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Solo crear cliente de Supabase si las credenciales están configuradas
export const supabase = supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Database = {
  public: {
    Tables: {
      settings: {
        Row: {
          id: string;
          key: string;
          value: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          codificacion: string;
          titular: string | null;
          tipo_certificacion: string | null;
          estado: string | null;
          en_proceso_renovacion: string | null;
          cuit: string | null;
          direccion_legal: string | null;
          fabricante: string | null;
          planta_fabricacion: string | null;
          origen: string | null;
          producto: string | null;
          marca: string | null;
          modelo: string | null;
          caracteristicas_tecnicas: string | null;
          normas_aplicacion: string | null;
          informe_ensayo_nro: string | null;
          laboratorio: string | null;
          ocp_extranjero: string | null;
          certificado_extranjero_nro: string | null;
          fecha_emision_cert_extranjero: string | null;
          disposicion_convenio: string | null;
          cod_rubro: string | null;
          cod_subrubro: string | null;
          nombre_subrubro: string | null;
          fecha_emision: string | null;
          fecha_ultima_vigilancia: string | null;
          vencimiento: string | null;
          fecha_cancelacion: string | null;
          motivo_cancelacion: string | null;
          dias_para_vencer: number | null;
          certificates_path: string | null;
          djc_path: string | null;
          qr_code_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          cuit: string;
          razon_social: string | null;
          nombre_comercial: string | null;
          domicilio_legal: string | null;
          domicilio_planta: string | null;
          telefono: string | null;
          correo_electronico: string | null;
          representante_nombre: string | null;
          representante_domicilio: string | null;
          representante_cuit: string | null;
          enlace_djc: string | null;
          documents_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      analytics: {
        Row: {
          id: string;
          user_id: string | null;
          action_type: string;
          section: string;
          details: any;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['analytics']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['analytics']['Insert']>;
      };
    };
  };
};