import React, { useState } from 'react';
import { Settings, Save, RefreshCw, Database, Cloud, HardDrive, FileText, AlertCircle } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ConfigurationSection: React.FC = () => {
  const { settings, loading, saving, saveSettings } = useSettings();
  const { t } = useLanguage();
  const { hasGoogleAccess, userEmail, signInWithGoogle } = useAuth();
  const [formData, setFormData] = useState(settings);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleInputChange = (key: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    const success = await saveSettings(formData);
    if (success) {
      toast.success(t('messages.configSaved'));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('Conectando con Google...');
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      toast.error(error.message || 'Error al conectar con Google');
    }
  };
  const resetToDefaults = () => {
    setFormData({
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
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              {t('config.title')}
            </h2>
            <div className="mt-3 sm:mt-0 flex space-x-3">
              <button
                onClick={resetToDefaults}
                type="button"
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restaurar Valores por Defecto
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                type="button"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Guardando...' : t('common.save')}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Google Account Status */}
          <div className={`border rounded-lg p-4 ${
            hasGoogleAccess() 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <Cloud className={`h-5 w-5 mr-2 ${
                hasGoogleAccess() ? 'text-green-600' : 'text-yellow-600'
              }`} />
              <div>
                <h3 className={`font-medium ${
                  hasGoogleAccess() ? 'text-green-900' : 'text-yellow-900'
                }`}>Estado de Google Account</h3>
                <p className={`text-sm ${
                  hasGoogleAccess() ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {hasGoogleAccess() ? (
                    <>✅ Conectado como: {userEmail}</>
                  ) : (
                    <>❌ No conectado. Inicie sesión con Google para acceder a Sheets y Drive.</>
                  )}
                </p>
              </div>
              {!hasGoogleAccess() && (
                <button
                  onClick={handleGoogleSignIn}
                  type="button"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Conectar con Google
                </button>
              )}
            </div>
          </div>

          {/* Google Sheets Configuration */}
          <div className="space-y-6">
            <div className="flex items-center">
              <Database className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">{t('config.googleSheets')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('config.productsSheetId')}
                </label>
                <input
                  type="text"
                  value={formData.SPREADSHEET_ID_PRODUCTS}
                  onChange={(e) => handleInputChange('SPREADSHEET_ID_PRODUCTS', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID del Google Sheet de productos"
                />
                <p className="mt-1 text-xs text-gray-500">
                  ID del Google Sheet que contiene los datos de productos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pestaña de Productos
                </label>
                <input
                  type="text"
                  value={formData.SPREADSHEET_ID_PRODUCTS_TAB}
                  onChange={(e) => handleInputChange('SPREADSHEET_ID_PRODUCTS_TAB', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre|ID de la pestaña"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Formato: "Nombre de la pestaña|ID numérico"
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('config.clientsSheetId')}
                </label>
                <input
                  type="text"
                  value={formData.SPREADSHEET_ID_CLIENTS}
                  onChange={(e) => handleInputChange('SPREADSHEET_ID_CLIENTS', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID del Google Sheet de clientes"
                />
                <p className="mt-1 text-xs text-gray-500">
                  ID del Google Sheet que contiene los datos de clientes
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pestaña de Clientes
                </label>
                <input
                  type="text"
                  value={formData.SPREADSHEET_ID_CLIENTS_TAB}
                  onChange={(e) => handleInputChange('SPREADSHEET_ID_CLIENTS_TAB', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre|ID de la pestaña"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Formato: "Nombre de la pestaña|ID numérico"
                </p>
              </div>
            </div>
          </div>

          {/* Google Drive Configuration */}
          <div className="space-y-6">
            <div className="flex items-center">
              <Cloud className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">{t('config.googleDrive')}</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('config.driveFolder')}
              </label>
              <input
                type="text"
                value={formData.GOOGLE_DRIVE_FOLDER_ID}
                onChange={(e) => handleInputChange('GOOGLE_DRIVE_FOLDER_ID', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ID de la carpeta de Google Drive"
              />
              <p className="mt-1 text-xs text-gray-500">
                ID de la carpeta donde se almacenarán los archivos generados
              </p>
            </div>
          </div>

          {/* DJC Templates */}
          <div className="space-y-6">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">{t('config.djcTemplates')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('config.res16Id')}
                </label>
                <input
                  type="text"
                  value={formData.DJC_TEMPLATE_RES16_ID}
                  onChange={(e) => handleInputChange('DJC_TEMPLATE_RES16_ID', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID del template para Resolución 16/2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('config.res17Id')}
                </label>
                <input
                  type="text"
                  value={formData.DJC_TEMPLATE_RES17_ID}
                  onChange={(e) => handleInputChange('DJC_TEMPLATE_RES17_ID', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID del template para Resolución 17/2025"
                />
              </div>
            </div>
          </div>

          {/* Storage Configuration */}
          <div className="space-y-6">
            <div className="flex items-center">
              <HardDrive className="h-5 w-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">{t('config.storage')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('config.certificatesBucket')}
                </label>
                <input
                  type="text"
                  value={formData.SUPABASE_BUCKET_CERTIFICATES}
                  onChange={(e) => handleInputChange('SUPABASE_BUCKET_CERTIFICATES', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="certificates"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('config.clientDocsBucket')}
                </label>
                <input
                  type="text"
                  value={formData.SUPABASE_BUCKET_CLIENT_DOCS}
                  onChange={(e) => handleInputChange('SUPABASE_BUCKET_CLIENT_DOCS', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="client-documents"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('config.qrsBucket')}
                </label>
                <input
                  type="text"
                  value={formData.SUPABASE_BUCKET_QRS}
                  onChange={(e) => handleInputChange('SUPABASE_BUCKET_QRS', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="qr-codes"
                />
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="space-y-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Configuración del Sistema</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('config.criticalDays')}
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.CRITICAL_DAYS_THRESHOLD}
                onChange={(e) => handleInputChange('CRITICAL_DAYS_THRESHOLD', parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="30"
              />
              <p className="mt-1 text-xs text-gray-500">
                Número de días antes del vencimiento para mostrar alertas críticas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationSection;