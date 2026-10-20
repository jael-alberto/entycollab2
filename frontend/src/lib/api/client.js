// frontend/src/lib/api/client.js
// Cliente API para comunicarse con el backend propio

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
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
  // Auth
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
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
    apply: (projectId) => request('/applications/apply', { method: 'POST', body: JSON.stringify({ projectId }) }),
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
    projects: (id, params = {}) => request(`/groups/${id}/projects?${new URLSearchParams(params)}`),
    createProject: (id, data) => request(`/groups/${id}/projects`, { method: 'POST', body: JSON.stringify(data) })
  },
  
  // Storage
  storage: {
    uploadAvatar: async (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const token = localStorage.getItem('auth_token');
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
      const token = localStorage.getItem('auth_token');
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