// frontend/src/lib/api/client.js
// Cliente API para comunicarse con el backend propio

import { getAuthToken, getRefreshToken, setAuthTokens, clearAuthTokens } from '../authToken.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 8000;

// En despliegues (Vercel) el fallback a localhost rompe la app en silencio.
// Avisa para que sea evidente que falta configurar VITE_API_URL.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error(
    '[api] VITE_API_URL no está definida en este build. ' +
    'Las peticiones irán a http://localhost:3001/api y fallarán. ' +
    'Configura VITE_API_URL con la URL pública del backend.'
  );
}

class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshPromise = null;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('La solicitud tardó demasiado. Verifica que el servidor esté activo.', 408, 'REQUEST_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = fetchWithTimeout(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    })
      .then(async (response) => {
        if (!response.ok) {
          clearAuthTokens();
          return false;
        }
        const data = await response.json().catch(() => ({}));
        if (data.session?.access_token) {
          setAuthTokens(data.session.access_token, data.session.refresh_token);
          return true;
        }
        clearAuthTokens();
        return false;
      })
      .catch(() => {
        clearAuthTokens();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function request(endpoint, options = {}, retry = true) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshSession();
    if (refreshed) return request(endpoint, options, false);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.message || 'Error en la petición',
      response.status,
      data.error,
      data.details
    );
  }

  return data;
}

export const api = {
  // Carga inicial
  bootstrap: {
    get: () => request('/bootstrap')
  },

  // Auth
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
    updatePassword: (data) => request('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
    ensureProfile: (data) => request('/auth/ensure-profile', { method: 'POST', body: JSON.stringify(data) }),
    refresh: (refreshToken) => request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) })
  },
  
  // Profiles
  profiles: {
    list: (params = {}) => request(`/profiles?${new URLSearchParams(params)}`),
    search: (q, limit = 20) => request(`/profiles/search?q=${encodeURIComponent(q)}&limit=${limit}`),
    available: (filters = {}) => request(`/profiles/available?${new URLSearchParams(filters)}`),
    get: (id) => request(`/profiles/${id}`),
    byUsername: (username) => request(`/profiles/by-username/${username}`),
    update: (id, data) => request(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleAvailability: (id) => request(`/profiles/${id}/availability`, { method: 'PUT' }),
    saveFeatured: (id, projectIds) => request(`/profiles/${id}/featured`, { method: 'PUT', body: JSON.stringify({ projectIds }) }),
    stats: (id) => request(`/profiles/${id}/stats`),
    history: (id) => request(`/profiles/${id}/history`),
    ratings: (id) => request(`/profiles/${id}/ratings`)
  },
  
  // Projects
  projects: {
    list: (params = {}) => request(`/projects?${new URLSearchParams(params)}`),
    get: (id) => request(`/projects/${id}`),
    create: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    changeStatus: (id, status) => request(`/projects/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
    userProjects: (userId) => request(`/projects/user/${userId}`),
    featured: (userId) => request(`/projects/user/${userId}/featured`),
    saveFeatured: (userId, projectIds) => request(`/projects/user/${userId}/featured`, { method: 'PUT', body: JSON.stringify({ projectIds }) }),
    canRate: (projectId, ratedId) => request(`/projects/${projectId}/can-rate/${ratedId}`)
  },
  
  // Applications
  applications: {
    apply: (projectId, message = '') => request('/applications/apply', { method: 'POST', body: JSON.stringify({ projectId, message }) }),
    invite: (data) => request('/applications/invite', { method: 'POST', body: JSON.stringify(data) }),
    handle: (id, data) => request(`/applications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    respond: (id, action) => request(`/applications/${id}/respond`, { method: 'PUT', body: JSON.stringify({ action }) }),
    myApplications: () => request('/applications/user'),
    projectApplications: (projectId) => request(`/applications/project/${projectId}`),
    pendingInvites: () => request('/applications/invites/pending'),
    check: (projectId) => request(`/applications/check/${projectId}`),
    accepted: (projectId) => request(`/applications/project/${projectId}/accepted`)
  },
  
  // Ratings
  ratings: {
    save: (projectId, ratings) => request(`/ratings/project/${projectId}`, { method: 'POST', body: JSON.stringify({ ratings }) }),
    projectRatings: (projectId) => request(`/ratings/project/${projectId}`),
    userReceived: (userId) => request(`/ratings/user/${userId}/received`),
    userGiven: (userId) => request(`/ratings/user/${userId}/given`),
    userAverage: (userId) => request(`/ratings/user/${userId}/average`),
    userCount: (userId) => request(`/ratings/user/${userId}/count`),
    userDistribution: (userId) => request(`/ratings/user/${userId}/distribution`),
    userProjectRating: (projectId, userId) => request(`/ratings/project/${projectId}/user/${userId}`),
    canRate: (projectId, ratedId) => request(`/ratings/project/${projectId}/can-rate/${ratedId}`)
  },
  
  // Groups
  groups: {
    list: (params = {}) => request(`/groups?${new URLSearchParams(params)}`),
    myGroups: () => request('/groups/user'),
    get: (id) => request(`/groups/${id}`),
    create: (data) => request('/groups', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
    members: (id) => request(`/groups/${id}/members`),
    setMemberRole: (id, memberId, role) => request(`/groups/${id}/members/${memberId}`, { method: 'PUT', body: JSON.stringify({ role }) }),
    removeMember: (id, memberId) => request(`/groups/${id}/members/${memberId}`, { method: 'DELETE' }),
    join: (id) => request(`/groups/${id}/join`, { method: 'POST' }),
    decideRequest: (id, requestId, accepted) => request(`/groups/${id}/requests/${requestId}`, { method: 'PUT', body: JSON.stringify({ accepted }) }),
    requests: (id) => request(`/groups/${id}/requests`),
    myRequest: (id) => request(`/groups/${id}/my-request`),
    projects: (id, params = {}) => request(`/groups/${id}/projects?${new URLSearchParams(params)}`),
    createProject: (id, data) => request(`/groups/${id}/projects`, { method: 'POST', body: JSON.stringify(data) })
  },
  
  // Storage
  storage: {
    uploadAvatar: async (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/storage/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      return response.json();
    },
    deleteAvatar: (path) => request('/storage/avatar', { method: 'DELETE', body: JSON.stringify({ path }) }),
    uploadProjectImage: async (file, projectId) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('projectId', projectId);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/storage/project-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      return response.json();
    },
    deleteProjectImage: (path) => request('/storage/project-image', { method: 'DELETE', body: JSON.stringify({ path }) })
  }
};

// Helper para manejar errores de forma consistente
export function handleApiError(error, fallbackMessage = 'Error inesperado') {
  console.error('[API Error]', error);
  
  if (error instanceof ApiError) {
    return error.message;
  }
  
  return fallbackMessage;
}

export { ApiError };
