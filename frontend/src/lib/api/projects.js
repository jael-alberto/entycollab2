// frontend/src/lib/api/projects.js
// API de proyectos - usa backend propio

import { api, handleApiError } from './client.js';

export async function listProjects(filters = {}, page = 1, pageSize = 20) {
  try {
    const params = { page, pageSize, ...filters };
    if (filters.tech) params.tech = filters.tech.join(',');
    const result = await api.projects.list(params);
    return result;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando proyectos'));
  }
}

export async function getProjectById(id) {
  try {
    const { project } = await api.projects.get(id);
    return project;
  } catch (error) {
    if (error.message.includes('404')) return null;
    throw new Error(handleApiError(error, 'Error cargando proyecto'));
  }
}

export async function createProject(data) {
  try {
    const { project } = await api.projects.create(data);
    return project;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error creando proyecto'));
  }
}

export async function updateProject(id, data) {
  try {
    const { project } = await api.projects.update(id, data);
    return project;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error actualizando proyecto'));
  }
}

export async function changeProjectStatus(projectId, newStatus) {
  try {
    const { project } = await api.projects.changeStatus(projectId, newStatus);
    return project;
  } catch (error) {
    if (error.message.includes('NO_PARTICIPANTS')) return 'noParticipants';
    throw new Error(handleApiError(error, 'Error cambiando estado'));
  }
}

export async function deleteProject(id) {
  try {
    await api.projects.delete(id);
    return true;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error eliminando proyecto'));
  }
}

export async function getUserProjects(userId) {
  try {
    const { projects } = await api.projects.userProjects(userId);
    return projects || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando proyectos del usuario'));
  }
}

export async function getFeaturedProjects(userId) {
  try {
    const { projects } = await api.projects.featured(userId);
    return projects || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando proyectos destacados'));
  }
}

export async function saveFeaturedProjects(userId, projectIds) {
  try {
    const { user } = await api.projects.saveFeatured(userId, projectIds);
    return user;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error guardando proyectos destacados'));
  }
}

export async function canRateUser(projectId, ratedId) {
  try {
    const { canRate } = await api.projects.canRate(projectId, ratedId);
    return canRate;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error verificando permisos'));
  }
}