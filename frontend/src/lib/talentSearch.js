// ==========================================================================
// TALENT SEARCH
// Filtrado facetado del buscador de personas. Cada faceta se evalúa por
// separado (OR dentro de la faceta, AND entre facetas) para poder mostrar
// cuántos resultados daría cada opción, como hace Upwork.
// ==========================================================================

import {
  COMPLETED_BUCKETS,
  DISCIPLINES,
  FAVORITE_GENRES,
  GAME_TYPES,
  RATING_BUCKETS,
  completedProjectsCount,
  disciplineIcon,
  disciplineLabel,
  favoriteGenreIcon,
  favoriteGenreLabel,
  gameTypeIcon,
  gameTypeLabel,
  languagesForGameTypes,
  optionTerms,
  userDisciplines,
  userFavoriteGenres,
  userGameTypes,
  userLanguages
} from './talent.js';
import { getUserAvgRating } from './helpers.js';
import { t } from './i18n.js';

export const FACET_KEYS = ['gameTypes', 'languages', 'favoriteGenres', 'disciplines', 'completed', 'rating'];

export function emptyFilters() {
  return {
    gameTypes: [],
    languages: [],
    favoriteGenres: [],
    disciplines: [],
    completed: [],
    rating: []
  };
}

// Cuántas facetas tienen algo seleccionado.
export function activeFilterCount(filters) {
  return FACET_KEYS.reduce((n, key) => n + (filters[key] ? filters[key].length : 0), 0);
}

export function hasAnyFilter(filters, exceptKey) {
  return FACET_KEYS.some(key => key !== exceptKey && filters[key] && filters[key].length > 0);
}

export function toggleValue(list, value) {
  return list.includes(value) ? list.filter(x => x !== value) : [...list, value];
}

// --------------------------------------------------------------------------
// EVALUACIÓN POR FACETA
// --------------------------------------------------------------------------

function matchesGameType(user, values) {
  const own = userGameTypes(user);
  return values.some(v => own.includes(v));
}

function matchesLanguage(user, values) {
  const own = userLanguages(user);
  return values.some(v => own.includes(v));
}

function matchesFavoriteGenre(user, values) {
  const own = userFavoriteGenres(user);
  return values.some(v => own.includes(v));
}

function matchesDiscipline(user, values) {
  const own = userDisciplines(user);
  return values.some(v => own.includes(v));
}

// Bucket = "al menos N proyectos completados". Los buckets seleccionados se
// unions con OR: con [5, 20] también entran quienes tengan 5 o más.
function matchesCompleted(user, values, ctx) {
  if (values.length === 0) return true;
  const done = completedProjectsCount(user.id, ctx.projects, ctx.applications);
  return values.some(min => done >= min);
}

// Bucket = "al menos N estrellas". El 0 es un caso aparte: "sin calificar".
function matchesRating(user, values, ctx) {
  if (values.length === 0) return true;
  const avg = getUserAvgRating(user.id, ctx.ratings || []);
  return values.some(min => (min === 0 ? avg <= 0 : avg >= min));
}

// Cada faceta devuelve true cuando no hay nada seleccionado.
const MATCHERS = {
  gameTypes: matchesGameType,
  languages: matchesLanguage,
  favoriteGenres: matchesFavoriteGenre,
  disciplines: matchesDiscipline,
  completed: matchesCompleted,
  rating: matchesRating
};

export function matchesFacet(user, key, values, ctx) {
  if (!values || values.length === 0) return true;
  return MATCHERS[key](user, values, ctx);
}

// Todas las facetas a la vez.
export function matchesFilters(user, filters, ctx) {
  return FACET_KEYS.every(key => matchesFacet(user, key, filters[key], ctx));
}

// --------------------------------------------------------------------------
// BÚSQUEDA DE TEXTO
// --------------------------------------------------------------------------

// Sin acentos ni mayúsculas: "Programacion" y "programación" son lo mismo.
export function normalizeText(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// La búsqueda acepta varias palabras: "programador 2d, c#" tiene que encontrar
// a alguien con Programación, Plataformas 2D y C#. Cada palabra se busca por
// separado y todas tienen que aparecer.
export function searchTokens(query) {
  return normalizeText(query)
    .split(/[^a-z0-9+#]+/i)
    .filter(tok => tok.length >= 2);
}

// Opciones de las taxonomías con etiqueta visible y alias para buscar.
function facetOptions(user, lang) {
  return [
    ...userGameTypes(user).map(v => ({
      key: 'gameTypes', value: v, text: gameTypeLabel(lang, v), icon: gameTypeIcon(v)
    })),
    ...userLanguages(user).map(v => ({
      key: 'languages', value: v, text: v, icon: ''
    })),
    ...userFavoriteGenres(user).map(v => ({
      key: 'favoriteGenres', value: v, text: favoriteGenreLabel(lang, v), icon: favoriteGenreIcon(v)
    })),
    ...userDisciplines(user).map(v => ({
      key: 'disciplines', value: v, text: disciplineLabel(lang, v), icon: disciplineIcon(v)
    }))
  ];
}

// Texto por el que se puede encontrar a una persona. Incluye las etiquetas de
// sus facetas y sus alias para que escribir "Pixel Art", "Aventura" o
// "programador" encuentre a quien las tenga.
export function searchIndex(user, lang) {
  // El bio puede venir como texto plano o como {es, en}: se indexan los dos
  // idiomas para que la búsqueda no dependa del idioma de la interfaz.
  const bioText = typeof user.bio === 'string'
    ? [user.bio]
    : Object.values(user.bio || {});

  const terms = facetOptions(user, lang).flatMap(o => optionTerms(lang, o.key, o.value));

  return [
    user.name,
    user.username,
    ...bioText,
    ...(user.skills || []),
    ...userLanguages(user),
    ...terms
  ]
    .filter(Boolean)
    .map(normalizeText)
    .join(' ');
}

export function matchesSearch(user, query, lang) {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;
  const index = searchIndex(user, lang);
  return tokens.every(tok => index.includes(tok));
}

// Qué etiquetas mostrar en la tarjeta. Sin filtros ni búsqueda no se muestra
// ninguna: solo la valoración y la bio. Con filtros o búsqueda, aparecen las
// opciones de esa persona que coinciden con lo pedido.
export function revealedOptions(user, filters, query, lang) {
  const selected = new Set();
  FACET_KEYS.forEach(key => (filters[key] || []).forEach(v => selected.add(`${key}:${v}`)));

  const tokens = searchTokens(query);

  // Solo palabras completas: "2d" no tiene que aparecer dentro de "pixel art".
  const matchesToken = (term, tok) => new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(tok)}([^a-z0-9+#]|$)`).test(term);

  return facetOptions(user, lang).filter(o => {
    if (selected.has(`${o.key}:${o.value}`)) return true;
    if (tokens.length === 0) return false;
    const terms = optionTerms(lang, o.key, o.value).map(normalizeText);
    return tokens.some(tok => terms.some(term => matchesToken(term, tok)));
  });
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --------------------------------------------------------------------------
// RESULTADOS
// --------------------------------------------------------------------------

// Aplica filtros + búsqueda y ordena.
export function filterPeople(users, filters, query, lang, ctx) {
  const q = query.trim().toLowerCase();
  return users.filter(u => matchesFilters(u, filters, ctx) && matchesSearch(u, q, lang));
}

export const SORT_OPTIONS = [
  { value: 'relevance', labelKey: 'sort.relevance' },
  { value: 'projects', labelKey: 'sort.projects' },
  { value: 'rating', labelKey: 'sort.rating' },
  { value: 'name', labelKey: 'sort.name' }
];

// Desempate por nombre: sin esto el resultado depende del orden en que
// llegaron los datos y dos personas con la misma métrica pueden intercambiarse
// entre recargas.
const byName = (a, b) => (a.name || '').localeCompare(b.name || '');

export function sortPeople(list, sortBy, ctx) {
  const out = list.slice();
  const done = u => completedProjectsCount(u.id, ctx.projects, ctx.applications);
  const stars = u => getUserAvgRating(u.id, ctx.ratings || []);
  if (sortBy === 'projects') {
    return out.sort((a, b) => done(b) - done(a) || byName(a, b));
  }
  if (sortBy === 'rating') {
    return out.sort((a, b) => stars(b) - stars(a) || done(b) - done(a) || byName(a, b));
  }
  if (sortBy === 'name') {
    return out.sort(byName);
  }
  // Relevancia: a igualdad de búsqueda, primero quien está mejor valorado y
  // después quien más historial tiene.
  return out.sort((a, b) => {
    const sa = stars(a);
    const sb = stars(b);
    if (sa !== sb) return sb - sa;
    return done(b) - done(a) || byName(a, b);
  });
}

// --------------------------------------------------------------------------
// CONTEO POR OPCIÓN
// --------------------------------------------------------------------------

// Cuántas personas habría si se activara cada opción. Se calcula aplicando
// todas las facetas menos la propia: por eso al marcar una opción las demás
// muestran el conteo que realmente They'd dejar.
export function facetCounts(users, filters, query, lang, ctx) {
  const q = query.trim().toLowerCase();
  const base = users.filter(u => matchesSearch(u, q, lang));

  const countsFor = (key, options) => {
    const others = FACET_KEYS.filter(k => k !== key);
    const pool = base.filter(u => others.every(k => matchesFacet(u, k, filters[k], ctx)));
    const out = {};
    options.forEach(opt => {
      // Las opciones son objetos {value, icon}, pero los buckets de proyectos
      // completados son números sueltos.
      const value = (typeof opt === 'string' || typeof opt === 'number') ? opt : opt.value;
      out[value] = pool.filter(u => matchesFacet(u, key, [value], ctx)).length;
    });
    return out;
  };

  return {
    gameTypes: countsFor('gameTypes', GAME_TYPES),
    languages: countsFor('languages', languagesForGameTypes(filters.gameTypes)),
    favoriteGenres: countsFor('favoriteGenres', FAVORITE_GENRES),
    disciplines: countsFor('disciplines', DISCIPLINES),
    completed: countsFor('completed', COMPLETED_BUCKETS),
    rating: countsFor('rating', RATING_BUCKETS)
  };
}

// --------------------------------------------------------------------------
// CHIPS DE FILTROS ACTIVOS
// --------------------------------------------------------------------------

// Lista plana de {key, value, label} para pintar las etiquetas removibles.
export function activeChips(filters, lang) {
  const chips = [];
  filters.gameTypes.forEach(v => chips.push({ key: 'gameTypes', value: v, label: gameTypeLabel(lang, v) }));
  filters.languages.forEach(v => chips.push({ key: 'languages', value: v, label: v }));
  filters.favoriteGenres.forEach(v => chips.push({ key: 'favoriteGenres', value: v, label: favoriteGenreLabel(lang, v) }));
  filters.disciplines.forEach(v => chips.push({ key: 'disciplines', value: v, label: disciplineLabel(lang, v) }));
  filters.completed.forEach(v => chips.push({ key: 'completed', value: v, label: `+${v}` }));
  filters.rating.forEach(v => chips.push({
    key: 'rating',
    value: v,
    label: v === 0 ? t(lang, 'filters.noRating') : `★ ${v}+`
  }));
  return chips;
}
