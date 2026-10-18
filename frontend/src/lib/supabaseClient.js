// frontend/src/lib/supabaseClient.js
// Cliente Supabase - ahora solo para gestión de auth tokens
// La capa de datos usa el backend propio (src/lib/api/client.js)

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let _authToken = null;
let _refreshToken = null;

// Inicializar tokens desde localStorage
export function initAuthTokens() {
  _authToken = localStorage.getItem('auth_token');
  _refreshToken = localStorage.getItem('refresh_token');
}

export function getAuthToken() {
  return _authToken;
}

export function getRefreshToken() {
  return _refreshToken;
}

export function setAuthTokens(authToken, refreshToken) {
  _authToken = authToken;
  _refreshToken = refreshToken;
  if (authToken) localStorage.setItem('auth_token', authToken);
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
}

export function clearAuthTokens() {
  _authToken = null;
  _refreshToken = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
}

export function isSupabaseConfigured() {
  return USE_SUPABASE && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

// Función legacy para compatibilidad - ahora usa backend
export function getSupabaseClient() {
  console.warn('getSupabaseClient() está deprecado. Usa la capa API en src/lib/api/');
  return null;
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