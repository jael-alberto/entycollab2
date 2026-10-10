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
  groups: 'devcollab_groups',
  currentUser: 'devcollab_current_user',
  activeGroup: 'devcollab_active_group',
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
export function getGroups() { return getData(STORAGE_KEYS.groups); }

export function saveUsers(u) { setData(STORAGE_KEYS.users, u); }
export function saveProjects(p) { setData(STORAGE_KEYS.projects, p); }
export function saveApplications(a) { setData(STORAGE_KEYS.applications, a); }
export function saveRatingsData(r) { setData(STORAGE_KEYS.ratings, r); }
export function saveGroups(groups) { setData(STORAGE_KEYS.groups, groups); }

export function getCurrentUserId() {
  return localStorage.getItem(STORAGE_KEYS.currentUser);
}

export function setCurrentUserId(userId) {
  localStorage.setItem(STORAGE_KEYS.currentUser, userId);
}

export function clearCurrentUserId() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
}

export function getActiveGroupId() { return localStorage.getItem(STORAGE_KEYS.activeGroup); }
export function setActiveGroupId(groupId) {
  if (groupId) localStorage.setItem(STORAGE_KEYS.activeGroup, groupId);
  else localStorage.removeItem(STORAGE_KEYS.activeGroup);
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

// Imágenes de los proyectos de demostración. Solo un tercio tiene imagen a
// propósito: así se ven ambos estados del banner (foto / gradiente con ícono).
const DEMO_PROJECT_IMAGES = {
  proj1: '/img/projects/taskboard.jpg',
  proj2: '/img/projects/apiserver.jpg',
  proj3: '/img/projects/recipes.jpg',
  proj4: '/img/projects/dashboard.jpg',
  proj5: '/img/projects/restaurant.jpg',
  proj6: '/img/projects/community.jpg'
};

// ==========================================================================
// PERFIL DE TALENTO DE LOS USUARIOS DE DEMOSTRACIÓN
// Alimenta el buscador de Personas (tipos de juego, lenguajes, géneros
// favoritos y habilidades). Los usuarios que no figuren acá se
// completan por inferencia desde sus habilidades.
// ==========================================================================
const DEMO_TALENT = {
  demo1: {
    gameTypes: ['mobile', '2d-platformer'], languages: ['JavaScript', 'TypeScript', 'C#', 'Python'],
    favoriteGenres: ['puzzle', 'adventure', 'platformer'], disciplines: ['programming']
  },
  demo2: {
    gameTypes: ['multiplayer-online', 'strategy'], languages: ['Python', 'C#', 'TypeScript'],
    favoriteGenres: ['strategy', 'simulation', 'multiplayer'], disciplines: ['programming']
  },
  demo3: {
    gameTypes: ['mobile', 'card-board'], languages: ['TypeScript', 'JavaScript', 'Dart'],
    favoriteGenres: ['puzzle', 'casual', 'card-board'], disciplines: ['programming']
  },
  demo4: {
    gameTypes: ['multiplayer-online', 'simulation'], languages: ['TypeScript', 'JavaScript', 'Python', 'C#'],
    favoriteGenres: ['multiplayer', 'co-op', 'strategy'], disciplines: ['programming']
  },
  demo5: {
    gameTypes: ['strategy', 'simulation'], languages: ['Python', 'TypeScript', 'C++'],
    favoriteGenres: ['strategy', 'simulation', 'open-world'], disciplines: ['programming']
  },
  demo6: {
    gameTypes: ['2d-platformer', 'puzzle'], languages: ['JavaScript', 'C#', 'Lua'],
    favoriteGenres: ['platformer', 'puzzle', 'rhythm'], disciplines: ['programming', 'animation']
  },
  demo7: {
    gameTypes: ['multiplayer-online', 'racing'], languages: ['Python', 'Rust', 'C++'],
    favoriteGenres: ['racing', 'simulation', 'sports'], disciplines: ['programming']
  },
  demo8: {
    gameTypes: ['mobile', 'card-board'], languages: ['Dart', 'Swift', 'Kotlin', 'Java'],
    favoriteGenres: ['casual', 'card-board', 'rhythm'], disciplines: ['programming']
  },
  demo9: {
    gameTypes: ['rpg', '3d-adventure', 'horror'], languages: ['C#', 'C++', 'Lua'],
    favoriteGenres: ['rpg', 'adventure', 'soulslike', 'open-world'], disciplines: ['programming', 'pixel-art']
  },
  demo10: {
    gameTypes: ['2d-platformer', 'metroidvania', 'roguelike'], languages: ['GDScript', 'Lua', 'Python'],
    favoriteGenres: ['platformer', 'metroidvania', 'roguelike', 'puzzle'],
    disciplines: ['programming', 'pixel-art', 'animation']
  }
};

// Habilidades que delatan un tipo de juego, para los usuarios que no tienen
// el campo guardado (cuentas viejas creadas antes del buscador facetado).
const GAME_TYPE_HINTS = {
  '2d-platformer': ['Aseprite', 'Pixel Art', 'Spine 2D', 'GameMaker'],
  '3d-adventure': ['Unreal Engine', 'Maya', 'ZBrush', 'Substance 3D'],
  shooter: ['Unreal Engine', 'CryEngine', 'Photon', 'Netcode'],
  rpg: ['RPG Maker', 'Unity'],
  strategy: ['Photon', 'Netcode', 'Mirror'],
  puzzle: ['Phaser', 'Defold', 'Godot'],
  survival: ['Unreal Engine', 'CryEngine'],
  roguelike: ['GameMaker', 'Bevy', 'Defold'],
  metroidvania: ['Godot', 'GameMaker'],
  simulation: ['Unity', 'Unreal Engine'],
  sandbox: ['Unreal Engine', 'CryEngine'],
  'multiplayer-online': ['Photon', 'Mirror', 'Netcode'],
  vr: ['Vulkan', 'OpenXR'],
  mobile: ['React Native', 'Flutter', 'Xcode'],
  'retro-arcade': ['GameMaker', 'Defold', 'Raylib'],
  'tower-defense': ['Godot', 'GameMaker'],
  fighting: ['Unreal Engine', 'Unity'],
  racing: ['Unreal Engine', 'CryEngine'],
  horror: ['Unity', 'Unreal Engine'],
  'card-board': ['Phaser', 'Defold']
};

// Un lenguaje aparece en el perfil si está entre las habilidades guardadas.
const LANGUAGE_HINTS = [
  'C#', 'C++', 'GDScript', 'Lua', 'Python', 'JavaScript', 'TypeScript',
  'Rust', 'Java', 'Kotlin', 'Swift', 'Dart', 'Ruby', 'WebAssembly'
];

// Motores, editors y herramientas de arte que revelan la habilidad principal.
const DISCIPLINE_HINTS = {
  'pixel-art': ['Aseprite', 'Pixel Art', 'Photoshop'],
  programming: ['Unity', 'Unreal Engine', 'Godot', 'GameMaker', 'C#', 'C++', 'GDScript', 'Lua', 'Python'],
  animation: ['Spine 2D', 'Maya', 'Houdini', '3ds Max'],
  sound: ['FMOD', 'Wwise', 'Audacity', 'Reaper'],
  modeling: ['Blender', 'Maya', '3ds Max', 'ZBrush', 'Substance 3D', 'Houdini']
};

function inferGameTypes(user) {
  const skills = user.skills || [];
  const found = Object.keys(GAME_TYPE_HINTS).filter(gt =>
    GAME_TYPE_HINTS[gt].some(h => skills.includes(h))
  );
  return found.length > 0 ? found : ['2d-platformer'];
}

function inferLanguages(user) {
  const skills = user.skills || [];
  const found = LANGUAGE_HINTS.filter(l => skills.includes(l));
  return found.length > 0 ? found : ['C#'];
}

function inferDisciplines(user) {
  const skills = user.skills || [];
  const found = Object.keys(DISCIPLINE_HINTS).filter(d =>
    DISCIPLINE_HINTS[d].some(h => skills.includes(h))
  );
  return found.length > 0 ? found : ['programming'];
}

// ==========================================================================
// PROYECTOS COMPLETADOS (historial)
// La faceta "proyectos completados" se calcula del historial real, así que
// hace falta sembrar una梯队 de proyectos ya terminados con repartos
// desiguales: alguien con muchos, alguien con uno solo y alguien sin
// reseñas con ninguno.
// ==========================================================================
const COMPLETED_RUNS = [
  { prefix: 'done-unity', ownerId: 'demo9', tech: ['Unity', 'C#'], count: 12, members: ['demo10', 'demo6', 'demo4'] },
  { prefix: 'done-godot', ownerId: 'demo10', tech: ['Godot', 'GDScript'], count: 5, members: ['demo9'] },
  { prefix: 'done-web1', ownerId: 'demo4', tech: ['React', 'Node.js'], count: 6, members: ['demo5'] },
  { prefix: 'done-web2', ownerId: 'demo5', tech: ['Python', 'Django'], count: 3, members: ['demo4'] },
  { prefix: 'done-web3', ownerId: 'demo7', tech: ['Docker', 'AWS'], count: 8, members: ['demo5'] },
  { prefix: 'done-web4', ownerId: 'demo8', tech: ['Flutter', 'Dart'], count: 1, members: [] },
  { prefix: 'done-web5', ownerId: 'demo6', tech: ['JavaScript', 'CSS'], count: 2, members: ['demo3'] },
  { prefix: 'done-web6', ownerId: 'demo3', tech: ['Vue.js', 'Firebase'], count: 0, members: [] }
];

function completedRuns() {
  const projects = [];
  const apps = [];

  COMPLETED_RUNS.forEach(run => {
    for (let i = 0; i < run.count; i++) {
      const id = `${run.prefix}-${i + 1}`;
      const label = i + 1;
      projects.push({
        id,
        ownerId: run.ownerId,
        title: {
          es: `Proyecto entregado ${label} · ${run.tech[0]}`,
          en: `Delivered project ${label} · ${run.tech[0]}`
        },
        category: 'game',
        slots: 2,
        tech: run.tech,
        description: {
          es: 'Proyecto de demostración ya finalizado. Existe para dar volumen al historial de la persona y que la faceta de proyectos completados tenga resultados.',
          en: 'Demo project already finished. It only exists to give volume to the person\'s history so the completed-projects facet has results.'
        },
        minRating: 1,
        deadline: null,
        repo: null,
        image: null,
        status: 'completed',
        createdAt: '2026-03-10T10:00:00Z'
      });

      // Cada proyecto repartido entre los participantes de la tanda.
      const member = run.members[i % (run.members.length || 1)];
      if (member) {
        apps.push({
          id: `app-${id}`,
          projectId: id,
          userId: member,
          status: 'accepted',
          appliedAt: '2026-03-10T10:00:00Z'
        });
      }
    }
  });

  return { projects, apps };
}

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
    // Perfil de talento: los usuarios viejos no lo tienen. Se completa con
    // la tabla de demo (si el id es conocido) o se infiere de sus habilidades
    // para que no queden fuera de los filtros del buscador.
    if (!Array.isArray(out.gameTypes) || !Array.isArray(out.languages) ||
        !Array.isArray(out.favoriteGenres) || !Array.isArray(out.disciplines)) {
      const talent = DEMO_TALENT[out.id] || {};
      out.gameTypes = Array.isArray(out.gameTypes) ? out.gameTypes : (talent.gameTypes || inferGameTypes(out));
      out.languages = Array.isArray(out.languages) ? out.languages : (talent.languages || inferLanguages(out));
      out.favoriteGenres = Array.isArray(out.favoriteGenres) ? out.favoriteGenres : (talent.favoriteGenres || out.gameTypes);
      out.disciplines = Array.isArray(out.disciplines) ? out.disciplines : (talent.disciplines || inferDisciplines(out));
      changed = true;
    }
    // El nivel de programación se reemplazó por la valoración con estrellas:
    // se borra de los datos guardados para que no quede nada que mostrar.
    if (out.experienceLevel !== undefined || out.experienceYears !== undefined) {
      delete out.experienceLevel;
      delete out.experienceYears;
      changed = true;
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
    // Asignar la imagen a los proyectos demo que todavía no tienen una.
    // Solo completa las vacías: nunca pisa la que haya subido el usuario.
    if (!out.image && DEMO_PROJECT_IMAGES[out.id]) {
      out.image = DEMO_PROJECT_IMAGES[out.id];
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

// Marca de perfil de talento: se inyecta en cada usuario de demo al sembrar
// y también se usa como fuente en la migración de cuentas viejas.
function withTalent(user) {
  const talent = DEMO_TALENT[user.id] || {};
  return {
    ...user,
    gameTypes: talent.gameTypes || [],
    languages: talent.languages || [],
    favoriteGenres: talent.favoriteGenres || [],
    disciplines: talent.disciplines || ['programming']
  };
}

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
  ].map(withTalent);

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
      image: DEMO_PROJECT_IMAGES.proj1,
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
      image: DEMO_PROJECT_IMAGES.proj2,
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
      image: DEMO_PROJECT_IMAGES.proj3,
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
  ].map(withTalent);

  const extraProjects = [
    {
      id: 'proj4', ownerId: 'demo4',
      title: { es: 'Dashboard de Analítica en Tiempo Real', en: 'Real-Time Analytics Dashboard' },
      category: 'web', slots: 3, tech: ['React', 'Node.js', 'Socket.io', 'MongoDB'],
      description: {
        es: 'Panel de métricas con actualización en vivo para equipos de ventas. Incluirá gráficos, filtros y alertas personalizadas.',
        en: 'Live-updating metrics dashboard for sales teams. Will include charts, filters and custom alerts.'
      },
      minRating: 1, deadline: '2026-12-20', repo: null, image: DEMO_PROJECT_IMAGES.proj4, status: 'open', createdAt: '2026-09-01T10:00:00Z'
    },
    {
      id: 'proj5', ownerId: 'demo5',
      title: { es: 'Sistema de Reservas para Restaurantes', en: 'Restaurant Reservation System' },
      category: 'web', slots: 2, tech: ['Python', 'Django', 'PostgreSQL'],
      description: {
        es: 'API para gestionar reservas de mesas en tiempo real, con notificaciones por email y reportes de ocupación.',
        en: 'API to manage table reservations in real time, with email notifications and occupancy reports.'
      },
      minRating: 2, deadline: '2026-12-10', repo: null, image: DEMO_PROJECT_IMAGES.proj5, status: 'open', createdAt: '2026-09-05T10:00:00Z'
    },
    {
      id: 'proj6', ownerId: 'demo6',
      title: { es: 'Portal Web de la Comunidad', en: 'Community Web Portal' },
      category: 'web', slots: 2, tech: ['TypeScript', 'Angular', 'MySQL'],
      description: {
        es: 'Portal para una comunidad de desarrolladores locales: foros, eventos y directorio de miembros.',
        en: 'Portal for a community of local developers: forums, events and a members directory.'
      },
      minRating: 1, deadline: '2026-12-30', repo: null, image: DEMO_PROJECT_IMAGES.proj6, status: 'open', createdAt: '2026-09-08T10:00:00Z'
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

  // Proyectos ya terminados. Sin ellos la faceta "proyectos completados"
  // no tendría nada que filtrar. Se generan en tanda porque son muchos y
  // solo sirven para dar volumen al historial.
  const { projects: doneProjects, apps: doneApps } = completedRuns();

  const allExtraProjects = extraProjects.concat(doneProjects);
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
  ].concat(doneApps);

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

  allExtraProjects.forEach(p => {
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
