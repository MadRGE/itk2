import React, { useState, useEffect } from 'react';
import { Users, WifiSync as Sync, Search, Eye, Mail, Phone, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../hooks/useSettings';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import toast from 'react-hot-toast';

interface Client {
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
}

interface ClientDetail {
  client: Client;
  products: any[];
  documentsCount: number;
}

const ClientsSection: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { settings, validateSettings } = useSettings();
  const { t } = useLanguage();
  const { logAction } = useAnalytics();

  const [missingDataAlerts, setMissingDataAlerts] = useState<{[key: string]: string[]}>({});

  const loadClients = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        console.warn('Supabase not configured - using empty data');
        setClients([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading clients:', error);
        setClients([]);
      } else {
        setClients(data || []);
      }

      // Verificar datos faltantes y generar alertas
      if (data && data.length > 0) {
        const alerts: {[key: string]: string[]} = {};
        data.forEach(client => {
          const missing: string[] = [];
          if (!client.razon_social) missing.push('Razón Social');
          if (!client.correo_electronico) missing.push('Correo Electrónico');
          if (!client.telefono) missing.push('Teléfono');
          if (!client.domicilio_legal) missing.push('Domicilio Legal');
          
          if (missing.length > 0) {
            alerts[client.id] = missing;
          }
        });
        setMissingDataAlerts(alerts);
      }

      console.log(`✅ ${data?.length || 0} clientes cargados desde Supabase`);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Sync clients from file
  const syncClients = async () => {
    setSyncing(true);
    try {
      if (!supabase) {
        toast.error('Supabase no está configurado');
        return;
      }

      // Obtener datos validados del archivo
      const clientsFileData = localStorage.getItem('clients_file_data');
      
      if (!clientsFileData) {
        toast.error('No hay datos de clientes validados para sincronizar');
        return;
      }

      const data = JSON.parse(clientsFileData);
      console.log('📊 Sincronizando clientes desde archivo validado:', {
        headers: data.headers,
        totalRows: data.rows.length
      });

      // Mapear los datos del archivo a la estructura de clientes
      const clientsFromFile = data.rows.map((row: any[], index: number) => {
        // Mapeo basado en los headers del archivo
        const headerMap: {[key: string]: number} = {};
        data.headers.forEach((header: string, idx: number) => {
          headerMap[String(header).toUpperCase()] = idx;
        });

        return {
          cuit: String(row[headerMap['CUIT']] || `CUIT-${index + 1}`),
          razon_social: row[headerMap['RAZON SOCIAL']] || row[headerMap['RAZÓN SOCIAL']] || null,
          nombre_comercial: row[headerMap['NOMBRE COMERCIAL']] || null,
          domicilio_legal: row[headerMap['DOMICILIO LEGAL']] || row[headerMap['DOMICILIO']] || null,
          domicilio_planta: row[headerMap['DOMICILIO PLANTA']] || row[headerMap['DOMICILIO DE PLANTA']] || null,
          telefono: row[headerMap['TELEFONO']] || row[headerMap['TELÉFONO']] || null,
          correo_electronico: row[headerMap['CORREO ELECTRONICO']] || row[headerMap['EMAIL']] || row[headerMap['CORREO']] || null,
          representante_nombre: row[headerMap['REPRESENTANTE NOMBRE']] || row[headerMap['REPRESENTANTE']] || null,
          representante_domicilio: row[headerMap['REPRESENTANTE DOMICILIO']] || null,
          representante_cuit: row[headerMap['REPRESENTANTE CUIT']] || null,
          enlace_djc: row[headerMap['ENLACE DJC']] || null,
        };
      }).filter((client: any) => client.cuit && String(client.cuit).trim() !== '');

      // Sincronizar con Supabase usando upsert
      const { error } = await supabase
        .from('clients')
        .upsert(clientsFromFile, { onConflict: 'cuit' });

      if (error) throw error;

      await logAction('sync', 'clients', { count: clientsFromFile.length });
      toast.success(`${clientsFromFile.length} clientes sincronizados con Supabase`);
      loadClients();
    } catch (error) {
      console.error('Error syncing clients:', error);
      toast.error('Error al sincronizar clientes: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const openClientDetail = async (client: Client) => {
    try {
      // Buscar productos asociados por CUIT
      let products = [];
      if (client.cuit && supabase) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('cuit', client.cuit);
        products = data || [];
      }

      const clientDetail: ClientDetail = {
        client,
        products,
        documentsCount: 0,
      };

      setSelectedClient(clientDetail);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading client detail:', error);
      toast.error('Error al cargar detalles del cliente');
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = searchTerm === '' || 
      String(client.cuit).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.razon_social && client.razon_social.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.correo_electronico && client.correo_electronico.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

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
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                {t('clients.title')}
              </h2>
              <button
                onClick={syncClients}
                disabled={syncing}
                type="button"
                className="mt-3 sm:mt-0 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sync className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? t('common.loading') : t('clients.sync')}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder={`${t('common.search')} por codificación o titular...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Clients Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clients.cuit')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clients.razonSocial')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre Comercial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clients.email')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <React.Fragment key={client.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {client.cuit}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {client.razon_social || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.nombre_comercial || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Mail className="h-4 w-4 mr-1 text-gray-400" />
                          {client.correo_electronico || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {client.telefono || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openClientDetail(client)}
                            title="Ver detalles"
                            type="button"
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Fila de alertas si hay datos faltantes */}
                    {missingDataAlerts[client.id] && (
                      <tr className="bg-yellow-50">
                        <td colSpan={6} className="px-6 py-2">
                          <div className="flex items-center text-sm text-yellow-800">
                            <Building className="h-4 w-4 mr-2" />
                            <span className="font-medium">Datos faltantes:</span>
                            <span className="ml-2">{missingDataAlerts[client.id].join(', ')}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay clientes</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No se encontraron clientes con los filtros aplicados.' : 'Comience cargando el archivo de clientes en Validación de Información.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalle del Cliente */}
      {showDetailModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalle del Cliente: {selectedClient.client.razon_social}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Información del Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Información General</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">CUIT:</span> {selectedClient.client.cuit}</div>
                    <div><span className="font-medium">Razón Social:</span> {selectedClient.client.razon_social}</div>
                    <div><span className="font-medium">Nombre Comercial:</span> {selectedClient.client.nombre_comercial || 'N/A'}</div>
                    <div><span className="font-medium">Email:</span> {selectedClient.client.correo_electronico || 'N/A'}</div>
                    <div><span className="font-medium">Teléfono:</span> {selectedClient.client.telefono || 'N/A'}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Domicilios</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Legal:</span> {selectedClient.client.domicilio_legal || 'N/A'}</div>
                    <div><span className="font-medium">Planta:</span> {selectedClient.client.domicilio_planta || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Información del Representante */}
              {selectedClient.client.representante_nombre && (
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Representante</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Nombre:</span> {selectedClient.client.representante_nombre}</div>
                      <div><span className="font-medium">CUIT:</span> {selectedClient.client.representante_cuit || 'N/A'}</div>
                      <div><span className="font-medium">Domicilio:</span> {selectedClient.client.representante_domicilio || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Productos Asociados */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Productos Asociados</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {selectedClient.products.length > 0 ? (
                    <div className="space-y-2">
                      {selectedClient.products.map((product, index) => (
                        <div key={index} className="text-sm">
                          {product.codificacion} - {product.producto}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No hay productos asociados a este cliente aún.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientsSection;