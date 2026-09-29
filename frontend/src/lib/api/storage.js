// ==========================================================================
// API · storage — subida de imágenes (Fase 1: estructura, sin lógica)
// Reemplazo futuro de fileToDataURL (dataURL en localStorage) por buckets
// de Supabase Storage: `avatars` y `project-images`.
// ==========================================================================
import { requireSupabase } from './client.js';

// TODO(Fase 3): subir a bucket `avatars`, retornar URL pública.
export async function uploadAvatar(_file) {
  requireSupabase();
  throw new Error('uploadAvatar: no implementado (Fase 3).');
}

// TODO(Fase 3): subir a bucket `project-images`, retornar URL pública.
export async function uploadProjectImage(_file) {
  requireSupabase();
  throw new Error('uploadProjectImage: no implementado (Fase 3).');
}
