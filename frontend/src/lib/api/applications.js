// frontend/src/lib/api/applications.js
// API de postulaciones e invitaciones - usa backend propio

import { api, handleApiError } from './client.js';

export async function applyToProject(projectId, message = '') {
  try {
    const { application } = await api.applications.apply(projectId, message);
    return application;
  } catch (error) {
    if (error.code === 'CONFLICT' || /ya te has postulado/i.test(error.message)) {
      return 'alreadyApplied';
    }
    if (error.code === 'MIN_RATING_REQUIRED') {
      return 'minRating';
    }
    if (error.code === 'OWN_PROJECT') {
      return 'ownProject';
    }
    if (error.code === 'PROJECT_NOT_OPEN') {
      return 'projectNotOpen';
    }
    if (error.code === 'SLOTS_FULL') {
      return 'slotsFull';
    }
    throw new Error(handleApiError(error, 'Error en la postulación'));
  }
}

export async function sendInvite(projectId, targetUserId, message) {
  try {
    const { application } = await api.applications.invite({ projectId, targetUserId, message });
    return application;
  } catch (error) {
    if (error.code === 'CONFLICT' || /ya está postulada|ya te has postulado|invitado/i.test(error.message)) {
      return 'already';
    }
    if (error.code === 'SLOTS_FULL') {
      return 'slotsFull';
    }
    if (error.code === 'FORBIDDEN') {
      return 'forbidden';
    }
    if (error.code === 'OWN_PROJECT') {
      return 'ownProject';
    }
    if (error.code === 'PROJECT_NOT_OPEN') {
      return 'projectNotOpen';
    }
    throw new Error(handleApiError(error, 'Error enviando invitación'));
  }
}

export async function handleApplication(appId, newStatus, projectId, projectRole) {
  try {
    const { application } = await api.applications.handle(appId, { status: newStatus, projectRole });
    return application;
  } catch (error) {
    if (error.code === 'SLOTS_FULL') {
      return 'slotsFull';
    }
    if (error.code === 'INVALID_STATUS_TRANSITION') {
      return 'invalidStatus';
    }
    if (error.code === 'PROJECT_CLOSED') {
      return 'projectClosed';
    }
    throw new Error(handleApiError(error, 'Error gestionando postulación'));
  }
}

export async function respondInvite(appId, action) {
  try {
    const { application } = await api.applications.respond(appId, action);
    return application;
  } catch (error) {
    if (error.code === 'SLOTS_FULL') {
      return 'slotsFull';
    }
    if (error.code === 'ALREADY_RESPONDED') {
      return 'alreadyResponded';
    }
    if (error.code === 'NOT_INVITE') {
      return 'notInvite';
    }
    if (error.code === 'PROJECT_CLOSED') {
      return 'projectClosed';
    }
    throw new Error(handleApiError(error, 'Error respondiendo invitación'));
  }
}

export async function getUserApplications(userId) {
  try {
    const { applications } = await api.applications.myApplications();
    return applications || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando postulaciones'));
  }
}

export async function getProjectApplications(projectId) {
  try {
    const { applications } = await api.applications.projectApplications(projectId);
    return applications || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando postulaciones del proyecto'));
  }
}

export async function getPendingInvites(userId) {
  try {
    const { invitations } = await api.applications.pendingInvites();
    return invitations || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando invitaciones'));
  }
}

export async function hasUserApplied(projectId, userId) {
  try {
    const { application } = await api.applications.check(projectId);
    return application;
  } catch (error) {
    return null;
  }
}

export async function getAcceptedApplications(projectId) {
  try {
    const { participants } = await api.applications.accepted(projectId);
    return participants || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando participantes'));
  }
}

export async function countAcceptedApplications(projectId) {
  try {
    const { participants } = await api.applications.accepted(projectId);
    return participants?.length || 0;
  } catch (error) {
    return 0;
  }
}