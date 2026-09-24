// ==========================================================================
// DATA STORE (localStorage)
// Capa de datos portada de app.js: mismas claves, seeds y migraciones.
// ==========================================================================

import { userCategories } from './helpers.js';

export const STORAGE_KEYS = {
  users: 'devcollab_users',
  projects: 'devcollab_projects',
  applications: 'devcollab_applications',
  ratings: 'devcollab_ratings',
  currentUser: 'devcollab_current_user',
  theme: 'devcollab_theme',
  lang: 'devcollab_lang'
};

export function getData(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

export function setData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getUsers() { return getData(STORAGE_KEYS.users); }
export function getProjects() { return getData(STORAGE_KEYS.projects); }
export function getApplications() { return getData(STORAGE_KEYS.applications); }
export function getRatings() { return getData(STORAGE_KEYS.ratings); }

export function saveUsers(u) { setData(STORAGE_KEYS.users, u); }
export function saveProjects(p) { setData(STORAGE_KEYS.projects, p); }
export function saveApplications(a) { setData(STORAGE_KEYS.applications, a); }
export function saveRatingsData(r) { setData(STORAGE_KEYS.ratings, r); }

export function getCurrentUserId() {
  return localStorage.getItem(STORAGE_KEYS.currentUser);
}

export function setCurrentUserId(userId) {
  localStorage.setItem(STORAGE_KEYS.currentUser, userId);
}

export function clearCurrentUserId() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
}

export function getCurrentUser() {
  const uid = getCurrentUserId();
  if (!uid) return null;
  return getUsers().find(u => u.id === uid) || null;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) === 'dark';
}

export function setTheme(dark) {
  localStorage.setItem(STORAGE_KEYS.theme, dark ? 'dark' : 'light');
}

export function getLang() {
  return localStorage.getItem(STORAGE_KEYS.lang) || (navigator.language.startsWith('en') ? 'en' : 'es');
}

export function setLang(lang) {
  localStorage.setItem(STORAGE_KEYS.lang, lang);
}

// ==========================================================================
// MIGRACIONES
// ==========================================================================

export function migrateLegacyData() {
  let changed = false;

  // Usuarios viejos sin "available"
  const users = getUsers().map(u => {
    const out = { ...u };
    if (typeof out.available !== 'boolean') {
      out.available = false;
      changed = true;
    }
    // Categorías nuevas: inferirlas desde las habilidades del usuario
    if (!Array.isArray(out.categories) || out.categories.length === 0) {
      const derived = userCategories(out);
      if (derived.length > 0) {
        out.categories = derived;
        changed = true;
      }
    }
    return out;
  });
  if (changed) saveUsers(users);
  changed = false;

  // Proyectos viejos sin minRating o con "requirements" de texto
  const projects = getProjects().map(p => {
    const out = { ...p };
    if (typeof out.minRating !== 'number') {
      out.minRating = 1;
      changed = true;
    }
    if ('requirements' in out) {
      delete out.requirements;
      changed = true;
    }
    if (!Array.isArray(out.tech)) {
      out.tech = [];
      changed = true;
    }
    // Las categorías "backend"/"devops" ya no existen: se agrupan en "web"
    if (out.category === 'backend' || out.category === 'devops') {
      out.category = 'web';
      changed = true;
    }
    return out;
  });
  if (changed) saveProjects(projects);

  // Datos demo guardados como texto simple -> contenido bilingüe
  upgradeDemoContent();
}

// Convierte las bios y descripciones de los datos de demostración ya
// guardados en localStorage a objetos {es, en} con ambos idiomas.
function upgradeDemoContent() {
  const bios = {
    demo1: {
      es: 'Desarrolladora full stack con 3 años de experiencia. Apasionada por crear aplicaciones web modernas y escalables.',
      en: 'Full stack developer with 3 years of experience. Passionate about building modern and scalable web applications.'
    },
    demo2: {
      es: 'Ingeniero de software enfocado en backend y arquitectura de microservicios.',
      en: 'Software engineer focused on backend and microservices architecture.'
    },
    demo3: {
      es: 'Frontend developer y diseñadora UI/UX. Me encanta crear interfaces elegantes y funcionales.',
      en: 'Frontend developer and UI/UX designer. I love creating elegant and functional interfaces.'
    },
    demo4: {
      es: 'Desarrollador frontend especializado en React y Next.js. Me gusta el diseño de interfaces y el performance web.',
      en: 'Frontend developer specialized in React and Next.js. I enjoy interface design and web performance.'
    },
    demo5: {
      es: 'Backend developer y entusiasta del data. Construyo APIs escalables en la nube.',
      en: 'Backend developer and data enthusiast. I build scalable APIs in the cloud.'
    },
    demo6: {
      es: 'Full stack web con amor por el frontend. Experiencia con aplicaciones empresariales.',
      en: 'Web full stack with a love for frontend. Experience with enterprise applications.'
    },
    demo7: {
      es: 'Ingeniera de plataformas. Microservicios, contenedores y CI/CD son mi día a día.',
      en: 'Platform engineer. Microservices, containers and CI/CD are my daily routine.'
    },
    demo8: {
      es: 'Mobile developer en Flutter. Apps nativas multiplataforma con UI cuidada.',
      en: 'Mobile developer in Flutter. Cross-platform native apps with careful UI.'
    }
  };

  const titles = {
    proj1: { es: 'Plataforma de Gestión de Tareas Colaborativas', en: 'Collaborative Task Management Platform' },
    proj2: { es: 'API REST para Sistema de E-learning', en: 'REST API for E-learning System' },
    proj3: { es: 'App Móvil de Recetas con IA', en: 'AI Recipe Mobile App' },
    proj4: { es: 'Dashboard de Analítica en Tiempo Real', en: 'Real-Time Analytics Dashboard' },
    proj5: { es: 'Sistema de Reservas para Restaurantes', en: 'Restaurant Reservation System' },
    proj6: { es: 'Portal Web de la Comunidad', en: 'Community Web Portal' },
    proj7: { es: 'Gateway de Microservicios', en: 'Microservices Gateway' }
  };

  const descriptions = {
    proj1: {
      es: 'Busco programadores para crear una plataforma tipo Trello pero con funcionalidades avanzadas de colaboración en tiempo real, incluyendo chat, asignación de tareas y dashboards de progreso.',
      en: 'Looking for developers to build a Trello-like platform with advanced real-time collaboration features, including chat, task assignment and progress dashboards.'
    },
    proj2: {
      es: 'Necesito desarrolladores backend para construir una API robusta para una plataforma de cursos online. Incluirá autenticación JWT, sistema de pagos y streaming de video.',
      en: 'I need backend developers to build a robust API for an online course platform. It will include JWT authentication, a payment system and video streaming.'
    },
    proj3: {
      es: 'Creando una aplicación móvil que sugiere recetas basándose en los ingredientes que el usuario tiene en la cocina, usando inteligencia artificial para el reconocimiento de imágenes.',
      en: 'Building a mobile app that suggests recipes based on the ingredients you have in your kitchen, using AI for image recognition.'
    },
    proj4: {
      es: 'Panel de métricas con actualización en vivo para equipos de ventas. Incluirá gráficos, filtros y alertas personalizadas.',
      en: 'Live-updating metrics dashboard for sales teams. Will include charts, filters and custom alerts.'
    },
    proj5: {
      es: 'API para gestionar reservas de mesas en tiempo real, con notificaciones por email y reportes de ocupación.',
      en: 'API to manage table reservations in real time, with email notifications and occupancy reports.'
    },
    proj6: {
      es: 'Portal para una comunidad de desarrolladores locales: foros, eventos y directorio de miembros.',
      en: 'Portal for a community of local developers: forums, events and a members directory.'
    },
    proj7: {
      es: 'API gateway para orquestar microservicios con autenticación centralizada, rate limiting y observabilidad.',
      en: 'API gateway to orchestrate microservices with centralized authentication, rate limiting and observability.'
    }
  };

  let uChanged = false;
  const users = getUsers().map(u => {
    const out = { ...u };
    const b = bios[u.id];
    if (b && typeof out.bio === 'string') {
      out.bio = b;
      uChanged = true;
    }
    return out;
  });
  if (uChanged) saveUsers(users);

  let pChanged = false;
  const projects = getProjects().map(p => {
    const out = { ...p };
    const ti = titles[p.id];
    if (ti && typeof out.title === 'string') {
      out.title = ti;
      pChanged = true;
    }
    const d = descriptions[p.id];
    if (d && typeof out.description === 'string') {
      out.description = d;
      pChanged = true;
    }
    return out;
  });
  if (pChanged) saveProjects(projects);
}

// ==========================================================================
// SEEDS
// ==========================================================================

export function seedDemoData() {
  const demoUsers = [
    {
      id: 'demo1',
      name: 'María García',
      username: 'mariagar',
      email: 'maria@demo.com',
      password: '123456',
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
      categories: ['web'],
      bio: {
        es: 'Desarrolladora full stack con 3 años de experiencia. Apasionada por crear aplicaciones web modernas y escalables.',
        en: 'Full stack developer with 3 years of experience. Passionate about building modern and scalable web applications.'
      },
      createdAt: '2026-01-15T10:00:00Z'
    },
    {
      id: 'demo2',
      name: 'Carlos López',
      username: 'carloslop',
      email: 'carlos@demo.com',
      password: '123456',
      skills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
      categories: ['web'],
      bio: {
        es: 'Ingeniero de software enfocado en backend y arquitectura de microservicios.',
        en: 'Software engineer focused on backend and microservices architecture.'
      },
      available: true,
      createdAt: '2026-02-10T10:00:00Z'
    },
    {
      id: 'demo3',
      name: 'Ana Martínez',
      username: 'anamart',
      email: 'ana@demo.com',
      password: '123456',
      skills: ['TypeScript', 'Vue.js', 'Tailwind CSS', 'Firebase'],
      categories: ['web'],
      bio: {
        es: 'Frontend developer y diseñadora UI/UX. Me encanta crear interfaces elegantes y funcionales.',
        en: 'Frontend developer and UI/UX designer. I love creating elegant and functional interfaces.'
      },
      available: true,
      createdAt: '2026-03-05T10:00:00Z'
    }
  ];

  const demoProjects = [
    {
      id: 'proj1',
      ownerId: 'demo1',
      title: {
        es: 'Plataforma de Gestión de Tareas Colaborativas',
        en: 'Collaborative Task Management Platform'
      },
      category: 'web',
      slots: 3,
      tech: ['React', 'Node.js', 'MongoDB', 'Socket.io'],
      description: {
        es: 'Busco programadores para crear una plataforma tipo Trello pero con funcionalidades avanzadas de colaboración en tiempo real, incluyendo chat, asignación de tareas y dashboards de progreso.',
        en: 'Looking for developers to build a Trello-like platform with advanced real-time collaboration features, including chat, task assignment and progress dashboards.'
      },
      minRating: 2,
      deadline: '2026-12-01',
      repo: 'https://github.com/demo/task-manager',
      status: 'open',
      createdAt: '2026-08-20T10:00:00Z'
    },
    {
      id: 'proj2',
      ownerId: 'demo2',
      title: {
        es: 'API REST para Sistema de E-learning',
        en: 'REST API for E-learning System'
      },
      category: 'web',
      slots: 2,
      tech: ['Python', 'Django REST Framework', 'PostgreSQL', 'Redis'],
      description: {
        es: 'Necesito desarrolladores backend para construir una API robusta para una plataforma de cursos online. Incluirá autenticación JWT, sistema de pagos y streaming de video.',
        en: 'I need backend developers to build a robust API for an online course platform. It will include JWT authentication, a payment system and video streaming.'
      },
      minRating: 3,
      deadline: '2026-11-15',
      repo: null,
      status: 'in-progress',
      createdAt: '2026-07-10T10:00:00Z'
    },
    {
      id: 'proj3',
      ownerId: 'demo3',
      title: {
        es: 'App Móvil de Recetas con IA',
        en: 'AI Recipe Mobile App'
      },
      category: 'mobile',
      slots: 2,
      tech: ['React Native', 'Python', 'TensorFlow Lite', 'Firebase'],
      description: {
        es: 'Creando una aplicación móvil que sugiere recetas basándose en los ingredientes que el usuario tiene en la cocina, usando inteligencia artificial para el reconocimiento de imágenes.',
        en: 'Building a mobile app that suggests recipes based on the ingredients you have in your kitchen, using AI for image recognition.'
      },
      minRating: 1,
      deadline: '2027-01-20',
      repo: 'https://github.com/demo/recipe-ai',
      status: 'open',
      createdAt: '2026-08-25T10:00:00Z'
    }
  ];

  saveUsers(demoUsers);
  saveProjects(demoProjects);
  saveApplications([]);
  saveRatingsData([]);
}

// Personas de ejemplo adicionales (solo se agregan si no existen; no borra datos reales)
export function seedDemoExtraData() {
  const extraUsers = [
    {
      id: 'demo4', name: 'Luis Ramírez', username: 'luisram', email: 'luis@demo.com', password: '123456',
      skills: ['JavaScript', 'React', 'Next.js', 'Node.js'],
      categories: ['web'],
      bio: {
        es: 'Desarrollador frontend especializado en React y Next.js. Me gusta el diseño de interfaces y el performance web.',
        en: 'Frontend developer specialized in React and Next.js. I enjoy interface design and web performance.'
      },
      available: true, createdAt: '2026-03-20T10:00:00Z'
    },
    {
      id: 'demo5', name: 'Sofía Herrera', username: 'sofiaher', email: 'sofia@demo.com', password: '123456',
      skills: ['Python', 'Django', 'PostgreSQL', 'AWS'],
      categories: ['web'],
      bio: {
        es: 'Backend developer y entusiasta del data. Construyo APIs escalables en la nube.',
        en: 'Backend developer and data enthusiast. I build scalable APIs in the cloud.'
      },
      available: true, createdAt: '2026-04-02T10:00:00Z'
    },
    {
      id: 'demo6', name: 'Diego Torres', username: 'diegotor', email: 'diego@demo.com', password: '123456',
      skills: ['TypeScript', 'Angular', 'CSS', 'MySQL'],
      categories: ['web'],
      bio: {
        es: 'Full stack web con amor por el frontend. Experiencia con aplicaciones empresariales.',
        en: 'Web full stack with a love for frontend. Experience with enterprise applications.'
      },
      available: true, createdAt: '2026-05-11T10:00:00Z'
    },
    {
      id: 'demo7', name: 'Valentina Rojas', username: 'valerojas', email: 'vale@demo.com', password: '123456',
      skills: ['Go', 'Docker', 'Kubernetes', 'AWS'],
      categories: ['web'],
      bio: {
        es: 'Ingeniera de plataformas. Microservicios, contenedores y CI/CD son mi día a día.',
        en: 'Platform engineer. Microservices, containers and CI/CD are my daily routine.'
      },
      available: true, createdAt: '2026-05-28T10:00:00Z'
    },
    {
      id: 'demo8', name: 'Mateo Silva', username: 'mateosil', email: 'mateo@demo.com', password: '123456',
      skills: ['Flutter', 'Dart', 'Firebase'],
      categories: ['mobile'],
      bio: {
        es: 'Mobile developer en Flutter. Apps nativas multiplataforma con UI cuidada.',
        en: 'Mobile developer in Flutter. Cross-platform native apps with careful UI.'
      },
      available: true, createdAt: '2026-06-15T10:00:00Z'
    },
    {
      id: 'demo9', name: 'Andrés Castillo', username: 'andrescas', email: 'andres@demo.com', password: '123456',
      skills: ['Unity', 'C#', 'Blender', 'Aseprite'],
      categories: ['game'],
      bio: {
        es: 'Desarrollador de videojuegos en Unity. Me apasiona el game feel, la programación de gameplay y el pixel art.',
        en: 'Unity game developer. Passionate about game feel, gameplay programming and pixel art.'
      },
      available: true, createdAt: '2026-06-25T10:00:00Z'
    },
    {
      id: 'demo10', name: 'Camila Ríos', username: 'camilarios', email: 'camila@demo.com', password: '123456',
      skills: ['Godot', 'GDScript', 'Aseprite', 'Pixel Art'],
      categories: ['game'],
      bio: {
        es: 'Game designer y desarrolladora en Godot. Creo mecánicas, niveles y arte pixel art para juegos 2D.',
        en: 'Game designer and developer in Godot. I create mechanics, levels and pixel art for 2D games.'
      },
      available: true, createdAt: '2026-07-02T10:00:00Z'
    }
  ];

  const extraProjects = [
    {
      id: 'proj4', ownerId: 'demo4',
      title: { es: 'Dashboard de Analítica en Tiempo Real', en: 'Real-Time Analytics Dashboard' },
      category: 'web', slots: 3, tech: ['React', 'Node.js', 'Socket.io', 'MongoDB'],
      description: {
        es: 'Panel de métricas con actualización en vivo para equipos de ventas. Incluirá gráficos, filtros y alertas personalizadas.',
        en: 'Live-updating metrics dashboard for sales teams. Will include charts, filters and custom alerts.'
      },
      minRating: 1, deadline: '2026-12-20', repo: null, status: 'open', createdAt: '2026-09-01T10:00:00Z'
    },
    {
      id: 'proj5', ownerId: 'demo5',
      title: { es: 'Sistema de Reservas para Restaurantes', en: 'Restaurant Reservation System' },
      category: 'web', slots: 2, tech: ['Python', 'Django', 'PostgreSQL'],
      description: {
        es: 'API para gestionar reservas de mesas en tiempo real, con notificaciones por email y reportes de ocupación.',
        en: 'API to manage table reservations in real time, with email notifications and occupancy reports.'
      },
      minRating: 2, deadline: '2026-12-10', repo: null, status: 'open', createdAt: '2026-09-05T10:00:00Z'
    },
    {
      id: 'proj6', ownerId: 'demo6',
      title: { es: 'Portal Web de la Comunidad', en: 'Community Web Portal' },
      category: 'web', slots: 2, tech: ['TypeScript', 'Angular', 'MySQL'],
      description: {
        es: 'Portal para una comunidad de desarrolladores locales: foros, eventos y directorio de miembros.',
        en: 'Portal for a community of local developers: forums, events and a members directory.'
      },
      minRating: 1, deadline: '2026-12-30', repo: null, status: 'open', createdAt: '2026-09-08T10:00:00Z'
    },
    {
      id: 'proj7', ownerId: 'demo7',
      title: { es: 'Gateway de Microservicios', en: 'Microservices Gateway' },
      category: 'web', slots: 2, tech: ['Go', 'Docker', 'Kubernetes'],
      description: {
        es: 'API gateway para orquestar microservicios con autenticación centralizada, rate limiting y observabilidad.',
        en: 'API gateway to orchestrate microservices with centralized authentication, rate limiting and observability.'
      },
      minRating: 3, deadline: '2027-01-15', repo: 'https://github.com/demo/api-gateway', status: 'open', createdAt: '2026-09-10T10:00:00Z'
    },
    {
      id: 'proj8', ownerId: 'demo9',
      title: { es: 'RPG de Fantasía 2D', en: '2D Fantasy RPG' },
      category: 'game', slots: 3, tech: ['Unity', 'C#', 'Aseprite'],
      description: {
        es: 'Juego RPG 2D con combate por turnos, mapa de mundo y diálogos. Busco programadores de gameplay y artistas de pixel art para acelerar el desarrollo.',
        en: '2D RPG with turn-based combat, world map and dialogues. Looking for gameplay programmers and pixel art artists to speed up development.'
      },
      minRating: 1, deadline: '2027-03-01', repo: 'https://github.com/demo/fantasy-rpg', status: 'open', createdAt: '2026-09-12T10:00:00Z'
    },
    {
      id: 'proj9', ownerId: 'demo10',
      title: { es: 'Plataformas Pixel Art', en: 'Pixel Art Platformer' },
      category: 'game', slots: 4, tech: ['Godot', 'GDScript', 'Aseprite'],
      description: {
        es: 'Plataformas 2D con estética pixel art, niveles desafiantes y speedrun. Necesito diseñadores de niveles y artistas para los sprites y animaciones.',
        en: '2D platformer with pixel art aesthetics, challenging levels and speedrun mode. I need level designers and artists for sprites and animations.'
      },
      minRating: 2, deadline: '2027-04-15', repo: null, status: 'open', createdAt: '2026-09-15T10:00:00Z'
    }
  ];

  // Aceptados (participaciones) que alimentan las referencias de cada persona
  const extraApps = [
    { id: 'app-ref-1', projectId: 'proj2', userId: 'demo4', status: 'accepted', appliedAt: '2026-08-01T10:00:00Z' },
    { id: 'app-ref-2', projectId: 'proj1', userId: 'demo5', status: 'accepted', appliedAt: '2026-08-22T10:00:00Z' },
    { id: 'app-ref-3', projectId: 'proj3', userId: 'demo5', status: 'accepted', appliedAt: '2026-08-26T10:00:00Z' },
    { id: 'app-ref-4', projectId: 'proj1', userId: 'demo6', status: 'accepted', appliedAt: '2026-08-21T10:00:00Z' },
    { id: 'app-ref-5', projectId: 'proj5', userId: 'demo7', status: 'accepted', appliedAt: '2026-09-06T10:00:00Z' },
    { id: 'app-ref-6', projectId: 'proj4', userId: 'demo8', status: 'accepted', appliedAt: '2026-09-03T10:00:00Z' },
    { id: 'app-ref-7', projectId: 'proj3', userId: 'demo8', status: 'accepted', appliedAt: '2026-08-27T10:00:00Z' },
    { id: 'app-ref-8', projectId: 'proj8', userId: 'demo10', status: 'accepted', appliedAt: '2026-09-16T10:00:00Z' },
    { id: 'app-ref-9', projectId: 'proj9', userId: 'demo9', status: 'accepted', appliedAt: '2026-09-18T10:00:00Z' }
  ];

  const extraRatings = [
    { id: 'rating-6', projectId: 'proj2', ratedUserId: 'demo2', ratedBy: 'demo1', stars: 5, createdAt: '2026-08-05T10:00:00Z' },
    { id: 'rating-7', projectId: 'proj3', ratedUserId: 'demo3', ratedBy: 'demo1', stars: 4, createdAt: '2026-08-30T10:00:00Z' },
    { id: 'rating-8', projectId: 'proj2', ratedUserId: 'demo4', ratedBy: 'demo2', stars: 5, createdAt: '2026-09-02T10:00:00Z' },
    { id: 'rating-9', projectId: 'proj3', ratedUserId: 'demo5', ratedBy: 'demo3', stars: 5, createdAt: '2026-09-04T10:00:00Z' },
    { id: 'rating-10', projectId: 'proj1', ratedUserId: 'demo5', ratedBy: 'demo1', stars: 4, createdAt: '2026-09-01T10:00:00Z' },
    { id: 'rating-11', projectId: 'proj1', ratedUserId: 'demo6', ratedBy: 'demo1', stars: 4, createdAt: '2026-09-01T10:00:00Z' },
    { id: 'rating-12', projectId: 'proj5', ratedUserId: 'demo7', ratedBy: 'demo5', stars: 5, createdAt: '2026-09-11T10:00:00Z' },
    { id: 'rating-13', projectId: 'proj4', ratedUserId: 'demo8', ratedBy: 'demo4', stars: 5, createdAt: '2026-09-05T10:00:00Z' },
    { id: 'rating-14', projectId: 'proj8', ratedUserId: 'demo9', ratedBy: 'demo10', stars: 5, createdAt: '2026-09-17T10:00:00Z' },
    { id: 'rating-15', projectId: 'proj9', ratedUserId: 'demo10', ratedBy: 'demo9', stars: 4, createdAt: '2026-09-19T10:00:00Z' }
  ];

  const users = getUsers();
  const projects = getProjects();
  const apps = getApplications();
  const ratings = getRatings();
  let changed = false;

  extraUsers.forEach(u => {
    if (!users.some(x => x.id === u.id) && !users.some(x => x.email === u.email)) {
      users.push(u);
      changed = true;
    }
  });

  extraProjects.forEach(p => {
    if (!projects.some(x => x.id === p.id)) {
      projects.push(p);
      changed = true;
    }
  });

  extraApps.forEach(a => {
    if (!apps.some(x => x.projectId === a.projectId && x.userId === a.userId)) {
      apps.push(a);
      changed = true;
    }
  });

  extraRatings.forEach(r => {
    if (!ratings.some(x => x.projectId === r.projectId && x.ratedUserId === r.ratedUserId)) {
      ratings.push(r);
      changed = true;
    }
  });

  if (changed) {
    saveUsers(users);
    saveProjects(projects);
    saveApplications(apps);
    saveRatingsData(ratings);
  }
}

// Inicialización idempotente (seed + migraciones) llamada una vez al arrancar
export function bootstrap() {
  if (getUsers().length === 0) {
    seedDemoData();
  }
  migrateLegacyData();
  seedDemoExtraData();
}