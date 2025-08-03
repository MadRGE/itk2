import { useState, useCallback } from 'react';
import { useSettings } from './useSettings';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface GoogleSheetsData {
  headers: string[];
  rows: any[][];
  sheetName: string;
  totalRows: number;
}

interface GoogleSheet {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink: string;
}

interface SheetTab {
  id: string;
  name: string;
  index: number;
}

export const useGoogleSheets = () => {
  const [loading, setLoading] = useState(false);
  const { settings } = useSettings();
  const { hasGoogleAccess, getGoogleAccessToken, user } = useAuth();

  // Función para hacer llamadas a la API de Google
  const callGoogleAPI = async (url: string) => {
    const token = getGoogleAccessToken();
    if (!token) {
      throw new Error('No hay token de acceso de Google disponible');
    }

    // Si es un token simulado, devolver datos mock
    if (token.startsWith('mock-access-token')) {
      return getMockGoogleAPIResponse(url);
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token de Google expirado. Por favor, vuelva a iniciar sesión.');
      }
      throw new Error(`Error de API de Google: ${response.status}`);
    }

    return response.json();
  };

  // Función para simular respuestas de Google API
  const getMockGoogleAPIResponse = (url: string) => {
    // Esta función solo se llama cuando el token es simulado
    if (url.includes('drive/v3/files')) {
      // Simular respuesta de Google Drive
      return {
        files: [
          {
            id: '193fwytaIo2T7SUZQzCmgPpIRNp1nGTuu',
            name: 'Base de Datos Productos y Clientes (3 pestañas)',
            modifiedTime: '2024-01-15T10:30:00.000Z',
            webViewLink: 'https://docs.google.com/spreadsheets/d/193fwytaIo2T7SUZQzCmgPpIRNp1nGTuu/edit'
          },
          {
            id: 'mock-sheet-2',
            name: 'Plantillas DJC',
            modifiedTime: '2024-01-10T15:45:00.000Z',
            webViewLink: 'https://docs.google.com/spreadsheets/d/mock-sheet-2/edit'
          }
        ]
      };
    } else if (url.includes('spreadsheets/') && url.includes('?fields=sheets')) {
      // Simular respuesta de pestañas del sheet
      return {
        sheets: [
          { properties: { sheetId: 1030281518, title: 'Base de producto', index: 0 } },
          { properties: { sheetId: 0, title: 'PRODUCTO', index: 1 } },
          { properties: { sheetId: 123456789, title: 'Cliente', index: 2 } }
        ]
      };
    } else if (url.includes('values/')) {
      // Simular datos del sheet
      if (url.includes('Base de producto') || url.includes('PRODUCTO')) {
        return {
          values: [
            ['CODIFICACIÓN', 'TITULAR', 'TIPO DE CERTIFICACION', 'ESTADO', 'CUIT', 'PRODUCTO', 'MARCA', 'MODELO', 'NORMAS DE APLICACIÓN', 'FECHA DE EMISION', 'VENCIMIENTO', 'DIAS PARA VENCER'],
            ['CSE-IACSA-G8-001.3', 'EMPRESA EJEMPLO S.A.', 'CERTIFICACIÓN DE PRODUCTO', 'VIGENTE', '30698914277', 'Equipo de Protección', 'SEGURIDAD PLUS', 'SP-2024', 'IEC 61010-1, IRAM 2063', '2024-01-15', '2025-01-15', '45'],
            ['CSE-IACSA-G8-002.1', 'TECNOLOGÍA AVANZADA LTDA.', 'CERTIFICACIÓN DE SISTEMA', 'VIGENTE', '30712345678', 'Sistema de Control', 'CONTROL TECH', 'CT-PRO-2024', 'EN 61511, IEC 62061', '2024-02-15', '2025-02-15', '76']
          ]
        };
      } else if (url.includes('Cliente')) {
        return {
          values: [
            ['CUIT', 'RAZON SOCIAL', 'NOMBRE COMERCIAL', 'DOMICILIO LEGAL', 'TELEFONO', 'CORREO ELECTRONICO', 'REPRESENTANTE NOMBRE'],
            ['30698914277', 'EMPRESA EJEMPLO S.A.', 'EJEMPLO COMERCIAL', 'Av. Corrientes 1234, CABA', '011-4567-8900', 'contacto@ejemplo.com.ar', 'Juan Carlos Pérez'],
            ['30712345678', 'TECNOLOGÍA AVANZADA LTDA.', 'TECH SOLUTIONS', 'Av. Libertador 5678, CABA', '011-7890-1234', 'info@techsolutions.com.ar', 'María Elena González']
          ]
        };
      }
    }
    
    return { files: [], sheets: [], values: [] };
  };

  // Obtener lista real de Google Sheets del usuario
  const getUserSheets = useCallback(async (): Promise<GoogleSheet[]> => {
    try {
      if (!hasGoogleAccess()) {
        toast.error('Debe iniciar sesión con Google para acceder a sus sheets');
        return [];
      }

      setLoading(true);

      // Llamar a la API de Google Drive para obtener spreadsheets
      const query = "mimeType='application/vnd.google-apps.spreadsheet'";
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc`;
      
      const data = await callGoogleAPI(url);
      
      const sheets: GoogleSheet[] = data.files?.map((file: any) => ({
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink
      })) || [];

      toast.success(`${sheets.length} Google Sheets encontrados`);
      return sheets;

    } catch (error) {
      console.error('Error obteniendo sheets:', error);
      toast.error(`Error al obtener Google Sheets: ${error.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, [hasGoogleAccess, getGoogleAccessToken]);

  // Obtener pestañas reales de un Google Sheet
  const getSheetTabs = useCallback(async (spreadsheetId: string): Promise<SheetTab[]> => {
    try {
      if (!hasGoogleAccess()) {
        toast.error('Debe iniciar sesión con Google para acceder a sus sheets');
        return [];
      }

      setLoading(true);

      // Llamar a la API de Google Sheets para obtener información del spreadsheet
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title,index))`;
      
      const data = await callGoogleAPI(url);
      
      const tabs: SheetTab[] = data.sheets?.map((sheet: any) => ({
        id: sheet.properties.sheetId.toString(),
        name: sheet.properties.title,
        index: sheet.properties.index
      })) || [];

      return tabs;

    } catch (error) {
      console.error('Error obteniendo pestañas:', error);
      toast.error(`Error al obtener pestañas: ${error.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, [hasGoogleAccess, getGoogleAccessToken]);

  // Leer datos reales de una pestaña específica
  const readSheetData = useCallback(async (
    spreadsheetId: string, 
    sheetName: string, 
    range?: string
  ): Promise<GoogleSheetsData | null> => {
    try {
      setLoading(true);

      if (!hasGoogleAccess()) {
        toast.error('Debe iniciar sesión con Google para acceder a sus sheets');
        return null;
      }

      // Construir el rango - por defecto tomar todas las celdas con datos
      const fullRange = range || `${sheetName}!A:Z`;
      
      // Llamar a la API de Google Sheets para obtener los datos
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fullRange)}?majorDimension=ROWS`;
      
      const data = await callGoogleAPI(url);
      
      if (!data.values || data.values.length === 0) {
        toast.warning(`No se encontraron datos en la pestaña "${sheetName}"`);
        return null;
      }

      // La primera fila son los headers
      const headers = data.values[0] || [];
      const rows = data.values.slice(1) || [];

      const sheetData: GoogleSheetsData = {
        headers,
        rows,
        sheetName,
        totalRows: rows.length
      };

      toast.success(`Datos cargados: ${rows.length} filas desde "${sheetName}"`);
      return sheetData;

    } catch (error) {
      console.error('Error leyendo datos:', error);
      toast.error(`Error al leer datos de "${sheetName}": ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [hasGoogleAccess, getGoogleAccessToken]);

  // Leer datos de productos
  const readProductsData = useCallback(async (): Promise<GoogleSheetsData | null> => {
    const spreadsheetId = settings.SPREADSHEET_ID_PRODUCTS;
    const tabConfig = settings.SPREADSHEET_ID_PRODUCTS_TAB;
    
    if (!spreadsheetId || !tabConfig || tabConfig.split('|').length < 2) {
      toast.error('Configure primero el Google Sheet y la pestaña de productos');
      return null;
    }

    const sheetName = tabConfig.split('|')[0];
    return await readSheetData(spreadsheetId, sheetName);
  }, [settings.SPREADSHEET_ID_PRODUCTS, settings.SPREADSHEET_ID_PRODUCTS_TAB, readSheetData]);

  // Leer datos de clientes
  const readClientsData = useCallback(async (): Promise<GoogleSheetsData | null> => {
    const spreadsheetId = settings.SPREADSHEET_ID_CLIENTS;
    const tabConfig = settings.SPREADSHEET_ID_CLIENTS_TAB;
    
    if (!spreadsheetId || !tabConfig || tabConfig.split('|').length < 2) {
      toast.error('Configure primero el Google Sheet y la pestaña de clientes');
      return null;
    }

    const sheetName = tabConfig.split('|')[0];
    return await readSheetData(spreadsheetId, sheetName);
  }, [settings.SPREADSHEET_ID_CLIENTS, settings.SPREADSHEET_ID_CLIENTS_TAB, readSheetData]);

  return {
    loading,
    authState: {
      isAuthenticated: hasGoogleAccess(),
      userEmail: user?.email || null
    },
    isAuthenticated: hasGoogleAccess(), 
    userEmail: user?.email || null,
    getUserSheets,
    getSheetTabs,
    readSheetData,
    readProductsData,
    readClientsData,
  };
};