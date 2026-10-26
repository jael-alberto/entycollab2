// backend/src/config/supabase.js
// Cliente Supabase para backend (usa Service Role Key - bypass RLS)

import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Cliente con Service Role Key - acceso completo (bypass RLS)
// Úsalo SOLO en backend, NUNCA en frontend
export const supabaseAdmin = createClient(
  env.supabase.url,
  env.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Cliente con Anon Key - respeta RLS
// Úsalo cuando necesites validar permisos del usuario autenticado
export function createSupabaseClient(userToken) {
  return createClient(
    env.supabase.url,
    env.supabase.anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Helper para verificar token JWT de Supabase Auth
export async function verifyAuthToken(token) {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}