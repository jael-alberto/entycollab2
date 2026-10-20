// frontend/src/lib/api/groups.js
// API de grupos - usa backend propio

import { api, handleApiError } from './client.js';

export async function listGroups(filters = {}, page = 1, pageSize = 20) {
  try {
    const params = { page, pageSize, ...filters };
    const result = await api.groups.list(params);
    return result;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando grupos'));
  }
}

export async function getUserGroups() {
  try {
    const { groups } = await api.groups.myGroups();
    return groups || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando tus grupos'));
  }
}

export async function getGroupById(id) {
  try {
    const { group } = await api.groups.get(id);
    return group;
  } catch (error) {
    if (error.message.includes('404')) return null;
    throw new Error(handleApiError(error, 'Error cargando grupo'));
  }
}

export async function createGroup(data) {
  try {
    const { group } = await api.groups.create(data);
    return group;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error creando grupo'));
  }
}

export async function updateGroup(id, data) {
  try {
    const { group } = await api.groups.update(id, data);
    return group;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error actualizando grupo'));
  }
}

export async function deleteGroup(id) {
  try {
    await api.groups.delete(id);
    return true;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error eliminando grupo'));
  }
}

export async function getGroupMembers(id) {
  try {
    const { members } = await api.groups.members(id);
    return members || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando miembros'));
  }
}

export async function setGroupMemberRole(groupId, memberId, role) {
  try {
    const { member } = await api.groups.setMemberRole(groupId, memberId, role);
    return member;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cambiando rol'));
  }
}

export async function removeGroupMember(groupId, memberId) {
  try {
    await api.groups.removeMember(groupId, memberId);
    return true;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error eliminando miembro'));
  }
}

export async function requestToJoinGroup(groupId) {
  try {
    const { request } = await api.groups.join(groupId);
    return request;
  } catch (error) {
    if (error.message.includes('CONFLICT') || error.message.includes('Ya eres miembro')) {
      throw new Error('member');
    }
    if (error.message.includes('pending')) {
      throw new Error('pending');
    }
    throw new Error(handleApiError(error, 'Error solicitando ingreso'));
  }
}

export async function decideGroupRequest(groupId, requestId, accepted) {
  try {
    const { request } = await api.groups.decideRequest(groupId, requestId, accepted);
    return request;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error decidiendo solicitud'));
  }
}

export async function getGroupRequests(groupId) {
  try {
    const { requests } = await api.groups.requests(groupId);
    return requests || [];
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando solicitudes'));
  }
}

export async function listGroupProjects(groupId, filters = {}, page = 1, pageSize = 20) {
  try {
    const params = { page, pageSize, ...filters };
    const result = await api.groups.projects(groupId, params);
    return result;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error cargando proyectos del grupo'));
  }
}

export async function createGroupProject(groupId, data) {
  try {
    const { project } = await api.groups.createProject(groupId, data);
    return project;
  } catch (error) {
    throw new Error(handleApiError(error, 'Error creando proyecto en grupo'));
  }
}