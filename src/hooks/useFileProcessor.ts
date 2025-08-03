import { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

interface ProcessedData {
  headers: string[];
  rows: any[][];
  fileName: string;
  totalRows: number;
  source: 'excel' | 'csv';
}

export const useFileProcessor = () => {
  const [loading, setLoading] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);

  // Procesar archivo Excel
  const processExcelFile = async (file: File): Promise<ProcessedData | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Tomar la primera hoja
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            cellDates: true,
            dateNF: 'yyyy-mm-dd'
          });
          
          if (jsonData.length === 0) {
            toast.error('El archivo Excel está vacío');
            resolve(null);
            return;
          }

          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];

          const result: ProcessedData = {
            headers,
            rows,
            fileName: file.name,
            totalRows: rows.length,
            source: 'excel'
          };

          resolve(result);
        } catch (error) {
          console.error('Error procesando Excel:', error);
          toast.error('Error al procesar el archivo Excel');
          resolve(null);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Procesar archivo CSV
  const processCSVFile = async (file: File): Promise<ProcessedData | null> => {
    return new Promise((resolve) => {
      Papa.parse(file, {
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              console.error('Errores en CSV:', results.errors);
             console.warn('Se encontraron algunos errores en el CSV');
            }

            const data = results.data as string[][];
            if (data.length === 0) {
              toast.error('El archivo CSV está vacío');
              resolve(null);
              return;
            }

            const headers = data[0];
            const rows = data.slice(1).filter(row => row.some(cell => cell.trim() !== ''));

            const result: ProcessedData = {
              headers,
              rows,
              fileName: file.name,
              totalRows: rows.length,
              source: 'csv'
            };

            resolve(result);
          } catch (error) {
            console.error('Error procesando CSV:', error);
            toast.error('Error al procesar el archivo CSV');
            resolve(null);
          }
        },
        header: false,
        skipEmptyLines: true
      });
    });
  };

  // Función principal para procesar archivos
  const processFile = async (file: File): Promise<ProcessedData | null> => {
    setLoading(true);
    try {
      let result: ProcessedData | null = null;
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        result = await processCSVFile(file);
      } else if (['xlsx', 'xls'].includes(extension || '')) {
        result = await processExcelFile(file);
      } else {
        toast.error('Formato de archivo no soportado. Use Excel (.xlsx, .xls) o CSV (.csv)');
        return null;
      }

      if (result) {
        setProcessedData(result);
        toast.success(`Datos cargados: ${result.totalRows} filas, ${result.headers.length} columnas`);
      }

      return result;
    } catch (error) {
      console.error('Error procesando archivo:', error);
      toast.error('Error al procesar el archivo');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setProcessedData(null);
  };

  return {
    loading,
    processedData,
    processFile,
    clearData,
  };
};