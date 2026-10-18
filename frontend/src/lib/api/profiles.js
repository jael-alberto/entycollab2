// frontend/src/lib/api/profiles.js
// API de perfiles - usa backend propio

import { api, handleApiError } from './client.js';

export async function getProfiles() {
  try {
    const { data } = await api.profiles.list();
    return data || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando perfiles'));
  }
}

export async function getProfileById(id) {
  try {
    const { user } = await api.profiles.get(id);
    return user;
  } catch (error) {
    if (error.message.includes('404')) return null;
    throw new Error(handleApiError(error, 'Error cargando perfil'));
  }
}

export async function getProfileByUsername(username) {
  try {
    const { user } = await api.profiles.byUsername(username);
    return user;
  } catch (error) {
    if (error.message.includes('404')) return null;
    throw new Error(handleApiError(error, 'Error cargando perfil'));
  }
}

export async function updateProfile(id, data) {
  try {
    const { user } = await api.profiles.update(id, data);
    return user;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error actualizando perfil'));
  }
}

export async function searchAvailablePeople(filters = {}) {
  try {
    const { data } = await api.profiles.available(filters);
    return data || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error buscando personas'));
  }
}

export async function getProfilesByIds(ids) {
  if (!ids?.length) return [];
  try {
    // El backend no tiene endpoint batch, hacemos peticiones individuales
    // En producción se podría añadir endpoint /profiles/batch
    const profiles = await Promise.all(ids.map(id => getProfileById(id)));
    return profiles.filter(Boolean);
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando perfiles'));
  }
}

export async function searchProfiles(query, limit = 20) {
  try {
    const { data } = await api.profiles.search(query, limit);
    return data || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error buscando perfiles'));
  }
}

export async function isUsernameAvailable(username, excludeId = null) {
  try {
    const profile = await getProfileByUsername(username);
    return !profile || (excludeId && profile.id === excludeId);
  } catch {
    return false;
  }
}

export async function isEmailAvailable(email, excludeId = null) {
  try {
    // No hay endpoint directo, usar search
    const profiles = await searchProfiles(email);
    return !profiles.some(p => p.email === email && p.id !== excludeId);
  } catch {
    return false;
  }
}

export async function toggleAvailability(userId) {
  try {
    const { user, available } = await api.profiles.toggleAvailability(userId);
    return { user, available };
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cambiando disponibilidad'));
  }
}

export async function saveFeaturedProjects(userId, projectIds) {
  try {
    const { user } = await api.profiles.saveFeatured(userId, projectIds);
    return user;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error guardando proyectos destacados'));
  }
}

export async function getUserStats(userId) {
  try {
    const { stats } = await api.profiles.stats(userId);
    return stats;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando estadísticas'));
  }
}

export async function getUserHistory(userId) {
  try {
    const { history } = await api.profiles.history(userId);
    return history || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando historial'));
  }
}

export async function getUserRatings(userId) {
  try {
    const { ratings } = await api.profiles.ratings(userId);
    return ratings || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando calificaciones'));
  }
}