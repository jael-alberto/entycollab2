// ==========================================================================
// API · ratings — repository de calificaciones (Fase 1: estructura, sin lógica)
// Reemplazo futuro de getRatings/saveRatingsData en `src/lib/store.js`.
// Hoy la fuente de verdad sigue siendo localStorage. No tocar store.js.
// ==========================================================================
import { requireSupabase } from './client.js';

// TODO(Fase 2): upsert por (projectId, ratedUserId, ratedBy), como hoy en AppContext.
export async function saveRatings(_projectId, _ratingMap) {
  requireSupabase();
  throw new Error('saveRatings: no implementado (Fase 2).');
}

// TODO(Fase 2): promedio por usuario (ver getUserAvgRating en helpers.js).
export async function getUserAvgRating(_userId) {
  requireSupabase();
  throw new Error('getUserAvgRating: no implementado (Fase 2).');
}
