import React, { useState, useEffect } from 'react';
import { Package, WifiSync as Sync, Upload, Search, Filter, QrCode, FileText, AlertTriangle, Eye, Download, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../hooks/useSettings';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

interface Product {
  id: string;
  codificacion: string;
  titular: string | null;
  tipo_certificacion: string | null;
  estado: string | null;
  vencimiento: string | null;
  dias_para_vencer: number | null;
  certificates_path: string | null;
  djc_path: string | null;
  qr_code_path: string | null;
  created_at: string;
}

interface ProductDetail {
  product: Product;
  client?: any;
  certificates: string[];
  djcGenerated: boolean;
  qrGenerated: boolean;
}

const ProductsSection: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { settings, validateSettings } = useSettings();
  const { t } = useLanguage();
  const { logAction } = useAnalytics();

  const [missingDataAlerts, setMissingDataAlerts] = useState<{[key: string]: string[]}>({});

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        console.warn('Supabase not configured - using empty data');
        setProducts([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading products:', error);
        setProducts([]);
      } else {
        setProducts(data || []);
      }

      // Verificar datos faltantes y generar alertas
      if (data && data.length > 0) {
        const alerts: {[key: string]: string[]} = {};
        data.forEach(product => {
          const missing: string[] = [];
          if (!product.titular) missing.push('Titular');
          if (!product.tipo_certificacion) missing.push('Tipo de Certificación');
          if (!product.estado) missing.push('Estado');
          if (!product.vencimiento) missing.push('Vencimiento');
          if (!product.certificates_path) missing.push('Certificados');
          if (!product.djc_path) missing.push('DJC');
          if (!product.qr_code_path) missing.push('Código QR');
          
          if (missing.length > 0) {
            alerts[product.id] = missing;
          }
        });
        setMissingDataAlerts(alerts);
      }

      console.log(`✅ ${data?.length || 0} productos cargados desde Supabase`);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Simulate Google Sheets sync
  const syncProducts = async () => {
    setSyncing(true);
    try {
      if (!supabase) {
        toast.error('Supabase no está configurado');
        return;
      }

      // Obtener datos validados del archivo
      const productsFileData = localStorage.getItem('products_file_data');
      
      if (!productsFileData) {
        toast.error('No hay datos de productos validados para sincronizar');
        return;
      }

      const data = JSON.parse(productsFileData);
      console.log('📊 Sincronizando productos desde archivo validado:', {
        headers: data.headers,
        totalRows: data.rows.length
      });

      // Mapear los datos del archivo a la estructura de productos
      const productsFromFile = data.rows.map((row: any[], index: number) => {
        // Mapeo basado en los headers del archivo
        const headerMap: {[key: string]: number} = {};
        data.headers.forEach((header: string, idx: number) => {
          headerMap[String(header).toUpperCase()] = idx;
        });

        // Calcular días para vencer
        let diasParaVencer = null;
        const vencimientoStr = row[headerMap['VENCIMIENTO']] || row[headerMap['FECHA DE VENCIMIENTO']];
        let vencimientoFormatted = null;
        if (vencimientoStr) {
          let vencimiento;
          if (vencimientoStr instanceof Date) {
            vencimiento = vencimientoStr;
          } else if (typeof vencimientoStr === 'number') {
            // Excel date serial number
            vencimiento = new Date((vencimientoStr - 25569) * 86400 * 1000);
          } else {
            vencimiento = new Date(vencimientoStr);
          }
          
          if (!isNaN(vencimiento.getTime())) {
            // Check if year is within reasonable range (1900-2100)
            const year = vencimiento.getFullYear();
            if (year >= 1900 && year <= 2100) {
            vencimientoFormatted = vencimiento.toISOString().split('T')[0];
            }
          }
          
          const hoy = new Date();
          diasParaVencer = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Procesar fecha de emisión
        const fechaEmisionStr = row[headerMap['FECHA EMISION']] || row[headerMap['FECHA DE EMISION']];
        let fechaEmisionFormatted = null;
        if (fechaEmisionStr) {
          let fechaEmision;
          if (fechaEmisionStr instanceof Date) {
            fechaEmision = fechaEmisionStr;
          } else if (typeof fechaEmisionStr === 'number') {
            // Excel date serial number
            fechaEmision = new Date((fechaEmisionStr - 25569) * 86400 * 1000);
          } else {
            fechaEmision = new Date(fechaEmisionStr);
          }
          
          if (!isNaN(fechaEmision.getTime())) {
            // Check if year is within reasonable range (1900-2100)
            const year = fechaEmision.getFullYear();
            if (year >= 1900 && year <= 2100) {
            fechaEmisionFormatted = fechaEmision.toISOString().split('T')[0];
            }
          }
        }
        return {
          codificacion: row[headerMap['CODIFICACIÓN']] || row[headerMap['CODIGO']] || `PROD-${index + 1}`,
          titular: row[headerMap['TITULAR']] || row[headerMap['EMPRESA']] || null,
          tipo_certificacion: row[headerMap['TIPO DE CERTIFICACION']] || row[headerMap['TIPO']] || null,
          estado: row[headerMap['ESTADO']] || 'VIGENTE',
          vencimiento: vencimientoFormatted,
          dias_para_vencer: diasParaVencer,
          cuit: row[headerMap['CUIT']] || null,
          producto: row[headerMap['PRODUCTO']] || null,
          marca: row[headerMap['MARCA']] || null,
          modelo: row[headerMap['MODELO']] || null,
          fecha_emision: fechaEmisionFormatted,
          fabricante: row[headerMap['FABRICANTE']] || null,
          origen: row[headerMap['ORIGEN']] || 'NACIONAL',
          normas_aplicacion: row[headerMap['NORMAS DE APLICACION']] || row[headerMap['NORMAS']] || null,
        };
      }).filter((product: any) => product.codificacion && product.codificacion.trim() !== '');

      // Sincronizar con Supabase usando upsert
      const { error } = await supabase
        .from('products')
        .upsert(productsFromFile, { onConflict: 'codificacion' });

      if (error) throw error;

      await logAction('sync', 'products', { count: productsFromFile.length });
      toast.success(`${productsFromFile.length} productos sincronizados con Supabase`);
      loadProducts();
    } catch (error) {
      console.error('Error syncing products:', error);
      toast.error('Error al sincronizar productos: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const generateQRCode = async (codificacion: string) => {
    try {
      const qrData = `${window.location.origin}/product/${codificacion}`;
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2, 
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // In a real implementation, you would upload this to Supabase Storage
      console.log(`QR Code generated for ${codificacion}:`, qrCodeDataURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const openProductDetail = async (product: Product) => {
    try {
      // Buscar cliente asociado por CUIT
      let clientData = null;
      if (product.cuit && supabase) {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .eq('cuit', product.cuit)
          .single();
        clientData = data;
      }


      const productDetail: ProductDetail = {
        product,
        client: clientData,
        certificates: product.certificates_path ? [product.certificates_path] : [],
        djcGenerated: !!product.djc_path,
        qrGenerated: !!product.qr_code_path,
      };

      setSelectedProduct(productDetail);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading product detail:', error);
      toast.error('Error al cargar detalles del producto');
    }
  };

  const generateDJC = async (product: Product) => {
    try {
      // Simular generación de DJC
      toast.success(`DJC generada para ${product.codificacion}`);
      await logAction('generation', 'products', { codificacion: product.codificacion });
      loadProducts(); // Recargar para actualizar estado
    } catch (error) {
      console.error('Error generating DJC:', error);
      toast.error('Error al generar DJC');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' || 
      product.codificacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.titular && product.titular.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === '' || product.estado === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (estado: string | null, diasParaVencer: number | null) => {
    if (!estado) return 'bg-gray-100 text-gray-800';
    
    if (estado === 'VIGENTE') {
      if (diasParaVencer !== null && diasParaVencer <= settings.CRITICAL_DAYS_THRESHOLD) {
        return 'bg-yellow-100 text-yellow-800';
      }
      return 'bg-green-100 text-green-800';
    }
    
    if (estado === 'VENCIDO') return 'bg-red-100 text-red-800';
    if (estado === 'CANCELADO') return 'bg-gray-100 text-gray-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>

        {/* Modal de Detalle del Producto */}
        {showDetailModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Detalle del Producto: {selectedProduct.product.codificacion}
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
                {/* Información del Producto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Información General</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Titular:</span> {selectedProduct.product.titular}</div>
                      <div><span className="font-medium">Producto:</span> {selectedProduct.product.producto}</div>
                      <div><span className="font-medium">Marca:</span> {selectedProduct.product.marca}</div>
                      <div><span className="font-medium">Modelo:</span> {selectedProduct.product.modelo}</div>
                      <div><span className="font-medium">Estado:</span> 
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedProduct.product.estado, selectedProduct.product.dias_para_vencer)}`}>
                          {selectedProduct.product.estado}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Fechas y Vencimiento</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Emisión:</span> {selectedProduct.product.fecha_emision ? new Date(selectedProduct.product.fecha_emision).toLocaleDateString() : 'N/A'}</div>
                      <div><span className="font-medium">Vencimiento:</span> {selectedProduct.product.vencimiento ? new Date(selectedProduct.product.vencimiento).toLocaleDateString() : 'N/A'}</div>
                      <div><span className="font-medium">Días para vencer:</span> {selectedProduct.product.dias_para_vencer || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Información del Cliente */}
                {selectedProduct.client && (
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Cliente Asociado</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><span className="font-medium">Razón Social:</span> {selectedProduct.client.razon_social}</div>
                        <div><span className="font-medium">CUIT:</span> {selectedProduct.client.cuit}</div>
                        <div><span className="font-medium">Email:</span> {selectedProduct.client.correo_electronico}</div>
                        <div><span className="font-medium">Teléfono:</span> {selectedProduct.client.telefono}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Archivos y Documentos */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Documentos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Certificados */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">Certificados</h5>
                        {selectedProduct.certificates.length > 0 ? (
                          <span className="text-green-600 text-xs">✓ Disponible</span>
                        ) : (
                          <span className="text-red-600 text-xs">✗ Faltante</span>
                        )}
                      </div>
                      {selectedProduct.certificates.length > 0 ? (
                        <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800">
                          <Download className="h-4 w-4 inline mr-1" />
                          Descargar certificado
                        </button>
                      ) : (
                        <button className="w-full text-left text-sm text-gray-500">
                          <Upload className="h-4 w-4 inline mr-1" />
                          Subir certificado
                        </button>
                      )}
                    </div>

                    {/* DJC */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">DJC</h5>
                        {selectedProduct.djcGenerated ? (
                          <span className="text-green-600 text-xs">✓ Generada</span>
                        ) : (
                          <span className="text-yellow-600 text-xs">⚠ Pendiente</span>
                        )}
                      </div>
                      {selectedProduct.djcGenerated ? (
                        <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800">
                          <ExternalLink className="h-4 w-4 inline mr-1" />
                          Ver DJC
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => generateDJC(selectedProduct.product)}
                          className="w-full text-left text-sm text-green-600 hover:text-green-800"
                        >
                          <FileText className="h-4 w-4 inline mr-1" />
                          Generar DJC
                        </button>
                      )}
                    </div>

                    {/* Código QR */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">Código QR</h5>
                        {selectedProduct.qrGenerated ? (
                          <span className="text-green-600 text-xs">✓ Generado</span>
                        ) : (
                          <span className="text-yellow-600 text-xs">⚠ Pendiente</span>
                        )}
                      </div>
                      {selectedProduct.qrGenerated ? (
                        <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800">
                          <QrCode className="h-4 w-4 inline mr-1" />
                          Ver código QR
                        </button>
                      ) : (
                        <button 
                          type="button"
                          className="w-full text-left text-sm text-purple-600 hover:text-purple-800"
                        >
                          <QrCode className="h-4 w-4 inline mr-1" />
                          Generar QR
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {t('products.title')}
            </h2>
            <button
              onClick={syncProducts}
              disabled={syncing}
              type="button"
              className="mt-3 sm:mt-0 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sync className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? t('common.loading') : t('products.sync')}
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
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="VIGENTE">Vigente</option>
                <option value="VENCIDO">Vencido</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('products.codificacion')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('products.titular')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('products.estado')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('products.vencimiento')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <React.Fragment key={product.id}>
                  <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {product.codificacion}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {product.titular || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {product.tipo_certificacion || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.estado, product.dias_para_vencer)}`}>
                      {product.estado || 'N/A'}
                      {product.dias_para_vencer !== null && product.dias_para_vencer <= settings.CRITICAL_DAYS_THRESHOLD && (
                        <AlertTriangle className="h-3 w-3 ml-1" />
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {product.vencimiento ? new Date(product.vencimiento).toLocaleDateString() : 'N/A'}
                      {product.dias_para_vencer !== null && (
                        <div className="text-xs text-gray-500">
                          {product.dias_para_vencer} días
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openProductDetail(product)}
                        title="Ver detalles"
                        type="button"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        title="Subir certificados"
                        type="button"
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => generateDJC(product)}
                        title="Ver DJC"
                        type="button"
                        className="text-green-600 hover:text-green-900"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        title="Ver código QR"
                        type="button"
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  </tr>
                  {/* Fila de alertas si hay datos faltantes */}
                  {missingDataAlerts[product.id] && (
                    <tr className="bg-yellow-50">
                      <td colSpan={6} className="px-6 py-2">
                        <div className="flex items-center text-sm text-yellow-800">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          <span className="font-medium">Datos faltantes:</span>
                          <span className="ml-2">{missingDataAlerts[product.id].join(', ')}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter ? 'No se encontraron productos con los filtros aplicados.' : 'Comience sincronizando productos desde Google Sheets.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Detalle del Producto */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalle del Producto: {selectedProduct.product.codificacion}
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
              {/* Información del Producto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Información General</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Titular:</span> {selectedProduct.product.titular}</div>
                    <div><span className="font-medium">Producto:</span> {selectedProduct.product.producto}</div>
                    <div><span className="font-medium">Marca:</span> {selectedProduct.product.marca}</div>
                    <div><span className="font-medium">Modelo:</span> {selectedProduct.product.modelo}</div>
                    <div><span className="font-medium">Estado:</span> 
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedProduct.product.estado, selectedProduct.product.dias_para_vencer)}`}>
                        {selectedProduct.product.estado}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Fechas y Vencimiento</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Emisión:</span> {selectedProduct.product.fecha_emision ? new Date(selectedProduct.product.fecha_emision).toLocaleDateString() : 'N/A'}</div>
                    <div><span className="font-medium">Vencimiento:</span> {selectedProduct.product.vencimiento ? new Date(selectedProduct.product.vencimiento).toLocaleDateString() : 'N/A'}</div>
                    <div><span className="font-medium">Días para vencer:</span> {selectedProduct.product.dias_para_vencer || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Información del Cliente */}
              {selectedProduct.client && (
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Cliente Asociado</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Razón Social:</span> {selectedProduct.client.razon_social}</div>
                      <div><span className="font-medium">CUIT:</span> {selectedProduct.client.cuit}</div>
                      <div><span className="font-medium">Email:</span> {selectedProduct.client.correo_electronico}</div>
                      <div><span className="font-medium">Teléfono:</span> {selectedProduct.client.telefono}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Archivos y Documentos */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Documentos</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Certificados */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">Certificados</h5>
                      {selectedProduct.certificates.length > 0 ? (
                        <span className="text-green-600 text-xs">✓ Disponible</span>
                      ) : (
                        <span className="text-red-600 text-xs">✗ Faltante</span>
                      )}
                    </div>
                    {selectedProduct.certificates.length > 0 ? (
                      <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800">
                        <Download className="h-4 w-4 inline mr-1" />
                        Descargar certificado
                      </button>
                    ) : (
                      <button className="w-full text-left text-sm text-gray-500">
                        <Upload className="h-4 w-4 inline mr-1" />
                        Subir certificado
                      </button>
                    )}
                  </div>

                  {/* DJC */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">DJC</h5>
                      {selectedProduct.djcGenerated ? (
                        <span className="text-green-600 text-xs">✓ Generada</span>
                      ) : (
                        <span className="text-yellow-600 text-xs">⚠ Pendiente</span>
                      )}
                    </div>
                    {selectedProduct.djcGenerated ? (
                      <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800">
                        <ExternalLink className="h-4 w-4 inline mr-1" />
                        Ver DJC
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => generateDJC(selectedProduct.product)}
                        className="w-full text-left text-sm text-green-600 hover:text-green-800"
                      >
                        <FileText className="h-4 w-4 inline mr-1" />
                        Generar DJC
                      </button>
                    )}
                  </div>

                  {/* Código QR */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">Código QR</h5>
                      {selectedProduct.qrGenerated ? (
                        <span className="text-green-600 text-xs">✓ Generado</span>
                      ) : (
                        <span className="text-yellow-600 text-xs">⚠ Pendiente</span>
                      )}
                    </div>
                    {selectedProduct.qrGenerated ? (
                      <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800">
                        <QrCode className="h-4 w-4 inline mr-1" />
                        Ver código QR
                      </button>
                    ) : (
                      <button 
                        type="button"
                        className="w-full text-left text-sm text-purple-600 hover:text-purple-800"
                      >
                        <QrCode className="h-4 w-4 inline mr-1" />
                        Generar QR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsSection;