import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, FileText, Download, Upload, Eye } from 'lucide-react';
import { useFileProcessor } from '../../hooks/useFileProcessor';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import toast from 'react-hot-toast';

interface ValidationResult {
  type: 'error' | 'warning' | 'success';
  message: string;
  field?: string;
  row?: number;
}

const ValidationSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'clients'>('products');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validating, setValidating] = useState(false);
  const [hasData, setHasData] = useState(false);
  const { processFile, loading: fileLoading } = useFileProcessor();
  const { t } = useLanguage();
  const { logAction } = useAnalytics();

  // Verificar si hay datos guardados al cargar
  useEffect(() => {
    checkForSavedData();
  }, [activeTab]);

  const checkForSavedData = () => {
    const key = activeTab === 'products' ? 'products_file_data' : 'clients_file_data';
    const savedData = localStorage.getItem(key);
    
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setHasData(data && data.headers && data.rows && data.rows.length > 0);
        console.log(`✅ Datos encontrados para ${activeTab}:`, {
          headers: data?.headers?.length || 0,
          rows: data?.rows?.length || 0
        });
      } catch (error) {
        console.error('Error parsing saved data:', error);
        setHasData(false);
      }
    } else {
      console.log(`❌ No hay datos guardados para ${activeTab}`);
      setHasData(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const processedData = await processFile(file);
      if (processedData) {
        // Guardar datos automáticamente
        const key = activeTab === 'products' ? 'products_file_data' : 'clients_file_data';
        localStorage.setItem(key, JSON.stringify(processedData));
        setHasData(true);
        toast.success(`Archivo ${activeTab} cargado y guardado automáticamente`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Error al procesar el archivo');
    }

    // Limpiar input
    event.target.value = '';
  };

  const validateData = async () => {
    if (!hasData) {
      toast.error('No hay datos para validar. Sube un archivo primero.');
      return;
    }

    setValidating(true);
    setValidationResults([]);

    try {
      const key = activeTab === 'products' ? 'products_file_data' : 'clients_file_data';
      const savedData = localStorage.getItem(key);
      
      if (!savedData) {
        toast.error('No se encontraron datos guardados');
        return;
      }

      const data = JSON.parse(savedData);
      console.log(`🔍 Validando datos de ${activeTab}:`, {
        headers: data.headers,
        totalRows: data.rows.length
      });

      const results: ValidationResult[] = [];

      if (activeTab === 'products') {
        // Validación de productos
        const requiredFields = ['CODIFICACIÓN', 'TITULAR', 'ESTADO', 'VENCIMIENTO'];
        
        // Verificar headers
        requiredFields.forEach(field => {
          if (!data.headers.some((h: string) => h.toUpperCase().includes(field))) {
            results.push({
              type: 'error',
              message: `Campo requerido faltante: ${field}`,
              field
            });
          }
        });

        // Validar filas
        data.rows.forEach((row: any[], index: number) => {
          const codificacion = row[0];
          const titular = row[1];
          const estado = row[3];
          const vencimiento = row[10];

          if (!codificacion || codificacion.toString().trim() === '') {
            results.push({
              type: 'error',
              message: `Fila ${index + 2}: Codificación vacía`,
              row: index + 2
            });
          }

          if (!titular || titular.toString().trim() === '') {
            results.push({
              type: 'warning',
              message: `Fila ${index + 2}: Titular vacío`,
              row: index + 2
            });
          }

          if (!estado || estado.toString().trim() === '') {
            results.push({
              type: 'warning',
              message: `Fila ${index + 2}: Estado vacío`,
              row: index + 2
            });
          }

          if (!vencimiento || vencimiento.toString().trim() === '') {
            results.push({
              type: 'warning',
              message: `Fila ${index + 2}: Fecha de vencimiento vacía`,
              row: index + 2
            });
          }
        });

      } else {
        // Validación de clientes
        const requiredFields = ['CUIT', 'RAZON SOCIAL', 'CORREO ELECTRONICO'];
        
        // Verificar headers
        requiredFields.forEach(field => {
          if (!data.headers.some((h: string) => h.toUpperCase().includes(field.toUpperCase()))) {
            results.push({
              type: 'error',
              message: `Campo requerido faltante: ${field}`,
              field
            });
          }
        });

        // Validar filas
        data.rows.forEach((row: any[], index: number) => {
          const cuit = row[0];
          const razonSocial = row[1];
          const email = row[6];

          if (!cuit || cuit.toString().trim() === '') {
            results.push({
              type: 'error',
              message: `Fila ${index + 2}: CUIT vacío`,
              row: index + 2
            });
          }

          if (!razonSocial || razonSocial.toString().trim() === '') {
            results.push({
              type: 'warning',
              message: `Fila ${index + 2}: Razón Social vacía`,
              row: index + 2
            });
          }

          if (!email || email.toString().trim() === '') {
            results.push({
              type: 'warning',
              message: `Fila ${index + 2}: Email vacío`,
              row: index + 2
            });
          }
        });
      }

      // Agregar resultado de éxito si no hay errores críticos
      const errors = results.filter(r => r.type === 'error');
      if (errors.length === 0) {
        results.unshift({
          type: 'success',
          message: `Validación completada exitosamente. ${data.rows.length} filas procesadas.`
        });
      }

      setValidationResults(results);
      await logAction('validation', activeTab, { 
        totalRows: data.rows.length,
        errors: errors.length,
        warnings: results.filter(r => r.type === 'warning').length
      });

      toast.success(`Validación de ${activeTab} completada`);

    } catch (error) {
      console.error('Error validating data:', error);
      toast.error('Error durante la validación');
    } finally {
      setValidating(false);
    }
  };

  const exportResults = () => {
    if (validationResults.length === 0) {
      toast.error('No hay resultados para exportar');
      return;
    }

    const csvContent = [
      ['Tipo', 'Mensaje', 'Campo', 'Fila'],
      ...validationResults.map(result => [
        result.type,
        result.message,
        result.field || '',
        result.row || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validacion_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Resultados exportados');
  };

  const clearData = () => {
    const key = activeTab === 'products' ? 'products_file_data' : 'clients_file_data';
    localStorage.removeItem(key);
    setHasData(false);
    setValidationResults([]);
    toast.success(`Datos de ${activeTab} eliminados`);
  };

  const getResultIcon = (type: ValidationResult['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getResultColor = (type: ValidationResult['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
    }
  };

  const errorCount = validationResults.filter(r => r.type === 'error').length;
  const warningCount = validationResults.filter(r => r.type === 'warning').length;
  const successCount = validationResults.filter(r => r.type === 'success').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              {t('validation.title')}
            </h2>
            <div className="mt-3 sm:mt-0 flex space-x-3">
              {validationResults.length > 0 && (
                <button
                  onClick={exportResults}
                  type="button"
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Resultados
                </button>
              )}
              <button
                onClick={validateData}
                disabled={validating || !hasData}
                type="button"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle className={`h-4 w-4 mr-2 ${validating ? 'animate-spin' : ''}`} />
                {validating ? 'Validando...' : t('validation.validateSync')}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('products')}
                type="button"
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'products'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('validation.products')}
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                type="button"
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'clients'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('validation.clients')}
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* File Upload Section */}
          {!hasData && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Subir archivo de {activeTab === 'products' ? 'productos' : 'clientes'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Sube un archivo Excel (.xlsx) o CSV (.csv) para validar
              </p>
              <div className="mt-6">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={fileLoading}
                  />
                  <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                    <Upload className="h-4 w-4 mr-2" />
                    {fileLoading ? 'Procesando...' : 'Seleccionar archivo'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Data Status */}
          {hasData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    Datos de {activeTab === 'products' ? 'productos' : 'clientes'} cargados y listos para validar
                  </span>
                </div>
                <div className="flex space-x-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={fileLoading}
                    />
                    <span className="inline-flex items-center px-3 py-1 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200">
                      <Upload className="h-4 w-4 mr-1" />
                      Cambiar archivo
                    </span>
                  </label>
                  <button
                    onClick={clearData}
                    type="button"
                    className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                  >
                    Limpiar datos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validationResults.length > 0 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <div>
                      <div className="text-lg font-semibold text-red-900">{errorCount}</div>
                      <div className="text-sm text-red-600">{t('validation.errors')}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                    <div>
                      <div className="text-lg font-semibold text-yellow-900">{warningCount}</div>
                      <div className="text-sm text-yellow-600">{t('validation.warnings')}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <div className="text-lg font-semibold text-green-900">{successCount}</div>
                      <div className="text-sm text-green-600">{t('validation.success')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-2">
                {validationResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getResultColor(result.type)}`}
                  >
                    <div className="flex items-start">
                      {getResultIcon(result.type)}
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium">{result.message}</p>
                        {(result.field || result.row) && (
                          <div className="mt-1 text-xs opacity-75">
                            {result.field && <span>Campo: {result.field}</span>}
                            {result.field && result.row && <span> • </span>}
                            {result.row && <span>Fila: {result.row}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!hasData && !fileLoading && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay datos para validar</h3>
              <p className="mt-1 text-sm text-gray-500">
                Sube un archivo Excel o CSV para comenzar la validación
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationSection;