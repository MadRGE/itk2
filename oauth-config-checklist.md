# Lista de Verificación - Configuración Google OAuth

## 1. Variables de Entorno (.env)

Verifica que tu archivo `.env` contenga:
```
VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui
```

**Importante:** 
- El Client ID debe ser exactamente el mismo que aparece en Google Cloud Console
- No debe tener espacios al inicio o final
- Debe empezar con números y terminar en `.apps.googleusercontent.com`

## 2. Google Cloud Console - Credenciales OAuth 2.0

### URI de Redirección Autorizadas
Verifica que estas URIs estén configuradas EXACTAMENTE así:
- `http://localhost:5173` (para desarrollo local)
- `http://localhost:3000` (si usas otro puerto)

### Obtener el Client ID correcto:
1. Ve a: https://console.cloud.google.com/apis/credentials
2. Busca tu "ID de cliente de OAuth 2.0"
3. Copia el "ID de cliente" (NO el "Secreto de cliente")

## 3. Pantalla de Consentimiento OAuth

### Ámbitos Requeridos:
- `../auth/userinfo.email`
- `../auth/userinfo.profile` 
- `../auth/spreadsheets.readonly`
- `../auth/drive.readonly`

### Estado de Publicación:
- Si está "En pruebas": Añadir tu email como "Usuario de prueba"
- Si está "En producción": Debe estar verificado por Google

## 4. APIs Habilitadas

Confirma que estas APIs estén habilitadas:
- ✅ Google Sheets API
- ✅ Google Drive API

## 5. Configuración del Código

La configuración actual en AuthContext.tsx:
- GOOGLE_REDIRECT_URI: `window.location.origin` (correcto)
- GOOGLE_SCOPES: Incluye todos los ámbitos necesarios (correcto)

## Pasos para Verificar:

1. **Verificar Client ID:**
   - Abre Google Cloud Console → APIs y servicios → Credenciales
   - Copia el Client ID de tu aplicación OAuth 2.0
   - Compáralo con el valor en tu archivo .env

2. **Verificar URIs de Redirección:**
   - En la misma página de credenciales, edita tu OAuth 2.0
   - Confirma que `http://localhost:5173` esté listado

3. **Verificar Ámbitos:**
   - Ve a Pantalla de consentimiento OAuth
   - Edita la aplicación → Sección "Ámbitos"
   - Confirma que los 4 ámbitos estén seleccionados

4. **Verificar Usuario de Prueba:**
   - En Pantalla de consentimiento OAuth
   - Sección "Usuarios de prueba"
   - Añade tu email si no está

5. **Limpiar Caché:**
   - Borra cookies y caché del navegador
   - O usa ventana incógnito para probar

## Errores Comunes:

- ❌ Client ID incorrecto o con espacios
- ❌ URI de redirección no coincide exactamente
- ❌ Ámbitos no seleccionados en la pantalla de consentimiento
- ❌ Usuario no añadido como "Usuario de prueba"
- ❌ APIs no habilitadas
- ❌ Caché del navegador interfiriendo

## Mensaje de Error Típico:
Si ves "conexión rechazada" o "access_denied", generalmente es por:
1. URI de redirección incorrecta
2. Ámbitos no configurados
3. Usuario no autorizado (en modo pruebas)