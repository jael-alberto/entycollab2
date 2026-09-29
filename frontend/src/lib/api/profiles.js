// ==========================================================================
// API · profiles — repository de perfiles (Fase 1: estructura, sin lógica)
// Reemplazo futuro de getUsers/saveUsers en `src/lib/store.js`.
// Hoy la fuente de verdad sigue siendo localStorage. No tocar store.js.
// ==========================================================================
import { requireSupabase } from './client.js';

// TODO(Fase 2): implementar contra tabla `profiles` cuando el esquema exista.
export async function getProfiles() {
  requireSupabase();
  throw new Error('getProfiles: no implementado (Fase 2).');
}

// TODO(Fase 2): implementar contra tabla `profiles` cuando el esquema exista.
export async function getProfileById(_id) {
  requireSupabase();
  throw new Error('getProfileById: no implementado (Fase 2).');
}

// TODO(Fase 2): implementar contra tabla `profiles` cuando el esquema exista.
export async function updateProfile(_id, _data) {
  requireSupabase();
  throw new Error('updateProfile: no implementado (Fase 2).');
}

// TODO(Fase 2): personas con available=true + filtros de People.jsx.
export async function searchAvailablePeople(_filters) {
  requireSupabase();
  throw new Error('searchAvailablePeople: no implementado (Fase 2).');
}
