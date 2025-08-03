import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  access_token?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getGoogleAccessToken: () => string | null;
  hasGoogleAccess: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configuración de Google OAuth
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = window.location.origin;
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile', 
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
].join(' ');

// Debug: Mostrar configuración en consola (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log('🔧 Google OAuth Config:', {
    clientId: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.slice(0, 20)}...` : 'NO CONFIGURADO',
    redirectUri: GOOGLE_REDIRECT_URI,
    scopes: GOOGLE_SCOPES.split(' ')
  });
}

declare global {
  interface Window {
    google: any;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Gestionar el estado de la sesión con Supabase
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase not configured');
      setLoading(false);
      return;
    }

    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
        } else if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          });
          setUserProfile({
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            provider: 'supabase',
            isSuperAdmin: true
          });
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      }
      setLoading(false);
    };

    getInitialSession();

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          });
          setUserProfile({
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            provider: 'supabase',
            isSuperAdmin: true
          });
        } else {
          setUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Verificar callback de Google OAuth al cargar
  useEffect(() => {
    // Verificar si estamos en el callback de Google OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state === 'google_oauth') {
      handleGoogleCallback(code);
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Verificar si hay usuario guardado (pero sin token válido)
    const savedUser = localStorage.getItem('google_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Solo restaurar si tiene access_token (aunque puede estar expirado)
        if (parsedUser.access_token) {
          setUser(parsedUser);
          setUserProfile({
            email: parsedUser.email,
            name: parsedUser.name,
            avatar: parsedUser.picture,
            provider: 'google',
            isSuperAdmin: true
          });
        } else {
          localStorage.removeItem('google_user');
        }
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('google_user');
      }
    }
  }, []);

  const handleGoogleCallback = async (code: string) => {
    try {
      // Intercambiar código por token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: '', // En producción necesitarías esto, pero para desarrollo podemos usar PKCE
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: GOOGLE_REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Error obteniendo token de acceso');
      }

      const tokenData = await tokenResponse.json();
      
      // Obtener información del usuario
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        
        const googleUser: User = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          access_token: tokenData.access_token
        };

        setUser(googleUser);
        setUserProfile({
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.picture,
          provider: 'google',
          isSuperAdmin: true
        });

        localStorage.setItem('google_user', JSON.stringify(googleUser));
      }
    } catch (error) {
      console.error('Error en callback de Google:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase no está configurado');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // El estado se actualizará automáticamente a través de onAuthStateChange
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase no está configurado');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // El estado se actualizará automáticamente a través de onAuthStateChange
  };

  const signInWithGoogle = async () => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID no está configurado en las variables de entorno');
    }

    try {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', GOOGLE_SCOPES);
      authUrl.searchParams.set('state', 'google_oauth');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      
      window.location.href = authUrl.toString();
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }

      // Revocar el access token si existe
      if (user?.access_token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${user.access_token}`, {
          method: 'POST'
        });
      }

      // El estado se limpiará automáticamente a través de onAuthStateChange
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getGoogleAccessToken = () => {
    return user?.access_token || null;
  };

  const hasGoogleAccess = () => {
    return !!user && !!user.access_token;
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    getGoogleAccessToken,
    hasGoogleAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};