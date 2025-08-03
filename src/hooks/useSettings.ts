import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface Settings {
  SPREADSHEET_ID_PRODUCTS: string;
  SPREADSHEET_ID_PRODUCTS_TAB: string;
  SPREADSHEET_ID_CLIENTS: string;
  SPREADSHEET_ID_CLIENTS_TAB: string;
  GOOGLE_DRIVE_FOLDER_ID: string;
  SUPABASE_BUCKET_CERTIFICATES: string;
  SUPABASE_BUCKET_CLIENT_DOCS: string;
  SUPABASE_BUCKET_QRS: string;
  CRITICAL_DAYS_THRESHOLD: number;
  DJC_TEMPLATE_RES16_ID: string;
  DJC_TEMPLATE_RES17_ID: string;
}

const DEFAULT_SETTINGS: Settings = {
  SPREADSHEET_ID_PRODUCTS: '193fwytaIo2T7SUZQzCmgPpIRNp1nGTuu',
  SPREADSHEET_ID_PRODUCTS_TAB: 'Base de producto|1030281518',
  SPREADSHEET_ID_CLIENTS: '193fwytaIo2T7SUZQzCmgPpIRNp1nGTuu',
  SPREADSHEET_ID_CLIENTS_TAB: 'Cliente|123456789',
  GOOGLE_DRIVE_FOLDER_ID: '',
  SUPABASE_BUCKET_CERTIFICATES: 'certificates',
  SUPABASE_BUCKET_CLIENT_DOCS: 'client-documents',
  SUPABASE_BUCKET_QRS: 'qr-codes',
  CRITICAL_DAYS_THRESHOLD: 30,
  DJC_TEMPLATE_RES16_ID: '',
  DJC_TEMPLATE_RES17_ID: '',
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        console.warn('Supabase not configured - using default settings');
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) {
        console.error('Error loading settings:', error);
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      const loadedSettings = { ...DEFAULT_SETTINGS };
      
      if (data) {
        data.forEach((setting) => {
          if (setting.key in loadedSettings) {
            const key = setting.key as keyof Settings;
            if (key === 'CRITICAL_DAYS_THRESHOLD') {
              loadedSettings[key] = parseInt(setting.value) || DEFAULT_SETTINGS[key];
            } else {
              (loadedSettings as any)[key] = setting.value || DEFAULT_SETTINGS[key];
            }
          }
        });
      }

      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<Settings>) => {
    if (!supabase) {
      toast.error('Supabase no está configurado');
      return false;
    }

    setSaving(true);
    try {
      const updatedSettings = { ...settings, ...newSettings };

      // Save each setting individually
      for (const [key, value] of Object.entries(newSettings)) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            key,
            value: value?.toString() || '',
            description: getSettingDescription(key),
          });

        if (error) throw error;
      }

      setSettings(updatedSettings);
      toast.success('Configuración guardada exitosamente');
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const validateSettings = (requiredKeys: (keyof Settings)[]): boolean => {
    // Always return true since we have default values
    return true;
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: { [key: string]: string } = {
      SPREADSHEET_ID_PRODUCTS: 'ID del Google Sheet que contiene los datos de productos',
      SPREADSHEET_ID_PRODUCTS_TAB: 'Pestaña del Google Sheet de productos (formato: nombre|id)',
      SPREADSHEET_ID_CLIENTS: 'ID del Google Sheet que contiene los datos de clientes',
      SPREADSHEET_ID_CLIENTS_TAB: 'Pestaña del Google Sheet de clientes (formato: nombre|id)',
      GOOGLE_DRIVE_FOLDER_ID: 'ID de la carpeta de Google Drive para almacenar archivos',
      SUPABASE_BUCKET_CERTIFICATES: 'Nombre del bucket de Supabase para certificados',
      SUPABASE_BUCKET_CLIENT_DOCS: 'Nombre del bucket de Supabase para documentos de clientes',
      SUPABASE_BUCKET_QRS: 'Nombre del bucket de Supabase para códigos QR',
      CRITICAL_DAYS_THRESHOLD: 'Número de días antes del vencimiento para mostrar alerta',
      DJC_TEMPLATE_RES16_ID: 'ID del template DJC para Resolución 16/2025',
      DJC_TEMPLATE_RES17_ID: 'ID del template DJC para Resolución 17/2025',
    };
    return descriptions[key] || '';
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    saving,
    saveSettings,
    validateSettings,
    reload: loadSettings,
  };
};