// frontend/src/lib/api/applications.js
// API de postulaciones e invitaciones - usa backend propio

import { api, handleApiError } from './client.js';

export async function applyToProject(projectId) {
  try {
    const { application } = await api.applications.apply(projectId);
    return application;
  } catch (error) {
    if (error.message.includes('ALREADY_APPLIED') || error.message.includes('ya te has postulado')) {
      return 'alreadyApplied';
    }
    if (error.message.includes('MIN_RATING_REQUIRED')) {
      return 'minRating';
    }
    if (error.message.includes('OWN_PROJECT')) {
      return 'ownProject';
    }
    if (error.message.includes('PROJECT_NOT_OPEN')) {
      return 'projectNotOpen';
    }
    throw new Error(handleApiError(error, 'Error en la postulación'));
  }
}

export async function sendInvite(projectId, targetUserId, message) {
  try {
    const { application } = await api.applications.invite({ projectId, targetUserId, message });
    return application;
  } catch (error) {
    if (error.message.includes('CONFLICT') || error.message.includes('ya está postulada')) {
      return 'already';
    }
    if (error.message.includes('SLOTS_FULL') || error.message.includes('No hay cupos')) {
      return 'slotsFull';
    }
    if (error.message.includes('FORBIDDEN') || error.message.includes('Solo el owner')) {
      return 'forbidden';
    }
    throw new Error(handleApiError(error, 'Error enviando invitación'));
  }
}

export async function handleApplication(appId, newStatus, projectId, projectRole) {
  try {
    const { application } = await api.applications.handle(appId, { status: newStatus, projectRole });
    return application;
  } catch (error) {
    if (error.message.includes('SLOTS_FULL') || error.message.includes('No hay cupos')) {
      return 'slotsFull';
    }
    if (error.message.includes('INVALID_STATUS_TRANSITION')) {
      return 'invalidStatus';
    }
    throw new Error(handleApiError(error, 'Error gestionando postulación'));
  }
}

export async function respondInvite(appId, action) {
  try {
    const { application } = await api.applications.respond(appId, action);
    return application;
  } catch (error) {
    if (error.message.includes('SLOTS_FULL') || error.message.includes('No hay cupos')) {
      return 'slotsFull';
    }
    if (error.message.includes('ALREADY_RESPONDED')) {
      return 'alreadyResponded';
    }
    if (error.message.includes('NOT_INVITE')) {
      return 'notInvite';
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