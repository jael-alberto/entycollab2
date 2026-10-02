// ==========================================================================
// TALENT
// Taxonomías del buscador de personas: tipo de juego, lenguajes, géneros
// favoritos, habilidades y proyectos completados.
// Las etiquetas se resuelven con i18n (claves `gt.*`, `fg.*`, `disc.*`).
// ==========================================================================

import { t } from './i18n.js';

// Tipo de juego en el que la persona quiere trabajar
export const GAME_TYPES = [
  { value: '2d-platformer', icon: '🏃' },
  { value: '3d-adventure', icon: '🗺️' },
  { value: 'shooter', icon: '🎯' },
  { value: 'rpg', icon: '🗡️' },
  { value: 'strategy', icon: '🏰' },
  { value: 'puzzle', icon: '🧩' },
  { value: 'survival', icon: '⛺' },
  { value: 'roguelike', icon: '💀' },
  { value: 'metroidvania', icon: '🌀' },
  { value: 'simulation', icon: '🌾' },
  { value: 'sandbox', icon: '🧱' },
  { value: 'multiplayer-online', icon: '🌐' },
  { value: 'vr', icon: '🥽' },
  { value: 'mobile', icon: '📱' },
  { value: 'retro-arcade', icon: '👾' },
  { value: 'tower-defense', icon: '🏹' },
  { value: 'fighting', icon: '🥊' },
  { value: 'racing', icon: '🏎️' },
  { value: 'horror', icon: '👻' },
  { value: 'card-board', icon: '🃏' }
];

// Géneros de juegos más jugados del mundo ("Juegos favoritos")
export const FAVORITE_GENRES = [
  { value: 'casual', icon: '🍬' },
  { value: 'adventure', icon: '🧭' },
  { value: 'shooter', icon: '🔫' },
  { value: 'survival', icon: '🔥' },
  { value: 'horror', icon: '💀' },
  { value: 'rpg', icon: '✨' },
  { value: 'strategy', icon: '♟️' },
  { value: 'simulation', icon: '🚜' },
  { value: 'sports', icon: '⚽' },
  { value: 'racing', icon: '🏁' },
  { value: 'platformer', icon: '🍄' },
  { value: 'puzzle', icon: '🔢' },
  { value: 'multiplayer', icon: '🤝' },
  { value: 'co-op', icon: '👥' },
  { value: 'battle-royale', icon: '🪂' },
  { value: 'moba', icon: '🏟️' },
  { value: 'sandbox', icon: '⛏️' },
  { value: 'metroidvania', icon: '🧬' },
  { value: 'roguelike', icon: '🎲' },
  { value: 'soulslike', icon: '⚔️' },
  { value: 'narrative', icon: '📖' },
  { value: 'rhythm', icon: '🎵' },
  { value: 'tower-defense', icon: '🛡️' },
  { value: 'open-world', icon: '🌍' },
  { value: 'card-board', icon: '🂡' }
];

// Habilidades de la persona dentro de un equipo de videojuegos
export const DISCIPLINES = [
  { value: 'pixel-art', icon: '🟪' },
  { value: 'programming', icon: '💻' },
  { value: 'animation', icon: '🎞️' },
  { value: 'sound', icon: '🔊' },
  { value: 'modeling', icon: '🧊' }
];

// Buckets de proyectos completados en la plataforma (mínimo exigido)
export const COMPLETED_BUCKETS = [1, 3, 5, 10, 20];

// Filtro por valoración: el mínimo de estrellas exigido, más el 0 para
// "sin calificaciones", que es justo el caso de quien recién empieza.
export const RATING_BUCKETS = [4, 3, 1, 0];

// --------------------------------------------------------------------------
// LENGUAJES POR TIPO DE JUEGO
// Al elegir tipo(s) de juego, la faceta de lenguajes muestra solo los
// relevantes; sin selección, muestra la unión de todos.
// --------------------------------------------------------------------------
export const ALL_LANGUAGES = [
  'C#', 'C++', 'C', 'GDScript', 'Lua', 'Python', 'JavaScript', 'TypeScript',
  'Rust', 'Java', 'Kotlin', 'Swift', 'Dart', 'Ruby', 'Blueprints', 'WebAssembly'
];

const LANGUAGES_BY_GAME_TYPE = {
  '2d-platformer': ['C#', 'C++', 'GDScript', 'Lua', 'JavaScript', 'Python', 'Ruby'],
  '3d-adventure': ['C#', 'C++', 'Lua', 'Python', 'Blueprints'],
  shooter: ['C++', 'C#', 'Lua', 'Rust'],
  rpg: ['C#', 'C++', 'Lua', 'Python', 'GDScript', 'Blueprints'],
  strategy: ['C#', 'C++', 'Python', 'TypeScript', 'JavaScript'],
  puzzle: ['C#', 'GDScript', 'Lua', 'JavaScript', 'Python', 'Ruby'],
  survival: ['C#', 'C++', 'Lua', 'Python', 'Rust'],
  roguelike: ['C#', 'GDScript', 'Lua', 'Python', 'Rust'],
  metroidvania: ['C#', 'C++', 'GDScript', 'Lua'],
  simulation: ['C#', 'C++', 'Python', 'JavaScript', 'Rust'],
  sandbox: ['C++', 'C#', 'Lua', 'Python', 'Rust'],
  'multiplayer-online': ['C++', 'C#', 'JavaScript', 'TypeScript', 'Rust', 'Python', 'WebAssembly'],
  vr: ['C++', 'C#', 'C', 'Rust'],
  mobile: ['Kotlin', 'Swift', 'Dart', 'Java', 'C#', 'Lua', 'JavaScript'],
  'retro-arcade': ['C', 'C++', 'Lua', 'Python', 'Rust'],
  'tower-defense': ['C#', 'GDScript', 'Lua', 'TypeScript'],
  fighting: ['C++', 'C#', 'Lua'],
  racing: ['C++', 'C#', 'Lua'],
  horror: ['C#', 'C++', 'Lua', 'Blueprints'],
  'card-board': ['TypeScript', 'JavaScript', 'C#', 'Python', 'WebAssembly']
};

// Lenguajes disponibles según los tipos de juego elegidos.
export function languagesForGameTypes(gameTypes) {
  if (!gameTypes || gameTypes.length === 0) return ALL_LANGUAGES;
  const out = [];
  const seen = new Set();
  gameTypes.forEach(gt => {
    (LANGUAGES_BY_GAME_TYPE[gt] || ALL_LANGUAGES).forEach(lang => {
      if (!seen.has(lang)) {
        seen.add(lang);
        out.push(lang);
      }
    });
  });
  return out;
}

// --------------------------------------------------------------------------
// HELPERS DE DATOS
// --------------------------------------------------------------------------

export function gameTypeLabel(lang, value) {
  return t(lang, `gt.${value}`);
}

export function favoriteGenreLabel(lang, value) {
  return t(lang, `fg.${value}`);
}

export function disciplineLabel(lang, value) {
  return t(lang, `disc.${value}`);
}

// Emojis de cada taxonomía, para usar las etiquetas como icono + texto.
function iconOf(list, value) {
  const found = list.find(o => o.value === value);
  return found ? found.icon : '';
}

export function gameTypeIcon(value) {
  return iconOf(GAME_TYPES, value);
}

export function favoriteGenreIcon(value) {
  return iconOf(FAVORITE_GENRES, value);
}

export function disciplineIcon(value) {
  return iconOf(DISCIPLINES, value);
}

// --------------------------------------------------------------------------
// ALIAS PARA LA BÚSQUEDA
// La gente escribe "programador" o "2d", no "Programación" ni "Plataformas 2D".
// Estas palabras solo alimentan la búsqueda y las etiquetas que se revelan en
// la tarjeta; no aparecen en los filtros.
// --------------------------------------------------------------------------
const SEARCH_ALIASES = {
  gameTypes: {
    '2d-platformer': ['2d', 'plataforma 2d', 'plataformas 2d', 'plataformas'],
    '3d-adventure': ['3d', 'aventura 3d', 'aventuras'],
    'multiplayer-online': ['multijugador', 'online', 'juego en linea'],
    'card-board': ['cartas', 'cartas y tablero', 'tablero', 'boardgame'],
    'retro-arcade': ['retro', 'arcade', 'clasicos'],
    'tower-defense': ['defensa de torres', 'tower defense'],
    shooter: ['disparos', 'shooters'],
    rpg: ['rol', 'rpg'],
    vr: ['realidad virtual', 'vr']
  },
  disciplines: {
    programming: ['programador', 'programadora', 'programacion', 'dev', 'developer', 'codigo', 'code'],
    'pixel-art': ['pixelart', 'pixel art', 'sprites'],
    animation: ['animador', 'animadora', 'animacion'],
    sound: ['sonido', 'audio', 'musica', 'música'],
    modeling: ['modelador', 'modelado', 'modelo']
  },
  favoriteGenres: {
    'open-world': ['mundo abierto', 'open world'],
    'battle-royale': ['battle royale', 'battle royale'],
    'co-op': ['co op', 'cooperativo', 'colaborativo'],
    moba: ['moba', 'arena'],
    rhythm: ['ritmo', 'musical'],
    metroidvania: ['metroidvania', 'metroid vania'],
    roguelike: ['roguelike', 'rogue like']
  }
};

// Etiqueta visible + alias de una opción de una faceta.
export function optionTerms(lang, key, value) {
  const base = key === 'gameTypes' ? gameTypeLabel(lang, value)
    : key === 'favoriteGenres' ? favoriteGenreLabel(lang, value)
      : key === 'disciplines' ? disciplineLabel(lang, value)
        : value;
  return [base, ...((SEARCH_ALIASES[key] || {})[value] || [])];
}

// Proyectos completados en la plataforma: como creador o como participante
// aceptado. Es lo que alimenta la faceta "cantidad de proyectos".
export function completedProjectsCount(userId, projects, applications) {
  const accepted = new Set(
    applications
      .filter(a => a.userId === userId && a.status === 'accepted')
      .map(a => a.projectId)
  );
  return projects.filter(p =>
    p.status === 'completed' && (p.ownerId === userId || accepted.has(p.id))
  ).length;
}

// Lista segura de un campo que puede no existir en usuarios viejos.
function listOf(value) {
  return Array.isArray(value) ? value : [];
}

export function userGameTypes(user) {
  return listOf(user && user.gameTypes);
}

export function userLanguages(user) {
  return listOf(user && user.languages);
}

export function userFavoriteGenres(user) {
  return listOf(user && user.favoriteGenres);
}

export function userDisciplines(user) {
  return listOf(user && user.disciplines);
}

