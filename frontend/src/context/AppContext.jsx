import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getUsers, getProjects, getApplications, getRatings,
  getCurrentUserId, setCurrentUserId, clearCurrentUserId,
  getActiveGroupId, setActiveGroupId, generateId, hashPassword, getTheme, setTheme as storeSetTheme, getLang, setLang as storeSetLang
} from '../lib/store.js';
import { listGroups, createGroup as apiCreateGroup, requestToJoinGroup as apiRequestToJoinGroup, decideGroupRequest as apiDecideGroupRequest, updateGroup as apiUpdateGroup, removeGroupMember as apiRemoveGroupMember, setGroupMemberRole as apiSetGroupMemberRole, getGroupMembers, getGroupRequests, listGroupProjects } from '../lib/api/groups.js';
import { t as i18nT, l10nValue } from '../lib/i18n.js';
import { getUserAvgRating, userCategories } from '../lib/helpers.js';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import {
  fetchSupabaseData,
  syncProjectToSupabase,
  syncProfileToSupabase,
  syncApplicationToSupabase,
  syncRatingToSupabase,
  syncGroupToSupabase,
  supabaseAuthLogin,
  supabaseAuthRegister
} from '../lib/supabaseSync.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
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

  // Resincronizar los datos tras cada cambio (con almacenamiento local)
  const refresh = useCallback(() => {
    setUsers(getUsers());
    setProjects(getProjects());
    setApplications(getApplications());
    setRatings(getRatings());
    setGroups(getGroups());
    setUserId(getCurrentUserId());
    setActiveGroupIdState(getActiveGroupId());
  }, []);

  const setUserInStore = useCallback((id) => {
    setCurrentUserId(id);
    setUserId(id);
  }, []);

  // ========================================================================
  // SINCRONIZACIÓN INICIAL CON SUPABASE (CUANDO ESTÁ CONFIGURADO EN VERCEL/LOCAL)
  // ========================================================================
  useEffect(() => {
    let isMounted = true;
    async function initSupabaseData() {
      if (!isSupabaseConfigured()) return;
      try {
        const data = await fetchSupabaseData();
        if (!isMounted || !data.enabled) return;

        if (Array.isArray(data.projects) && data.projects.length > 0) {
          setProjects(data.projects);
          saveProjects(data.projects);
        }
        if (Array.isArray(data.profiles) && data.profiles.length > 0) {
          setUsers(data.profiles);
          saveUsers(data.profiles);
        }
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          setGroups(data.groups);
          saveGroups(data.groups);
        }
        if (Array.isArray(data.applications) && data.applications.length > 0) {
          setApplications(data.applications);
          saveApplications(data.applications);
        }
        if (Array.isArray(data.ratings) && data.ratings.length > 0) {
          setRatings(data.ratings);
          saveRatingsData(data.ratings);
        }
      } catch (err) {
        console.warn('[AppContext] No se pudieron sincronizar datos con Supabase:', err);
      }
    }

    initSupabaseData();
    return () => {
      isMounted = false;
    };
  }, []);

  // ========================================================================
  // OBTENER GRUPOS DEL BACKEND PRISMA (siempre que haya API disponible)
  // ========================================================================
  useEffect(() => {
    async function fetchGroupsFromBackend() {
      try {
        const result = await listGroups();
        if (Array.isArray(result.data) && result.data.length > 0) {
          setGroups(result.data);
          saveGroups(result.data);
        } else {
          // Si la API falla o está vacía, mantener localStorage/Supabase como fallback
          if (!isSupabaseConfigured()) {
            const localGroups = getGroups();
            if (localGroups.length > 0) {
              setGroups(localGroups);
            }
          }
        }
      } catch (err) {
        console.warn('[AppContext] No se pudieron cargar grupos del backend:', err);
        // Mantener datos locales si la API falla
        if (!isSupabaseConfigured()) {
          const localGroups = getGroups();
          if (localGroups.length > 0) {
            setGroups(localGroups);
          }
        }
      }
    }

    fetchGroupsFromBackend();
  }, []);

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

  // Aplica theme + lang al <html> (igual que applyTheme/applyLanguage del vanilla)
  // `dark` y `light` son excluyentes: `dark` mantiene vivos los overrides
  // `:root.dark <selector>` de styles.css; `light` restaura la paleta clara.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme);
    document.documentElement.classList.toggle('light', !theme);
  }, [theme]);

  // ========================================================================
  // AUTH
  // ========================================================================
  const login = useCallback(async (identifier, password) => {
    const cleanIdentifier = String(identifier || '').trim().toLowerCase().replace(/^@/, '');

    // 1. Si Supabase está configurado, intentar autenticación con Supabase
    if (isSupabaseConfigured()) {
      const supaUser = await supabaseAuthLogin(cleanIdentifier, password);
      if (supaUser) {
        const current = getUsers();
        const existingIdx = current.findIndex(u => u.id === supaUser.id);
        if (existingIdx >= 0) {
          current[existingIdx] = { ...current[existingIdx], ...supaUser };
        } else {
          current.push(supaUser);
        }
        saveUsers(current);
        setUsers(current);
        setUserInStore(supaUser.id);
        return supaUser;
      }
    }

    // 2. Fallback a usuarios locales
    const pHash = password ? await hashPassword(password) : '';
    const localUsers = getUsers();
    const found = localUsers.find(u => {
      const matchIdentity = u.email.toLowerCase() === cleanIdentifier || u.username.toLowerCase() === cleanIdentifier;
      if (!matchIdentity) return false;
      if (u.passwordHash) return u.passwordHash === pHash;
      if (u.password) return u.password === password || u.password === pHash;
      return false;
    });
    if (!found) return null;
    // Migrate legacy local accounts: remove any plaintext password the next
    // time the user list is persisted. New accounts store only passwordHash.
    if (Object.hasOwn(found, 'password')) saveUsers(localUsers);
    setUserInStore(found.id);
    return found;
  }, [setUserInStore]);

  const register = useCallback(async (data) => {
    const current = getUsers();
    if (current.find(u => u.email === data.email)) return 'email';
    if (current.find(u => u.username === data.username)) return 'username';

    let supaProfile = null;
    if (isSupabaseConfigured()) {
      supaProfile = await supabaseAuthRegister(data);
      if (supaProfile === 'email') return 'email';
    }

    const hashedPassword = data.password ? await hashPassword(data.password) : '';

    const newUser = supaProfile || {
      id: generateId(),
      name: data.name,
      username: data.username,
      email: data.email,
      passwordHash: hashedPassword,
      skills: data.skills,
      categories: userCategories({ skills: data.skills }),
      bio: data.bio,
      languages: (data.languages || []).slice(),
      disciplines: (data.disciplines || []).slice(),
      gameTypes: (data.gameTypes || []).slice(),
      favoriteGenres: (data.favoriteGenres || []).slice(),
      createdAt: new Date().toISOString()
    };

    current.push(newUser);
    saveUsers(current);
    setUsers(current);
    setUserInStore(newUser.id);
    return 'ok';
  }, [setUserInStore]);

  const logout = useCallback(() => {
    clearCurrentUserId();
    setActiveGroupId(null);
    setUserId(null);
    setActiveGroupIdState(null);
    setMenuOpen(false);
  }, []);

  // ========================================================================
  // PROFILE
  // ========================================================================
  const saveProfile = useCallback((data) => {
    const current = getUsers();
    const idx = current.findIndex(u => u.id === userId);
    if (idx >= 0) {
      current[idx].bio = data.bio;
      current[idx].skills = data.skills.slice();
      if (data.categories) current[idx].categories = data.categories.slice();
      if (data.githubUrl !== undefined) current[idx].githubUrl = data.githubUrl;
      if (data.portfolioUrl !== undefined) current[idx].portfolioUrl = data.portfolioUrl;
      // Perfil de talento: es lo que usa el buscador de Personas
      current[idx].gameTypes = (data.gameTypes || []).slice();
      current[idx].languages = (data.languages || []).slice();
      current[idx].favoriteGenres = (data.favoriteGenres || []).slice();
      current[idx].disciplines = (data.disciplines || []).slice();
      saveUsers(current);
      setUsers(current);
      refresh();
      syncProfileToSupabase(current[idx]);
    }
  }, [userId, refresh]);

  // Edita los datos de la cuenta desde Ajustes.
  const updateAccount = useCallback(async ({ name, username, email, password }) => {
    const current = getUsers();
    const idx = current.findIndex(u => u.id === userId);
    if (idx < 0) return 'error';

    const cleanName = String(name || '').trim();
    const cleanUsername = String(username || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanName || !cleanUsername || !cleanEmail) return 'incomplete';

    if (current.some(u => u.id !== userId && u.email === cleanEmail)) return 'email';
    if (current.some(u => u.id !== userId && u.username === cleanUsername)) return 'username';

    const target = current[idx];
    target.name = cleanName;
    target.username = cleanUsername;
    target.email = cleanEmail;
    if (password) {
      target.passwordHash = await hashPassword(password);
      delete target.password;
    }

    saveUsers(current);
    setUsers(current);
    refresh();
    syncProfileToSupabase(target);
    return 'ok';
  }, [userId, refresh]);

  const setAvatar = useCallback((avatar) => {
    const current = getUsers();
    const idx = current.findIndex(u => u.id === userId);
    if (idx >= 0) {
      current[idx].avatar = avatar;
      saveUsers(current);
      setUsers(current);
      refresh();
      syncProfileToSupabase(current[idx]);
    }
  }, [userId, refresh]);

  const toggleAvailability = useCallback(() => {
    const current = getUsers();
    const idx = current.findIndex(u => u.id === userId);
    if (idx < 0) return;
    current[idx].available = !(current[idx].available === true);
    const on = current[idx].available;
    saveUsers(current);
    setUsers(current);
    refresh();
    syncProfileToSupabase(current[idx]);
    return on;
  }, [userId, refresh]);

  const saveFeaturedProjects = useCallback((projectIds) => {
    const current = getUsers();
    const idx = current.findIndex(u => u.id === userId);
    if (idx >= 0) {
      current[idx].featuredProjectIds = projectIds.slice();
      saveUsers(current);
      setUsers(current);
      refresh();
      syncProfileToSupabase(current[idx]);
    }
  }, [userId, refresh]);

  // ========================================================================
  // PROJECTS
  // ========================================================================
  const createProject = useCallback(async (data) => {
    if (activeGroup && !isActiveGroupAdmin) return { error: 'No tienes permisos para crear proyectos en este grupo' };
    const project = {
      id: generateId(),
      ownerId: userId,
      title: data.title,
      category: data.category,
      slots: data.slots,
      tech: data.tech,
      minRating: data.minRating,
      description: data.description,
      deadline: data.deadline || null,
      repo: data.repo || null,
      image: data.image || null,
      groupId: activeGroup?.id || null,
      roles: (data.roles || []).filter(Boolean),
      status: 'open',
      createdAt: new Date().toISOString()
    };
    const current = getProjects();
    const exists = current.some(p => p.title === data.title && p.ownerId === userId);
    if (exists) return { error: 'Ya tienes un proyecto con este nombre' };
    current.push(project);
    saveProjects(current);
    setProjects(current);
    syncProjectToSupabase(project);
    return { project, success: true };
  }, [userId, activeGroup, isActiveGroupAdmin]);

  // ========================================================================
  // GROUPS
  // ========================================================================
  const selectGroup = useCallback((groupId) => {
    setActiveGroupId(groupId);
    setActiveGroupIdState(groupId || null);
  }, []);

  const createGroup = useCallback(async ({ name, description, isPrivate = false }) => {
    const group = {
      id: generateId(),
      name: name.trim(),
      description: description.trim(),
      ownerId: userId,
      isPrivate: isPrivate === true,
      createdAt: new Date().toISOString(),
      members: [{ userId, role: 'owner', joinedAt: new Date().toISOString() }],
      requests: []
    };
    const created = await apiCreateGroup(group);
    setGroups(prev => {
      const idx = prev.findIndex(g => g.id === created.id);
      if (idx >= 0) prev[idx] = created;
      return [...prev];
    });
    selectGroup(group.id);
    return created;
  }, [userId, selectGroup]);

  const requestToJoinGroup = useCallback(async (groupId) => {
    try {
      const res = await apiRequestToJoinGroup(groupId);
      if (res === 'pending') {
        showToast('Ya tienes una solicitud pendiente para este grupo', 'info');
      } else if (res === 'member') {
        showToast('Ya eres miembro de este grupo', 'info');
      } else {
        showToast('Solicitud enviada al administrador', 'success');
      }
      setGroups(prev => prev.map(g => {
        if (g.id !== groupId) return g;
        const currentReqs = g.requests || [];
        const alreadyHas = currentReqs.some(r => (r.userId === userId || r.user_id === userId) && r.status === 'pending');
        if (alreadyHas) return { ...g, hasPendingRequest: true };
        const newReqObj = (typeof res === 'object' && res?.id) ? res : {
          id: 'temp-' + Date.now(),
          groupId,
          userId,
          user_id: userId,
          status: 'pending',
          requestedAt: new Date().toISOString()
        };
        return {
          ...g,
          requests: [...currentReqs, newReqObj],
          hasPendingRequest: true
        };
      }));
      return res;
    } catch (err) {
      showToast(err.message || 'Error solicitando ingreso', 'error');
      return null;
    }
  }, [userId, showToast]);

  const decideGroupRequest = useCallback(async (groupId, requestId, accepted) => {
    const ok = await apiDecideGroupRequest(groupId, requestId, accepted);
    if (ok) showToast(accepted ? 'Solicitud aceptada. Nuevo miembro agregado.' : 'Solicitud rechazada.', accepted ? 'success' : 'info');
    refresh();
    return ok;
  }, [showToast, refresh]);

  const setGroupMemberRole = useCallback(async (groupId, memberId, role) => {
    const ok = await apiSetGroupMemberRole(groupId, memberId, role);
    if (ok) {
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: g.members?.map(m => m.userId === memberId ? { ...m, role } : m) } : g));
      refresh();
    }
    return ok;
  }, []);

  const updateGroup = useCallback(async (groupId, { name, description, isPrivate }) => {
    const ok = await apiUpdateGroup(groupId, { name, description, isPrivate });
    if (ok) {
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: name ?? g.name, description: description ?? g.description, isPrivate: isPrivate !== undefined ? isPrivate : g.isPrivate } : g));
      refresh();
    }
    return ok;
  }, []);

  const removeGroupMember = useCallback(async (groupId, memberId) => {
    const ok = await apiRemoveGroupMember(groupId, memberId);
    if (ok) {
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: g.members?.filter(m => m.userId !== memberId) } : g));
      refresh();
    }
    return ok;
  }, []);

  const changeProjectStatus = useCallback((projectId, newStatus) => {
    const current = getProjects();
    const idx = current.findIndex(p => p.id === projectId);
    if (idx < 0) return null;
    if (newStatus === 'completed') {
      const accepted = getApplications().filter(a => a.projectId === projectId && a.status === 'accepted');
      if (accepted.length === 0) return 'noParticipants';
    }
    current[idx].status = newStatus;
    saveProjects(current);
    setProjects(current);
    syncProjectToSupabase(current[idx]);
    return current[idx];
  }, []);

  // ========================================================================
  // APPLICATIONS
  // ========================================================================
  const applyToProject = useCallback((projectId, pitch = '') => {
    const current = getApplications();
    if (current.find(a => a.projectId === projectId && a.userId === userId)) return 'alreadyApplied';

    const project = getProjects().find(p => p.id === projectId);
    if (project && project.minRating) {
      const userRating = getUserAvgRating(userId, ratings);
      if (userRating < project.minRating) return 'minRating';
    }

    const newApp = {
      id: generateId(),
      projectId,
      userId,
      status: 'pending',
      pitch: String(pitch || ''),
      appliedAt: new Date().toISOString()
    };

    current.push(newApp);
    saveApplications(current);
    setApplications(current);
    syncApplicationToSupabase(newApp);
    return 'ok';
  }, [userId, ratings]);

  const handleApplication = useCallback((appId, newStatus, projectId, projectRole = '') => {
    const current = getApplications();
    const idx = current.findIndex(a => a.id === appId);
    if (idx < 0) return null;
    const project = getProjects().find(p => p.id === projectId);
    if (!project) return null;

    if (newStatus === 'accepted') {
      const acceptedCount = current.filter(a => a.projectId === projectId && a.status === 'accepted').length;
      if (acceptedCount >= project.slots) return 'slotsFull';
    }

    current[idx].status = newStatus;
    if (newStatus === 'accepted') current[idx].projectRole = projectRole;
    saveApplications(current);
    setApplications(current);
    syncApplicationToSupabase(current[idx]);
    const applicant = getUsers().find(u => u.id === current[idx].userId);
    return applicant ? applicant.name : null;
  }, []);

  const respondInvite = useCallback((appId, action) => {
    const current = getApplications();
    const idx = current.findIndex(a => a.id === appId);
    if (idx < 0) return null;
    const project = getProjects().find(p => p.id === current[idx].projectId);
    if (!project) return null;

    if (action === 'accepted') {
      const acceptedCount = current.filter(a => a.projectId === current[idx].projectId && a.status === 'accepted').length;
      if (acceptedCount >= project.slots) return 'slotsFull';
    }

    current[idx].status = action === 'accepted' ? 'accepted' : 'rejected';
    saveApplications(current);
    setApplications(current);
    syncApplicationToSupabase(current[idx]);
    return action;
  }, []);

  const sendInvite = useCallback((projectId, targetUserId, message) => {
    const current = getApplications();
    if (current.find(a => a.projectId === projectId && a.userId === targetUserId)) return 'already';

    const project = getProjects().find(p => p.id === projectId);
    if (!project) return 'error';
    const acceptedCount = current.filter(a => a.projectId === projectId && a.status === 'accepted').length;
    if (acceptedCount >= project.slots) return 'slotsFull';

    const newInvite = {
      id: generateId(),
      projectId,
      userId: targetUserId,
      status: 'pending',
      invitedBy: userId,
      message: message || '',
      appliedAt: new Date().toISOString()
    };

    current.push(newInvite);
    saveApplications(current);
    setApplications(current);
    syncApplicationToSupabase(newInvite);
    return 'ok';
  }, [userId]);

  // ========================================================================
  // RATINGS
  // ========================================================================
  const saveRatings = useCallback((projectId, ratingMap) => {
    const current = getRatings();
    let saved = false;
    const ratingsToSync = [];

    Object.keys(ratingMap).forEach(ratedUserId => {
      const stars = ratingMap[ratedUserId];
      if (!stars) return;
      const existing = current.findIndex(r => r.projectId === projectId && r.ratedUserId === ratedUserId);
      if (existing >= 0) {
        current[existing].stars = stars;
        current[existing].updatedAt = new Date().toISOString();
        ratingsToSync.push(current[existing]);
      } else {
        const newRating = {
          id: generateId(),
          projectId,
          ratedUserId,
          ratedBy: userId,
          stars,
          createdAt: new Date().toISOString()
        };
        current.push(newRating);
        ratingsToSync.push(newRating);
      }
      saved = true;
    });

    saveRatingsData(current);
    setRatings(current);
    ratingsToSync.forEach(r => syncRatingToSupabase(r));
    return saved;
  }, [userId]);

  const value = {
    user, users, projects, applications, ratings, groups, setGroups, activeGroup, activeGroupId, activeMembership, isActiveGroupAdmin,
    lang, theme, menuOpen, setMenuOpen,
    selectedCategories, setSelectedCategories,
    selectedTechFilters, setSelectedTechFilters,
    isSupabase: isSupabaseConfigured(),
    t, l10n, toggleLang, toggleTheme,
    login, register, logout,
    saveProfile, updateAccount, setAvatar, toggleAvailability, saveFeaturedProjects,
    createProject, changeProjectStatus,
    selectGroup, createGroup, updateGroup, removeGroupMember, requestToJoinGroup, decideGroupRequest, setGroupMemberRole,
    applyToProject, handleApplication, respondInvite, sendInvite,
    saveRatings, refresh
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
