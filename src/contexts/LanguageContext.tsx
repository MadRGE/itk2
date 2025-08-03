import React, { createContext, useContext, useState } from 'react';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  es: {
    // Navigation
    'nav.products': 'Gestión de Productos',
    'nav.clients': 'Gestión de Clientes',
    'nav.validation': 'Validación de Información',
    'nav.config': 'Configuración',
    'nav.signOut': 'Cerrar Sesión',
    
    // Auth
    'auth.signIn': 'Iniciar Sesión',
    'auth.signUp': 'Registrarse',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.googleSignIn': 'Continuar con Google',
    'auth.noAccount': '¿No tienes cuenta?',
    'auth.hasAccount': '¿Ya tienes cuenta?',
    
    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.sync': 'Sincronizar',
    'common.validate': 'Validar',
    'common.upload': 'Subir Archivos',
    
    // Products
    'products.title': 'Gestión de Productos',
    'products.sync': 'Sincronizar Productos',
    'products.codificacion': 'Codificación',
    'products.titular': 'Titular',
    'products.estado': 'Estado',
    'products.vencimiento': 'Vencimiento',
    
    // Clients
    'clients.title': 'Gestión de Clientes',
    'clients.sync': 'Sincronizar Clientes',
    'clients.cuit': 'CUIT',
    'clients.razonSocial': 'Razón Social',
    'clients.email': 'Correo Electrónico',
    
    // Configuration
    'config.title': 'Configuración del Sistema',
    'config.googleSheets': 'Google Sheets',
    'config.googleDrive': 'Google Drive',
    'config.storage': 'Almacenamiento',
    'config.productsSheetId': 'ID del Sheet de Productos',
    'config.clientsSheetId': 'ID del Sheet de Clientes',
    'config.res16Id': 'ID Resolución 16/2025',
    'config.res17Id': 'ID Resolución 17/2025',
    'config.djcTemplates': 'Plantillas DJC',
    'config.driveFolder': 'Carpeta de Google Drive',
    'config.certificatesBucket': 'Bucket de Certificados',
    'config.clientDocsBucket': 'Bucket de Documentos de Clientes',
    'config.qrsBucket': 'Bucket de Códigos QR',
    'config.criticalDays': 'Días Críticos para Vencimiento',
    
    // Validation
    'validation.title': 'Validación de Información',
    'validation.products': 'Productos',
    'validation.clients': 'Clientes',
    'validation.validateSync': 'Validar y Sincronizar',
    'validation.errors': 'Errores',
    'validation.warnings': 'Advertencias',
    'validation.success': 'Validaciones Exitosas',
    
    // Messages
    'messages.configSaved': 'Configuración guardada exitosamente',
    'messages.syncComplete': 'Sincronización completada',
    'messages.validationComplete': 'Validación completada',
    'messages.configRequired': 'Configure los parámetros requeridos antes de continuar',
  },
  en: {
    // Navigation
    'nav.products': 'Product Management',
    'nav.clients': 'Client Management',
    'nav.validation': 'Information Validation',
    'nav.config': 'Configuration',
    'nav.signOut': 'Sign Out',
    
    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.googleSignIn': 'Continue with Google',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sync': 'Sync',
    'common.validate': 'Validate',
    'common.upload': 'Upload Files',
    
    // Products
    'products.title': 'Product Management',
    'products.sync': 'Sync Products',
    'products.codificacion': 'Code',
    'products.titular': 'Holder',
    'products.estado': 'Status',
    'products.vencimiento': 'Expiration',
    
    // Clients
    'clients.title': 'Client Management',
    'clients.sync': 'Sync Clients',
    'clients.cuit': 'Tax ID',
    'clients.razonSocial': 'Company Name',
    'clients.email': 'Email',
    
    // Configuration
    'config.title': 'System Configuration',
    'config.googleSheets': 'Google Sheets',
    'config.googleDrive': 'Google Drive',
    'config.storage': 'Storage',
    'config.productsSheetId': 'Products Sheet ID',
    'config.clientsSheetId': 'Clients Sheet ID',
    'config.res16Id': 'Resolution 16/2025 ID',
    'config.res17Id': 'Resolution 17/2025 ID',
    'config.djcTemplates': 'DJC Templates',
    'config.driveFolder': 'Google Drive Folder',
    'config.certificatesBucket': 'Certificates Bucket',
    'config.clientDocsBucket': 'Client Documents Bucket',
    'config.qrsBucket': 'QR Codes Bucket',
    'config.criticalDays': 'Critical Days for Expiration',
    
    // Validation
    'validation.title': 'Information Validation',
    'validation.products': 'Products',
    'validation.clients': 'Clients',
    'validation.validateSync': 'Validate and Sync',
    'validation.errors': 'Errors',
    'validation.warnings': 'Warnings',
    'validation.success': 'Successful Validations',
    
    // Messages
    'messages.configSaved': 'Configuration saved successfully',
    'messages.syncComplete': 'Synchronization completed',
    'messages.validationComplete': 'Validation completed',
    'messages.configRequired': 'Please configure required parameters before continuing',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('es');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['es']] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};