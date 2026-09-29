// ==========================================================================
// API · helpers comunes (Fase 1: estructura, sin lógica)
// Patrón (skill backend-patterns): manejo de errores centralizado. Cada
// módulo de `api/` usa `requireSupabase()` antes de operar.
// ==========================================================================
import { getSupabaseClient, isSupabaseConfigured } from '../supabaseClient.js';

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase no configurado. Completa .env (ver .env.example). Fase 1: estructura solamente.');
  }
}

export function requireSupabase() {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured() || !client) throw new SupabaseNotConfiguredError();
  return client;
}
