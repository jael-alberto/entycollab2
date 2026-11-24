// ==========================================================================
// JUEGOS FAVORITOS POR TIPO
// --------------------------------------------------------------------------
// Se guardan en el perfil (columna `favorite_games`) como:
//   { "shooter": ["Doom", "Halo"], "rpg": ["Baldur’s Gate 3"] }
// Máximo 2 juegos por tipo. Los nombres los escribe libremente la persona,
// sin limitarse al catálogo. El ranking "top 2" se calcula con los perfiles ya
// cargados en el store, sin necesidad de otro endpoint.
// ==========================================================================

export const MAX_GAMES_PER_TYPE = 2;

export function normalizeFavoriteGames(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [genre, games] of Object.entries(value)) {
    if (!Array.isArray(games)) continue;
    const clean = games
      .filter(game => typeof game === 'string')
      .map(game => game.trim())
      .filter(Boolean)
      .slice(0, MAX_GAMES_PER_TYPE);
    if (clean.length > 0) result[genre] = clean;
  }
  return result;
}

export function gamesForGenre(favoriteGames, genre) {
  const games = favoriteGames && typeof favoriteGames === 'object' ? favoriteGames[genre] : null;
  if (!Array.isArray(games)) return [];
  return games
    .filter(game => typeof game === 'string')
    .map(game => game.trim())
    .filter(Boolean);
}

// Conserva solo las categorías marcadas y hasta 2 nombres por categoría.
// Los títulos son texto libre, así que no se validan contra ningún catálogo;
// sí se descartan duplicados (sin importar mayúsculas) al guardar.
export function pruneFavoriteGames(value, selectedCategories = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const chosen = new Set(selectedCategories || []);
  const result = {};

  for (const [genre, games] of Object.entries(value)) {
    if (!chosen.has(genre) || !Array.isArray(games)) continue;
    const seen = new Set();
    const kept = [];
    for (const game of games) {
      if (typeof game !== 'string') continue;
      const name = game.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(name);
      if (kept.length === MAX_GAMES_PER_TYPE) break;
    }
    if (kept.length > 0) result[genre] = kept;
  }
  return result;
}

export function allFavoriteGameNames(favoriteGames) {
  return Object.values(normalizeFavoriteGames(favoriteGames)).flat();
}

export function withoutGenre(favoriteGames, genre) {
  const next = normalizeFavoriteGames(favoriteGames);
  delete next[genre];
  return next;
}

// Juegos más repetidos entre la comunidad para un tipo, con desempate
// alfabético para que el orden sea estable.
export function topGamesForGenre(users, genre, limit = 2) {
  const counts = new Map();
  for (const user of users || []) {
    for (const name of gamesForGenre(user?.favoriteGames, genre)) {
      const key = name.toLocaleLowerCase();
      const entry = counts.get(key) || { name, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}
