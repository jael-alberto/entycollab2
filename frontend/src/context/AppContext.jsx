import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api/client.js';
import {
  createGroup as createGroupApi,
  updateGroup as updateGroupApi,
  deleteGroup as deleteGroupApi,
  removeGroupMember as removeGroupMemberApi,
  setGroupMemberRole as setGroupMemberRoleApi,
  requestToJoinGroup as requestToJoinGroupApi,
  decideGroupRequest as decideGroupRequestApi
} from '../lib/api/groups.js';
import { createProject as createProjectApi, changeProjectStatus as changeProjectStatusApi } from '../lib/api/projects.js';
import {
  applyToProject as applyToProjectApi,
  sendInvite as sendInviteApi,
  handleApplication as handleApplicationApi,
  respondInvite as respondInviteApi
} from '../lib/api/applications.js';
import { saveRatings as saveRatingsApi } from '../lib/api/ratings.js';
import {
  getActiveGroupId, setActiveGroupId,
  getTheme, setTheme as storeSetTheme,
  getLang, setLang as storeSetLang
} from '../lib/preferences.js';
import { getAuthToken, setAuthTokens, clearAuthTokens } from '../lib/authToken.js';
import { t as i18nT, l10nValue } from '../lib/i18n.js';
import { userCategories } from '../lib/helpers.js';

const AppContext = createContext(null);

// ============================================================================
// NORMALIZACIÓN: respuesta del backend -> modelo que usan las pantallas
// El backend ya devuelve alias camelCase, pero completamos defaults para que
// las vistas puedan asumir arrays/booleanos sin comprobaciones defensivas.
// ============================================================================

function toLocalized(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const text = String(value ?? '');
  return { es: text, en: text };
}

function profileFromApi(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name || '',
    username: profile.username || '',
    email: profile.email || '',
    avatar: profile.avatar || '',
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    categories: Array.isArray(profile.categories) ? profile.categories : [],
    bio: profile.bio ?? '',
    githubUrl: profile.githubUrl ?? profile.github_url ?? '',
    portfolioUrl: profile.portfolioUrl ?? profile.portfolio_url ?? '',
    available: Boolean(profile.available),
    featuredProjectIds: profile.featuredProjectIds ?? profile.featured_project_ids ?? [],
    gameTypes: profile.gameTypes ?? profile.game_types ?? [],
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    favoriteGenres: profile.favoriteGenres ?? profile.favorite_genres ?? [],
    disciplines: Array.isArray(profile.disciplines) ? profile.disciplines : [],
    createdAt: profile.createdAt ?? profile.created_at ?? null
  };
}

function projectFromApi(project) {
  if (!project) return null;
  return {
    ...project,
    ownerId: project.ownerId ?? project.owner_id ?? null,
    groupId: project.groupId ?? project.group_id ?? null,
    minRating: project.minRating ?? project.min_rating ?? 0,
    createdAt: project.createdAt ?? project.created_at ?? null,
    tech: Array.isArray(project.tech) ? project.tech : [],
    roles: Array.isArray(project.roles) ? project.roles : []
  };
}

function groupFromApi(group) {
  if (!group) return null;
  return {
    ...group,
    ownerId: group.ownerId ?? group.owner_id ?? null,
    isPrivate: Boolean(group.isPrivate ?? group.is_private),
    createdAt: group.createdAt ?? group.created_at ?? null,
    members: Array.isArray(group.members)
      ? group.members
        .map(member => ({
          ...member,
          userId: member.userId ?? member.user_id ?? null,
          joinedAt: member.joinedAt ?? member.joined_at ?? null
        }))
        .filter(member => member.userId)
      : [],
    requests: Array.isArray(group.requests)
      ? group.requests.map(request => ({
        ...request,
        userId: request.userId ?? request.user_id ?? null,
        requestedAt: request.requestedAt ?? request.requested_at ?? null
      }))
      : []
  };
}

function applicationFromApi(application) {
  if (!application) return null;
  return {
    ...application,
    projectId: application.projectId ?? application.project_id ?? null,
    userId: application.userId ?? application.user_id ?? null,
    projectRole: application.projectRole ?? application.project_role ?? '',
    invitedBy: application.invitedBy ?? application.invited_by ?? null,
    appliedAt: application.appliedAt ?? application.applied_at ?? null,
    pitch: application.pitch ?? application.message ?? ''
  };
}

function ratingFromApi(rating) {
  if (!rating) return null;
  return {
    ...rating,
    projectId: rating.projectId ?? rating.project_id ?? null,
    ratedUserId: rating.ratedUserId ?? rating.rated_user_id ?? null,
    ratedBy: rating.ratedBy ?? rating.rated_by ?? null,
    stars: Number(rating.stars) || 0,
    createdAt: rating.createdAt ?? rating.created_at ?? null,
    updatedAt: rating.updatedAt ?? rating.updated_at ?? null
  };
}

function errorMessage(error, fallback) {
  if (!error) return fallback;
  return error.message || fallback;
}

// Distingue "no hay servidor con quien hablar" de "los datos estan mal".
// `fetch` falla con TypeError cuando la API no responde (caida, DNS, CORS), y
// el cliente convierte un 404 o un 5xx en ApiError con `status`. Ninguno de los
// dos casos se arregla corrigiendo el formulario, asi que no deben compartir
// mensaje.
function isApiUnreachable(error) {
  if (!error) return false;
  if (error instanceof TypeError) return true;
  if (typeof error.status !== 'number') return false;
  return error.status === 404 || error.status >= 500;
}

export function AppProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeGroupId, setActiveGroupIdState] = useState(() => getActiveGroupId());
  const [lang, setLangState] = useState(() => getLang());
  const [theme, setThemeState] = useState(() => getTheme());
  const [menuOpen, setMenuOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTechFilters, setSelectedTechFilters] = useState([]);

  const user = useMemo(
    () => users.find(u => u.id === userId) || currentUser || null,
    [users, userId, currentUser]
  );
  const activeGroup = groups.find(g => g.id === activeGroupId) || null;
  const activeMembership = activeGroup?.members?.find(m => m.userId === userId) || null;
  const isActiveGroupAdmin = activeMembership?.role === 'owner' || activeMembership?.role === 'admin';

  // ========================================================================
  // DATOS
  // ========================================================================
  const loadData = useCallback(async () => {
    const data = await api.bootstrap.get();
    const normalized = {
      users: (data.profiles || []).map(profileFromApi).filter(Boolean),
      projects: (data.projects || []).map(projectFromApi).filter(Boolean),
      applications: (data.applications || []).map(applicationFromApi).filter(Boolean),
      ratings: (data.ratings || []).map(ratingFromApi).filter(Boolean),
      groups: (data.groups || []).map(groupFromApi).filter(Boolean)
    };

    setUsers(normalized.users);
    setProjects(normalized.projects);
    setApplications(normalized.applications);
    setRatings(normalized.ratings);
    setGroups(normalized.groups);
    return normalized;
  }, []);

  const refresh = useCallback(async () => {
    try {
      await loadData();
    } catch (error) {
      console.error('[AppContext] No se pudieron recargar los datos:', error);
    }
  }, [loadData]);

  const replaceUser = useCallback((rawProfile) => {
    const updated = profileFromApi(rawProfile);
    if (!updated) return null;
    setUsers(prev => {
      const exists = prev.some(item => item.id === updated.id);
      return exists
        ? prev.map(item => (item.id === updated.id ? { ...item, ...updated } : item))
        : [updated, ...prev];
    });
    setCurrentUser(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    return updated;
  }, []);

  // Restaurar sesión + carga inicial. Se hace una sola vez al montar.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let restoredUser = null;

      if (getAuthToken()) {
        try {
          const { user: me } = await api.auth.me();
          restoredUser = profileFromApi(me);
        } catch {
          // Token caducado o inválido: seguimos como visitante.
          clearAuthTokens();
        }
      }

      if (cancelled) return;

      if (restoredUser) {
        setCurrentUser(restoredUser);
        setUserId(restoredUser.id);
      }

      try {
        await loadData();
      } catch (error) {
        console.error('[AppContext] No se pudo cargar el bootstrap:', error);
      }

      if (!cancelled) setAuthReady(true);
    })();

    return () => { cancelled = true; };
  }, [loadData]);

  // Si el grupo activo deja de existir o de ser visible, lo limpiamos.
  useEffect(() => {
    if (!authReady || !activeGroupId) return;
    if (!groups.some(group => group.id === activeGroupId)) {
      setActiveGroupId(null);
      setActiveGroupIdState(null);
    }
  }, [authReady, activeGroupId, groups]);

  // ========================================================================
  // I18N / THEME
  // ========================================================================
  const t = useCallback((key, replacements) => i18nT(lang, key, replacements), [lang]);
  const l10n = useCallback((value) => l10nValue(lang, value), [lang]);

  const toggleLang = useCallback(() => {
    const next = lang === 'es' ? 'en' : 'es';
    storeSetLang(next);
    setLangState(next);
  }, [lang]);

  const toggleTheme = useCallback(() => {
    const next = !getTheme();
    storeSetTheme(next);
    setThemeState(next);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme);
    document.documentElement.classList.toggle('light', !theme);
  }, [theme]);

  // ========================================================================
  // AUTH
  // ========================================================================
  const login = useCallback(async (identifier, password) => {
    const cleanIdentifier = String(identifier || '').trim().toLowerCase().replace(/^@/, '');

    try {
      const data = await api.auth.login({ identifier: cleanIdentifier, password });
      if (data.session?.access_token) {
        setAuthTokens(data.session.access_token, data.session.refresh_token);
      }
      const profile = profileFromApi(data.user);
      setCurrentUser(profile);
      setUserId(profile?.id || null);
      await loadData();
      return profile;
    } catch (error) {
      console.warn('[AppContext] Login fallido:', errorMessage(error, 'Error de autenticación'));
      clearAuthTokens();
      setCurrentUser(null);
      setUserId(null);
      return null;
    }
  }, [loadData]);

  const register = useCallback(async (data) => {
    try {
      const payload = {
        name: data.name,
        username: data.username,
        email: data.email,
        password: data.password,
        bio: data.bio || '',
        skills: data.skills || [],
        categories: data.categories || userCategories({ skills: data.skills }),
        gameTypes: data.gameTypes || [],
        languages: data.languages || [],
        favoriteGenres: data.favoriteGenres || [],
        disciplines: data.disciplines || []
      };

      const result = await api.auth.register(payload);
      let profile = null;
      if (result.session?.access_token) {
        setAuthTokens(result.session.access_token, result.session.refresh_token);
        profile = profileFromApi(result.user);
        setCurrentUser(profile);
        setUserId(result.user?.id || null);
        await loadData();
      } else {
        // La cuenta se creó pero no hubo sesión automática: entramos manualmente.
        profile = await login(payload.email, payload.password);
        if (!profile) return 'error';
      }
      // Devolvemos el perfil para que el registro pueda asociar datos de la
      // pantalla (por ejemplo los juegos marcados) a la cuenta recién creada.
      return profile;
    } catch (error) {
      const message = errorMessage(error, '');
      if (/correo|email/i.test(message) && error?.status === 409) return 'email';
      if (/usuario|username/i.test(message) && error?.status === 409) return 'username';
      console.error('[AppContext] Registro fallido:', error?.status ?? 'sin respuesta', message);
      return isApiUnreachable(error) ? 'server' : 'error';
    }
  }, [loadData, login]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // El token puede haber caducado: cerramos sesión igualmente.
    }
    clearAuthTokens();
    setCurrentUser(null);
    setUserId(null);
    setMenuOpen(false);
    setActiveGroupId(null);
    setActiveGroupIdState(null);
    await refresh();
  }, [refresh]);

  // ========================================================================
  // PROFILE
  // ========================================================================
  const saveProfile = useCallback(async (data) => {
    if (!userId) return null;
    try {
      const { user: updated } = await api.profiles.update(userId, {
        bio: toLocalized(data.bio),
        skills: data.skills || [],
        categories: data.categories,
        githubUrl: data.githubUrl,
        portfolioUrl: data.portfolioUrl,
        gameTypes: data.gameTypes || [],
        languages: data.languages || [],
        favoriteGenres: data.favoriteGenres || [],
        disciplines: data.disciplines || []
      });
      return replaceUser(updated);
    } catch (error) {
      console.error('[AppContext] No se pudo guardar el perfil:', errorMessage(error, 'Error guardando perfil'));
      return null;
    }
  }, [userId, replaceUser]);

  const updateAccount = useCallback(async ({ name, username, email, password }) => {
    if (!userId) return 'error';

    const cleanName = String(name || '').trim();
    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanName || !cleanUsername || !cleanEmail) return 'incomplete';

    try {
      const { user: updated } = await api.profiles.update(userId, {
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail
      });
      replaceUser(updated);

      if (password) {
        await api.auth.updatePassword({ password });
      }

      return 'ok';
    } catch (error) {
      const message = errorMessage(error, '');
      if (/correo|email/i.test(message)) return 'email';
      if (/usuario|username/i.test(message)) return 'username';
      console.error('[AppContext] No se pudo actualizar la cuenta:', message);
      return 'error';
    }
  }, [userId, replaceUser]);

  const setAvatar = useCallback(async (avatar) => {
    if (!userId) return null;
    try {
      const { user: updated } = await api.profiles.update(userId, { avatar: avatar || null });
      return replaceUser(updated);
    } catch (error) {
      console.error('[AppContext] No se pudo actualizar el avatar:', errorMessage(error, 'Error guardando avatar'));
      return null;
    }
  }, [userId, replaceUser]);

  const toggleAvailability = useCallback(async () => {
    if (!userId) return false;
    try {
      const { user: updated, available } = await api.profiles.toggleAvailability(userId);
      replaceUser(updated);
      return available;
    } catch (error) {
      console.error('[AppContext] No se pudo cambiar la disponibilidad:', errorMessage(error, 'Error'));
      return null;
    }
  }, [userId, replaceUser]);

  const saveFeaturedProjects = useCallback(async (projectIds) => {
    if (!userId) return null;
    try {
      const { user: updated } = await api.profiles.saveFeatured(userId, projectIds);
      return replaceUser(updated);
    } catch (error) {
      console.error('[AppContext] No se pudieron guardar los destacados:', errorMessage(error, 'Error'));
      return null;
    }
  }, [userId, replaceUser]);

  // ========================================================================
  // PROJECTS
  // ========================================================================
  const createProject = useCallback(async (data) => {
    if (activeGroup && !isActiveGroupAdmin) return null;

    const payload = {
      title: toLocalized(data.title),
      description: toLocalized(data.description),
      category: data.category,
      slots: Number(data.slots) || 1,
      tech: data.tech || [],
      deadline: data.deadline || null,
      repo: data.repo || null,
      image: data.image || null,
      roles: (data.roles || []).filter(Boolean)
    };
    if (typeof data.minRating === 'number') payload.minRating = data.minRating;
    if (activeGroup?.id) payload.groupId = activeGroup.id;

    try {
      const project = projectFromApi(await createProjectApi(payload));
      if (project) setProjects(prev => [project, ...prev.filter(item => item.id !== project.id)]);
      return project;
    } catch (error) {
      console.error('[AppContext] No se pudo crear el proyecto:', errorMessage(error, 'Error creando proyecto'));
      throw new Error(errorMessage(error, 'No se pudo crear el proyecto'));
    }
  }, [activeGroup, isActiveGroupAdmin]);

  const changeProjectStatus = useCallback(async (projectId, newStatus) => {
    try {
      const result = await changeProjectStatusApi(projectId, newStatus);
      if (typeof result === 'string') return result;
      const project = projectFromApi(result);
      setProjects(prev => prev.map(item => (item.id === project.id ? { ...item, ...project } : item)));
      return project;
    } catch (error) {
      console.error('[AppContext] No se pudo cambiar el estado:', errorMessage(error, 'Error'));
      return null;
    }
  }, []);

  // ========================================================================
  // GROUPS
  // ========================================================================
  const selectGroup = useCallback((groupId) => {
    setActiveGroupId(groupId || null);
    setActiveGroupIdState(groupId || null);
  }, []);

  const createGroup = useCallback(async ({ name, description, isPrivate }) => {
    try {
      const created = await createGroupApi({
        name: String(name || '').trim(),
        description: String(description || '').trim(),
        isPrivate: Boolean(isPrivate)
      });
      const { groups: nextGroups } = await loadData();
      const group = nextGroups.find(item => item.id === created.id) || groupFromApi(created);
      if (group) selectGroup(group.id);
      return group;
    } catch (error) {
      console.error('[AppContext] No se pudo crear el grupo:', errorMessage(error, 'Error creando grupo'));
      return null;
    }
  }, [loadData, selectGroup]);

  const requestToJoinGroup = useCallback(async (groupId) => {
    try {
      const result = await requestToJoinGroupApi(groupId);
      if (result === 'pending' || result === 'member') return result;
      await loadData();
      return 'ok';
    } catch (error) {
      console.error('[AppContext] No se pudo solicitar el ingreso:', errorMessage(error, 'Error'));
      return 'error';
    }
  }, [loadData]);

  const decideGroupRequest = useCallback(async (groupId, requestId, accepted) => {
    try {
      await decideGroupRequestApi(groupId, requestId, accepted);
      await loadData();
      return true;
    } catch (error) {
      console.error('[AppContext] No se pudo decidir la solicitud:', errorMessage(error, 'Error'));
      return false;
    }
  }, [loadData]);

  const setGroupMemberRole = useCallback(async (groupId, memberId, role) => {
    if (!['admin', 'member'].includes(role)) return false;
    try {
      await setGroupMemberRoleApi(groupId, memberId, role);
      await loadData();
      return true;
    } catch (error) {
      console.error('[AppContext] No se pudo cambiar el rol:', errorMessage(error, 'Error'));
      return false;
    }
  }, [loadData]);

  const updateGroup = useCallback(async (groupId, { name, description, isPrivate } = {}) => {
    const payload = {};
    if (name && String(name).trim()) payload.name = String(name).trim();
    if (description !== undefined) payload.description = String(description).trim();
    if (isPrivate !== undefined) payload.isPrivate = Boolean(isPrivate);

    try {
      await updateGroupApi(groupId, payload);
      await loadData();
      return true;
    } catch (error) {
      console.error('[AppContext] No se pudo actualizar el grupo:', errorMessage(error, 'Error'));
      return false;
    }
  }, [loadData]);

  const deleteGroup = useCallback(async (groupId) => {
    try {
      await deleteGroupApi(groupId);
      if (activeGroupId === groupId) selectGroup(null);
      await loadData();
      return true;
    } catch (error) {
      console.error('[AppContext] No se pudo eliminar el grupo:', errorMessage(error, 'Error'));
      return false;
    }
  }, [activeGroupId, loadData, selectGroup]);

  const removeGroupMember = useCallback(async (groupId, memberId) => {
    try {
      await removeGroupMemberApi(groupId, memberId);
      await loadData();
      return true;
    } catch (error) {
      console.error('[AppContext] No se pudo quitar al miembro:', errorMessage(error, 'Error'));
      return false;
    }
  }, [loadData]);

  // ========================================================================
  // APPLICATIONS
  // ========================================================================
  const applyToProject = useCallback(async (projectId, pitch = '') => {
    try {
      const result = await applyToProjectApi(projectId, pitch);
      if (typeof result === 'string') return result;
      const application = applicationFromApi(result);
      if (application) {
        setApplications(prev => [application, ...prev.filter(item => item.id !== application.id)]);
      }
      return 'ok';
    } catch (error) {
      console.error('[AppContext] No se pudo postular:', errorMessage(error, 'Error'));
      return 'error';
    }
  }, []);

  const handleApplication = useCallback(async (appId, newStatus, projectId, projectRole = '') => {
    const existing = applications.find(item => item.id === appId);
    const applicant = existing ? users.find(item => item.id === existing.userId) : null;

    try {
      const result = await handleApplicationApi(appId, newStatus, projectId, projectRole);
      if (typeof result === 'string') return result;
      const application = applicationFromApi(result);
      if (application) {
        setApplications(prev => prev.map(item => (item.id === application.id ? { ...item, ...application } : item)));
      }
      return applicant?.name || applicant?.username || application?.user?.name || null;
    } catch (error) {
      console.error('[AppContext] No se pudo gestionar la postulación:', errorMessage(error, 'Error'));
      return null;
    }
  }, [applications, users]);

  const respondInvite = useCallback(async (appId, action) => {
    try {
      const result = await respondInviteApi(appId, action);
      if (typeof result === 'string') return result;
      const application = applicationFromApi(result);
      if (application) {
        setApplications(prev => prev.map(item => (item.id === application.id ? { ...item, ...application } : item)));
      }
      return action;
    } catch (error) {
      console.error('[AppContext] No se pudo responder la invitación:', errorMessage(error, 'Error'));
      return null;
    }
  }, []);

  const sendInvite = useCallback(async (projectId, targetUserId, message) => {
    try {
      const result = await sendInviteApi(projectId, targetUserId, message);
      if (typeof result === 'string') return result;
      const application = applicationFromApi(result);
      if (application) {
        setApplications(prev => [application, ...prev.filter(item => item.id !== application.id)]);
      }
      return 'ok';
    } catch (error) {
      console.error('[AppContext] No se pudo enviar la invitación:', errorMessage(error, 'Error'));
      return 'error';
    }
  }, []);

  // ========================================================================
  // RATINGS
  // ========================================================================
  const saveRatings = useCallback(async (projectId, ratingMap) => {
    try {
      const saved = await saveRatingsApi(projectId, ratingMap);
      await loadData();
      return Array.isArray(saved) && saved.length > 0;
    } catch (error) {
      console.error('[AppContext] No se pudieron guardar las calificaciones:', errorMessage(error, 'Error'));
      return false;
    }
  }, [loadData]);

  const value = {
    authReady,
    user, users, projects, applications, ratings, groups, activeGroup, activeGroupId, activeMembership, isActiveGroupAdmin,
    lang, theme, menuOpen, setMenuOpen,
    selectedCategories, setSelectedCategories,
    selectedTechFilters, setSelectedTechFilters,
    t, l10n, toggleLang, toggleTheme,
    login, register, logout,
    saveProfile, updateAccount, setAvatar, toggleAvailability, saveFeaturedProjects,
    createProject, changeProjectStatus,
    selectGroup, createGroup, updateGroup, deleteGroup, removeGroupMember, requestToJoinGroup, decideGroupRequest, setGroupMemberRole,
    applyToProject, handleApplication, respondInvite, sendInvite,
    saveRatings, refresh
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
