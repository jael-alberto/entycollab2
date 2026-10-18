// frontend/src/lib/api/storage.js
// API de storage - usa backend propio

import { api, handleApiError } from './client.js';

export async function uploadAvatar(file) {
  try {
    const { url } = await api.storage.uploadAvatar(file);
    return url;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error subiendo avatar'));
  }
}

export async function deleteAvatar(path) {
  try {
    await api.storage.deleteAvatar(path);
    return true;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error eliminando avatar'));
  }
}

export async function uploadProjectImage(file, projectId) {
  try {
    const { url } = await api.storage.uploadProjectImage(file, projectId);
    return url;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error subiendo imagen de proyecto'));
  }
}

export async function deleteProjectImage(path) {
  try {
    await api.storage.deleteProjectImage(path);
    return true;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error eliminando imagen de proyecto'));
  }
}

export function getAvatarPublicUrl(userId, fileName) {
  // URL pública directa de Supabase Storage (el backend ya la devuelve)
  // Esta función se mantiene por compatibilidad pero no se usa con backend propio
  return null;
}

export function getProjectImagePublicUrl(projectId, fileName) {
  // URL pública directa de Supabase Storage
  return null;
}