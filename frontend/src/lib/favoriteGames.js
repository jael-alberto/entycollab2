// ==========================================================================
// JUEGOS FAVORITOS — almacenamiento local
// --------------------------------------------------------------------------
// La API del perfil todavía no tiene un campo para los juegos concretos: solo
// guarda géneros, tipos de juego y disciplinas. Mientras eso no exista, la
// selección se guarda en el navegador, por usuario, para que no se pierda al
// recargar ni al volver a abrir el modal de configuración.
//
// Cuando el backend exponga `favoriteGames`, este archivo se sustituye por
// llamadas al perfil y las pantallas que lo usan no cambian.
// ==========================================================================

const KEY = 'entycollab_favorite_games';

function readAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

/** Ids de los juegos marcados por ese usuario (vacío si no hay ninguno). */
export function getFavoriteGames(userId) {
  if (!userId) return [];
  const stored = readAll()[userId];
  return Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : [];
}

/** Reemplaza la selección guardada de ese usuario. */
export function setFavoriteGames(userId, gameIds) {
  if (!userId) return;
  const all = readAll();
  all[userId] = [...new Set((gameIds || []).filter(id => typeof id === 'string'))];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Modo privado o almacenamiento lleno: la selección vive solo en memoria.
  }
}
