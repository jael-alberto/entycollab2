import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getUsers, getProjects, getApplications, getRatings, getGroups,
  saveUsers, saveProjects, saveApplications, saveRatingsData, saveGroups,
  getCurrentUserId, setCurrentUserId, clearCurrentUserId,
  getActiveGroupId, setActiveGroupId, getTheme, setTheme as storeSetTheme, getLang, setLang as storeSetLang
} from '../lib/store.js';
import {
  createGroup as apiCreateGroup,
  requestToJoinGroup as apiRequestToJoinGroup,
  decideGroupRequest as apiDecideGroupRequest,
  updateGroup as apiUpdateGroup,
  deleteGroup as apiDeleteGroup,
  removeGroupMember as apiRemoveGroupMember,
  setGroupMemberRole as apiSetGroupMemberRole
} from '../lib/api/groups.js';
import {
  createProject as apiCreateProject,
  changeProjectStatus as apiChangeProjectStatus
} from '../lib/api/projects.js';
import {
  applyToProject as apiApplyToProject,
  handleApplication as apiHandleApplication,
  respondInvite as apiRespondInvite,
  sendInvite as apiSendInvite
} from '../lib/api/applications.js';
import { saveRatings as apiSaveRatings } from '../lib/api/ratings.js';
import { api } from '../lib/api/client.js';
import { getAuthToken, setAuthTokens, clearAuthTokens } from '../lib/authToken.js';
import { t as i18nT, l10nValue } from '../lib/i18n.js';
import { getUserAvgRating, userCategories } from '../lib/helpers.js';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { useToast } from './ToastContext.jsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState(() => getUsers());
  const [projects, setProjects] = useState(() => getProjects());
  const [applications, setApplications] = useState(() => getApplications());
  const [ratings, setRatings] = useState(() => getRatings());
  const [groups, setGroups] = useState(() => getGroups());
  const [userId, setUserId] = useState(() => getCurrentUserId());
  const [activeGroupId, setActiveGroupIdState] = useState(() => getActiveGroupId());
  const [lang, setLangState] = useState(() => getLang());
  const [theme, setThemeState] = useState(() => getTheme());
  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTechFilters, setSelectedTechFilters] = useState([]);

  const user = users.find(u => u.id === userId) || null;
  const activeGroup = groups.find(g => g.id === activeGroupId) || null;
  const activeMembership = activeGroup?.members?.find(m => m.userId === userId) || null;
  const isActiveGroupAdmin = activeMembership?.role === 'owner' || activeMembership?.role === 'admin';

  // ========================================================================
  // CARGA DE DATOS DESDE EL BACKEND
  // El backend es la única capa que habla con Supabase/Prisma.
  // localStorage se usa solo como caché/fallback para el primer render.
  // ========================================================================
  const applyBootstrap = useCallback((data) => {
    if (!data) return;

    if (Array.isArray(data.projects)) {
      setProjects(data.projects);
      saveProjects(data.projects);
    }
    if (Array.isArray(data.profiles)) {
      setUsers(data.profiles);
      saveUsers(data.profiles);
    }
    if (Array.isArray(data.groups)) {
      setGroups(data.groups);
      saveGroups(data.groups);
    }
    if (Array.isArray(data.applications)) {
      setApplications(data.applications);
      saveApplications(data.applications);
    }
    if (Array.isArray(data.ratings)) {
      setRatings(data.ratings);
      saveRatingsData(data.ratings);
    }
  }, []);

  const loadFromBackend = useCallback(async () => {
    try {
      const data = await api.bootstrap.get();
      applyBootstrap(data);
      return true;
    } catch (err) {
      console.warn('[AppContext] No se pudieron cargar los datos del backend:', err);
      return false;
    }
  }, [applyBootstrap]);

  const refresh = useCallback(async () => {
    const ok = await loadFromBackend();
    setUserId(getCurrentUserId());
    setActiveGroupIdState(getActiveGroupId());
    return ok;
  }, [loadFromBackend]);

  // Carga inicial: valida la sesión guardada y trae los datos del backend.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (getAuthToken()) {
        try {
          const { user: me } = await api.auth.me();
          if (!cancelled && me?.id) {
            setCurrentUserId(me.id);
            setUserId(me.id);
          }
        } catch {
          // Si el refresh automático falló, el token ya se limpió.
          if (!cancelled && !getAuthToken()) {
            clearCurrentUserId();
            setUserId(null);
          }
        }
      }

      if (!cancelled) await loadFromBackend();
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [loadFromBackend]);

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
  }, [theme]);

  // Al volver al inicio se limpia el grupo activo (contexto global).
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname || '';
    if (path === '/' || path === '/home' || path === '/inicio') {
      setActiveGroupId(null);
      setActiveGroupIdState(null);
    }
  }, [location.pathname]);

  // ========================================================================
  // AUTH
  // ========================================================================
  const login = useCallback(async (identifier, password) => {
    const cleanIdentifier = String(identifier || '').trim().toLowerCase().replace(/^@/, '');

    try {
      const data = await api.auth.login({ identifier: cleanIdentifier, password });

      if (data?.session?.access_token) {
        setAuthTokens(data.session.access_token, data.session.refresh_token);
      }

      const loggedUser = data?.user;
      if (!loggedUser?.id) return null;

      setCurrentUserId(loggedUser.id);
      setUserId(loggedUser.id);
      setUsers(prev => {
        const idx = prev.findIndex(u => u.id === loggedUser.id);
        const next = idx >= 0
          ? prev.map((u, i) => (i === idx ? { ...u, ...loggedUser } : u))
          : [...prev, loggedUser];
        saveUsers(next);
        return next;
      });

      await loadFromBackend();
      return loggedUser;
    } catch (err) {
      console.warn('[AppContext] Error de login:', err.message);
      return null;
    }
  }, [loadFromBackend]);

  const register = useCallback(async (data) => {
    const profilePayload = {
      name: data.name,
      username: data.username,
      bio: data.bio,
      avatar: data.avatar || null,
      skills: data.skills || [],
      categories: data.categories || userCategories({ skills: data.skills || [] }),
      gameTypes: data.gameTypes || [],
      languages: data.languages || [],
      favoriteGenres: data.favoriteGenres || [],
      disciplines: data.disciplines || []
    };

    // Usuario que ya inició sesión con OAuth: completar el perfil existente.
    if (!data.password && getAuthToken()) {
      try {
        const { user: synced } = await api.auth.ensureProfile(profilePayload);
        if (synced?.id) {
          setCurrentUserId(synced.id);
          setUserId(synced.id);
          await loadFromBackend();
          return 'ok';
        }
      } catch (err) {
        console.warn('[AppContext] No se pudo completar el perfil OAuth:', err.message);
      }
    }

    try {
      const result = await api.auth.register({
        ...profilePayload,
        email: data.email,
        password: data.password
      });

      if (result?.session?.access_token) {
        setAuthTokens(result.session.access_token, result.session.refresh_token);
      }
      if (result?.user?.id) {
        setCurrentUserId(result.user.id);
        setUserId(result.user.id);
      }

      await loadFromBackend();
      return 'ok';
    } catch (err) {
      if (err.status === 409) {
        if (/correo|email/i.test(err.message)) return 'email';
        if (/usuario|username/i.test(err.message)) return 'username';
      }
      console.error('[AppContext] Error de registro:', err);
      return 'error';
    }
  }, [loadFromBackend]);

  const logout = useCallback(() => {
    // Se cierra la sesión en el backend y en Supabase (OAuth), y se limpia
    // el estado local. La app no guarda datos de negocio en Supabase.
    api.auth.logout().catch(() => {});
    if (supabase) supabase.auth.signOut().catch(() => {});
    clearAuthTokens();
    clearCurrentUserId();
    setActiveGroupId(null);
    setUserId(null);
    setActiveGroupIdState(null);
    setMenuOpen(false);
  }, []);

  // ========================================================================
  // PROFILE
  // ========================================================================
  const mergeUser = useCallback((updated) => {
    if (!updated?.id) return;
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === updated.id);
      const next = idx >= 0
        ? prev.map((u, i) => (i === idx ? { ...u, ...updated } : u))
        : [...prev, updated];
      saveUsers(next);
      return next;
    });
  }, []);

  const saveProfile = useCallback(async (data) => {
    if (!userId) return null;

    const payload = {
      bio: data.bio,
      skills: (data.skills || []).slice(),
      categories: (data.categories || []).slice(),
      githubUrl: data.githubUrl,
      portfolioUrl: data.portfolioUrl,
      gameTypes: (data.gameTypes || []).slice(),
      languages: (data.languages || []).slice(),
      favoriteGenres: (data.favoriteGenres || []).slice(),
      disciplines: (data.disciplines || []).slice()
    };

    try {
      const { user: updated } = await api.profiles.update(userId, payload);
      mergeUser(updated);
      return updated;
    } catch (err) {
      showToast(err.message || 'Error guardando el perfil', 'error');
      return null;
    }
  }, [userId, mergeUser, showToast]);

  // Edita los datos de la cuenta desde Ajustes.
  const updateAccount = useCallback(async ({ name, username, email, password }) => {
    if (!userId) return 'error';

    const cleanName = String(name || '').trim();
    const cleanUsername = String(username || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanName || !cleanUsername || !cleanEmail) return 'incomplete';

    try {
      const { user: updated } = await api.profiles.update(userId, {
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail
      });

      if (password) {
        await api.auth.updatePassword({ password });
      }

      mergeUser(updated);
      return 'ok';
    } catch (err) {
      if (err.status === 409) {
        if (/correo|email/i.test(err.message)) return 'email';
        if (/usuario|username/i.test(err.message)) return 'username';
      }
      if (err.status === 400) return 'incomplete';
      return 'error';
    }
  }, [userId, mergeUser]);

  const setAvatar = useCallback(async (avatar) => {
    if (!userId) return null;
    try {
      const { user: updated } = await api.profiles.update(userId, { avatar });
      mergeUser(updated);
      return updated;
    } catch (err) {
      showToast(err.message || 'Error actualizando la foto', 'error');
      return null;
    }
  }, [userId, mergeUser, showToast]);

  const toggleAvailability = useCallback(async () => {
    if (!userId) return false;
    try {
      const { user: updated, available } = await api.profiles.toggleAvailability(userId);
      mergeUser(updated);
      return available;
    } catch (err) {
      showToast(err.message || 'Error cambiando la disponibilidad', 'error');
      return false;
    }
  }, [userId, mergeUser, showToast]);

  const saveFeaturedProjects = useCallback(async (projectIds) => {
    if (!userId) return null;
    try {
      const { user: updated } = await api.profiles.saveFeatured(userId, projectIds);
      mergeUser(updated);
      return updated;
    } catch (err) {
      showToast(err.message || 'Error guardando proyectos destacados', 'error');
      return null;
    }
  }, [userId, mergeUser, showToast]);

  // ========================================================================
  // PROJECTS
  // ========================================================================
  const createProject = useCallback(async (data) => {
    if (activeGroup && !isActiveGroupAdmin) return null;

    try {
      const project = await apiCreateProject({
        title: { es: data.title, en: data.title },
        category: data.category,
        slots: data.slots,
        tech: data.tech || [],
        minRating: data.minRating,
        description: { es: data.description, en: data.description },
        deadline: data.deadline || null,
        repo: data.repo || null,
        image: data.image || null,
        roles: (data.roles || []).filter(Boolean),
        groupId: activeGroup?.id || null
      });

      if (project?.id) {
        setProjects(prev => {
          const next = [project, ...prev.filter(p => p.id !== project.id)];
          saveProjects(next);
          return next;
        });
      }

      await refresh();
      return project;
    } catch (err) {
      showToast(err.message || 'Error al publicar el proyecto', 'error');
      return null;
    }
  }, [activeGroup, isActiveGroupAdmin, refresh, showToast]);

  const changeProjectStatus = useCallback(async (projectId, newStatus) => {
    try {
      const result = await apiChangeProjectStatus(projectId, newStatus);

      if (typeof result === 'string') return result;
      if (!result?.id) return null;

      setProjects(prev => {
        const next = prev.map(p => (p.id === projectId ? { ...p, ...result } : p));
        saveProjects(next);
        return next;
      });

      await refresh();
      return result;
    } catch (err) {
      showToast(err.message || 'Error cambiando el estado del proyecto', 'error');
      return null;
    }
  }, [refresh, showToast]);

  // ========================================================================
  // GROUPS
  // ========================================================================
  const selectGroup = useCallback((groupId) => {
    setActiveGroupId(groupId);
    setActiveGroupIdState(groupId || null);
  }, []);

  const createGroup = useCallback(async ({ name, description, isPrivate = false }) => {
    try {
      const created = await apiCreateGroup({
        name: name.trim(),
        description: (description || '').trim(),
        isPrivate: isPrivate === true
      });

      setGroups(prev => {
        const next = [created, ...prev.filter(g => g.id !== created.id)];
        saveGroups(next);
        return next;
      });

      selectGroup(created.id);
      await refresh();
      return created;
    } catch (err) {
      showToast(err.message || 'Error creando el grupo', 'error');
      return null;
    }
  }, [selectGroup, refresh, showToast]);

  const requestToJoinGroup = useCallback(async (groupId) => {
    const group = groups.find(item => item.id === groupId);
    const alreadyMember = group && (
      group.ownerId === userId ||
      (group.members || []).some(member => member.userId === userId)
    );
    if (alreadyMember) {
      showToast('Ya eres miembro de este grupo', 'info');
      return 'member';
    }
    if ((group?.requests || []).some(item => item.userId === userId && item.status === 'pending')) {
      showToast('Ya tienes una solicitud pendiente para este grupo', 'info');
      return 'pending';
    }

    let request;
    try {
      request = await apiRequestToJoinGroup(groupId);
    } catch (err) {
      if (err.message === 'pending') {
        showToast('Ya tienes una solicitud pendiente para este grupo', 'info');
        return 'pending';
      }
      if (err.message === 'member') {
        showToast('Ya eres miembro de este grupo', 'info');
        return 'member';
      }
      showToast(err.message || 'No se pudo enviar la solicitud', 'error');
      return 'error';
    }

    setGroups(prev => {
      const next = prev.map(item => item.id === groupId
        ? {
            ...item,
            requests: [
              ...(item.requests || []).filter(existing =>
                existing.id !== request.id &&
                !(existing.userId === userId && existing.status === 'pending')
              ),
              request
            ]
          }
        : item);
      saveGroups(next);
      return next;
    });

    await refresh();
    showToast('Solicitud enviada al administrador', 'success');
    return 'pending';
  }, [groups, userId, showToast, refresh]);

  const decideGroupRequest = useCallback(async (groupId, requestId, accepted) => {
    try {
      const request = await apiDecideGroupRequest(groupId, requestId, accepted);
      if (request) {
        showToast(
          accepted ? 'Solicitud aceptada. Nuevo miembro agregado.' : 'Solicitud rechazada.',
          accepted ? 'success' : 'info'
        );
      }
      await refresh();
      return Boolean(request);
    } catch (err) {
      showToast(err.message || 'Error gestionando la solicitud', 'error');
      return false;
    }
  }, [showToast, refresh]);

  const setGroupMemberRole = useCallback(async (groupId, memberId, role) => {
    try {
      const member = await apiSetGroupMemberRole(groupId, memberId, role);
      await refresh();
      return Boolean(member);
    } catch (err) {
      showToast(err.message || 'Error cambiando el rol', 'error');
      return false;
    }
  }, [showToast, refresh]);

  const updateGroup = useCallback(async (groupId, { name, description, isPrivate }) => {
    try {
      const group = await apiUpdateGroup(groupId, { name, description, isPrivate });
      await refresh();
      return Boolean(group);
    } catch (err) {
      showToast(err.message || 'Error actualizando el grupo', 'error');
      return false;
    }
  }, [showToast, refresh]);

  const removeGroupMember = useCallback(async (groupId, memberId) => {
    try {
      const ok = await apiRemoveGroupMember(groupId, memberId);
      await refresh();
      return Boolean(ok);
    } catch (err) {
      showToast(err.message || 'Error eliminando el miembro', 'error');
      return false;
    }
  }, [showToast, refresh]);

  const deleteGroup = useCallback(async (groupId) => {
    try {
      const ok = await apiDeleteGroup(groupId);
      if (activeGroupId === groupId) selectGroup(null);
      await refresh();
      return Boolean(ok);
    } catch (err) {
      showToast(err.message || 'Error eliminando el grupo', 'error');
      return false;
    }
  }, [activeGroupId, selectGroup, refresh, showToast]);

  // ========================================================================
  // APPLICATIONS
  // ========================================================================
  const applyToProject = useCallback(async (projectId, pitch = '') => {
    if (!userId) return 'unauthorized';

    if (applications.some(a => a.projectId === projectId && a.userId === userId)) {
      return 'alreadyApplied';
    }

    const project = projects.find(p => p.id === projectId);
    if (project && project.minRating) {
      const userRating = getUserAvgRating(userId, ratings);
      if (userRating < project.minRating) return 'minRating';
    }

    try {
      const result = await apiApplyToProject(projectId, pitch);
      if (typeof result === 'string') return result;
      await refresh();
      return 'ok';
    } catch (err) {
      showToast(err.message || 'Error en la postulación', 'error');
      return 'error';
    }
  }, [applications, projects, ratings, userId, refresh, showToast]);

  const handleApplication = useCallback(async (appId, newStatus, projectId, projectRole = '') => {
    const current = applications.find(a => a.id === appId);
    const applicant = users.find(u => u.id === current?.userId);

    try {
      const result = await apiHandleApplication(appId, newStatus, projectId, projectRole);
      if (typeof result === 'string') return result;

      await refresh();
      return applicant?.name || result?.user?.name || '';
    } catch (err) {
      showToast(err.message || 'Error gestionando la postulación', 'error');
      return null;
    }
  }, [applications, users, refresh, showToast]);

  const respondInvite = useCallback(async (appId, action) => {
    try {
      const result = await apiRespondInvite(appId, action);
      if (typeof result === 'string') return result;
      await refresh();
      return action === 'accepted' ? 'accepted' : 'rejected';
    } catch (err) {
      showToast(err.message || 'Error respondiendo la invitación', 'error');
      return null;
    }
  }, [refresh, showToast]);

  const sendInvite = useCallback(async (projectId, targetUserId, message) => {
    if (applications.some(a => a.projectId === projectId && a.userId === targetUserId)) {
      return 'already';
    }

    try {
      const result = await apiSendInvite(projectId, targetUserId, message);
      if (typeof result === 'string') return result;
      await refresh();
      return 'ok';
    } catch (err) {
      showToast(err.message || 'Error enviando la invitación', 'error');
      return 'error';
    }
  }, [applications, refresh, showToast]);

  // ========================================================================
  // RATINGS
  // ========================================================================
  const saveRatings = useCallback(async (projectId, ratingMap) => {
    const hasRatings = Object.values(ratingMap || {}).some(Boolean);
    if (!hasRatings) return false;

    try {
      const saved = await apiSaveRatings(projectId, ratingMap);

      if (Array.isArray(saved) && saved.length > 0) {
        setRatings(prev => {
          const next = [...prev];
          saved.forEach(rating => {
            const idx = next.findIndex(r => r.id === rating.id);
            if (idx >= 0) next[idx] = { ...next[idx], ...rating };
            else next.push(rating);
          });
          saveRatingsData(next);
          return next;
        });
      }

      await refresh();
      return true;
    } catch (err) {
      showToast(err.message || 'Error guardando las calificaciones', 'error');
      return false;
    }
  }, [refresh, showToast]);

  const value = {
    user, users, projects, applications, ratings, groups, activeGroup, activeGroupId, activeMembership, isActiveGroupAdmin,
    lang, theme, menuOpen, setMenuOpen,
    selectedCategories, setSelectedCategories,
    selectedTechFilters, setSelectedTechFilters,
    isSupabase: isSupabaseConfigured(),
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
