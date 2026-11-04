// frontend/src/lib/supabaseClient.js
// Cliente de Supabase para el frontend (utiliza la Anon/Publishable Key)
import { createClient } from '@supabase/supabase-js';

// Admite tanto variables con prefijo VITE_ (estándar de Vite) como SUPABASE_
export const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  ''
).trim();

export const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Valida si las credenciales de Supabase están configuradas con valores válidos (no placeholders).
 */
export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('tu-proyecto') &&
    !SUPABASE_ANON_KEY.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
  );
}

// Instancia única del cliente Supabase para el navegador
export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function getSupabaseClient() {
  return supabase;
}

// Helper para renovar token usando refresh_token
export async function refreshAuthToken() {
  if (!_refreshToken) return false;
  
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: _refreshToken })
    });
    
    if (!response.ok) {
      clearAuthTokens();
      return false;
    }
    
    const { session } = await response.json();
    if (session?.access_token && session?.refresh_token) {
      setAuthTokens(session.access_token, session.refresh_token);
      return true;
    }
    
    clearAuthTokens();
    return false;
  } catch {
    clearAuthTokens();
    return false;
  }
}