import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getUsers, getProjects, getApplications, getRatings,
  saveUsers, saveProjects, saveApplications, saveRatingsData,
  getCurrentUserId, setCurrentUserId, clearCurrentUserId,
  generateId, getTheme, setTheme as storeSetTheme, getLang, setLang as storeSetLang
} from '../lib/store.js';
import { t as i18nT, l10nValue } from '../lib/i18n.js';
import { getUserAvgRating, userCategories } from '../lib/helpers.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [users, setUsers] = useState(() => getUsers());
  const [projects, setProjects] = useState(() => getProjects());
  const [applications, setApplications] = useState(() => getApplications());
  const [ratings, setRatings] = useState(() => getRatings());
  const [userId, setUserId] = useState(() => getCurrentUserId());
  const [lang, setLangState] = useState(() => getLang());
  const [theme, setThemeState] = useState(() => getTheme());
  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTechFilters, setSelectedTechFilters] = useState([]);

  const user = users.find(u => u.id === userId) || null;

  // Resincronizar los datos tras cada cambio (localStorage siempre gana)
  const refresh = useCallback(() => {
    setUsers(getUsers());
    setProjects(getProjects());
    setApplications(getApplications());
    setRatings(getRatings());
    setUserId(getCurrentUserId());
  }, []);

  const setUserInStore = useCallback((id) => {
    setCurrentUserId(id);
    setUserId(id);
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
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme);
  }, [theme]);

  // ========================================================================
  // AUTH
  // ========================================================================
  const login = useCallback((email, password) => {
    const found = getUsers().find(u => u.email === email && u.password === password);
    if (!found) return null;
    setUserInStore(found.id);
    return found;
  }, [setUserInStore]);

  const register = useCallback((data) => {
    const current = getUsers();
    if (current.find(u => u.email === data.email)) return 'email';
    if (current.find(u => u.username === data.username)) return 'username';
    const newUser = {
      id: generateId(),
      name: data.name,
      username: data.username,
      email: data.email,
      password: data.password,
      skills: data.skills,
      categories: userCategories({ skills: data.skills }),
      bio: data.bio,
      // Perfil de talento: arranca vacío. Las cuentas nuevas no aparecen en
      // los filtros hasta que completan tipo de juego y habilidad, y Ajustes
      // avisa de ello. Las estrellas vienen de las reseñas, no se editan aquí.
      gameTypes: [],
      languages: [],
      favoriteGenres: [],
      disciplines: [],
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
    setUserId(null);
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
    }
  }, [userId, refresh]);

  // Edita los datos de la cuenta desde Ajustes. El correo y el usuario
  // siguen siendo únicos, igual que en register(). La contraseña solo se
  // cambia si viene una nueva.
  const updateAccount = useCallback(({ name, username, email, password }) => {
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
    if (password) target.password = password;

    saveUsers(current);
    setUsers(current);
    refresh();
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
    }
  }, [userId, refresh]);

  // ========================================================================
  // PROJECTS
  // ========================================================================
  const createProject = useCallback((data) => {
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
      status: 'open',
      createdAt: new Date().toISOString()
    };
    const current = getProjects();
    current.push(project);
    saveProjects(current);
    setProjects(current);
    return project;
  }, [userId]);

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
    return current[idx];
  }, []);

  // ========================================================================
  // APPLICATIONS
  // ========================================================================
  const applyToProject = useCallback((projectId) => {
    const current = getApplications();
    if (current.find(a => a.projectId === projectId && a.userId === userId)) return 'alreadyApplied';

    const project = getProjects().find(p => p.id === projectId);
    if (project && project.minRating) {
      const userRating = getUserAvgRating(userId, ratings);
      if (userRating < project.minRating) return 'minRating';
    }

    current.push({
      id: generateId(),
      projectId,
      userId,
      status: 'pending',
      appliedAt: new Date().toISOString()
    });
    saveApplications(current);
    setApplications(current);
    return 'ok';
  }, [userId, ratings]);

  const handleApplication = useCallback((appId, newStatus, projectId) => {
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
    saveApplications(current);
    setApplications(current);
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
    return action;
  }, []);

  const sendInvite = useCallback((projectId, targetUserId, message) => {
    const current = getApplications();
    if (current.find(a => a.projectId === projectId && a.userId === targetUserId)) return 'already';

    const project = getProjects().find(p => p.id === projectId);
    if (!project) return 'error';
    const acceptedCount = current.filter(a => a.projectId === projectId && a.status === 'accepted').length;
    if (acceptedCount >= project.slots) return 'slotsFull';

    current.push({
      id: generateId(),
      projectId,
      userId: targetUserId,
      status: 'pending',
      invitedBy: userId,
      message: message || '',
      appliedAt: new Date().toISOString()
    });
    saveApplications(current);
    setApplications(current);
    return 'ok';
  }, [userId]);

  // ========================================================================
  // RATINGS
  // ========================================================================
  const saveRatings = useCallback((projectId, ratingMap) => {
    const current = getRatings();
    let saved = false;
    Object.keys(ratingMap).forEach(ratedUserId => {
      const stars = ratingMap[ratedUserId];
      if (!stars) return;
      const existing = current.findIndex(r => r.projectId === projectId && r.ratedUserId === ratedUserId);
      if (existing >= 0) {
        current[existing].stars = stars;
        current[existing].updatedAt = new Date().toISOString();
      } else {
        current.push({
          id: generateId(),
          projectId,
          ratedUserId,
          ratedBy: userId,
          stars,
          createdAt: new Date().toISOString()
        });
      }
      saved = true;
    });
    saveRatingsData(current);
    setRatings(current);
    return saved;
  }, [userId]);

  const value = {
    user, users, projects, applications, ratings,
    lang, theme, menuOpen, setMenuOpen,
    selectedCategories, setSelectedCategories,
    selectedTechFilters, setSelectedTechFilters,
    t, l10n, toggleLang, toggleTheme,
    login, register, logout,
    saveProfile, updateAccount, setAvatar, toggleAvailability, saveFeaturedProjects,
    createProject, changeProjectStatus,
    applyToProject, handleApplication, respondInvite, sendInvite,
    saveRatings, refresh
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}