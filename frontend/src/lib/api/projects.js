// ==========================================================================
// API · projects — repository de proyectos (Fase 1: estructura, sin lógica)
// Reemplazo futuro de getProjects/saveProjects en `src/lib/store.js`.
// Hoy la fuente de verdad sigue siendo localStorage. No tocar store.js.
// ==========================================================================
import { requireSupabase } from './client.js';

// TODO(Fase 2): implementar contra tabla `projects` cuando el esquema exista.
export async function listProjects(_filters) {
  requireSupabase();
  throw new Error('listProjects: no implementado (Fase 2).');
}

// TODO(Fase 2): implementar contra tabla `projects` cuando el esquema exista.
export async function getProjectById(_id) {
  requireSupabase();
  throw new Error('getProjectById: no implementado (Fase 2).');
}

// TODO(Fase 2): implementar contra tabla `projects` cuando el esquema exista.
export async function createProject(_data) {
  requireSupabase();
  throw new Error('createProject: no implementado (Fase 2).');
}

// TODO(Fase 2): respetar regla changeProjectStatus (completed exige aceptados).
export async function changeProjectStatus(_projectId, _newStatus) {
  requireSupabase();
  throw new Error('changeProjectStatus: no implementado (Fase 2).');
}
