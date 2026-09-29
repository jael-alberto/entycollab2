// ==========================================================================
// SUPABASE CLIENT — único punto de conexión (Fase 1: estructura, sin conexión)
// Patrón (skill backend-patterns): un solo módulo crea el cliente y la capa
// `src/lib/api/` lo consume (repository pattern, un archivo por entidad).
// ==========================================================================
// TODO(Fase 2): instalar `@supabase/supabase-js` y crear el cliente real con
// createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Intencionalmente
// NO se importa el paquete aquí para no romper el build sin la dependencia.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

export function isSupabaseConfigured() {
  return USE_SUPABASE && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

// TODO(Fase 2): retornar el cliente real. Hoy retorna null a propósito.
export function getSupabaseClient() {
  return null;
}
