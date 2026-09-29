// ==========================================================================
// API · applications — postulaciones e invitaciones (Fase 1: estructura)
// Reemplazo futuro de getApplications/saveApplications en `src/lib/store.js`.
// Hoy la fuente de verdad sigue siendo localStorage. No tocar store.js.
// ==========================================================================
import { requireSupabase } from './client.js';

// TODO(Fase 2): respetar regla applyToProject (sin duplicados, minRating).
export async function applyToProject(_projectId) {
  requireSupabase();
  throw new Error('applyToProject: no implementado (Fase 2).');
}

// TODO(Fase 2): respetar regla sendInvite (owner invita, sin duplicados).
export async function sendInvite(_projectId, _targetUserId, _message) {
  requireSupabase();
  throw new Error('sendInvite: no implementado (Fase 2).');
}

// TODO(Fase 2): owner acepta/rechaza; respetar cupos (slots).
export async function handleApplication(_appId, _newStatus) {
  requireSupabase();
  throw new Error('handleApplication: no implementado (Fase 2).');
}

// TODO(Fase 2): el invitado acepta/rechaza su invitación.
export async function respondInvite(_appId, _action) {
  requireSupabase();
  throw new Error('respondInvite: no implementado (Fase 2).');
}
