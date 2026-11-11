import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Icon } from './common.jsx';
import { GAME_CATALOG, gamesForGenres } from '../lib/gameCatalog.js';
import { favoriteGenreLabel } from '../lib/talent.js';

/**
 * Selector de juegos. Los géneros favoritos actúan como filtro; sin ninguno
 * marcado se ofrece el catálogo completo, porque en el registro el juego es lo
 * que se elige y el género solo ayuda a acotar.
 *
 * Cada fila es un botón con `aria-pressed`: la casilla de la izquierda es la
 * marca visual y el estado viaja en el propio botón, así que se puede usar con
 * teclado y con lector de pantalla sin duplicar controles.
 *
 * La lista se recorta por altura, no por cantidad: todos los juegos están
 * montados (cien como máximo) y el contenedor hace scroll.
 */
export default function GenreGamesPanel({ selectedGenres = [], selectedGames = [], onToggleGame }) {
  const { t, lang } = useApp();

  const games = useMemo(
    () => (selectedGenres.length > 0 ? gamesForGenres(selectedGenres) : GAME_CATALOG),
    [selectedGenres]
  );

  const chosen = useMemo(() => new Set(selectedGames), [selectedGames]);

  const countLabel = games.length === 1
    ? t('games.countOne')
    : t('games.count', { n: games.length });

  const selectedLabel = selectedGames.length === 1
    ? t('games.selectedOne')
    : t('games.selected', { n: selectedGames.length });

  return (
    <div className="genre-games" role="group" aria-label={t('games.listLabel')}>
      <div className="genre-games-head">
        <span className="genre-games-count">{countLabel}</span>
        <span className="genre-games-selected" aria-live="polite">
          {selectedGames.length > 0 ? selectedLabel : ''}
        </span>
      </div>

      <ul className="genre-games-list">
        {games.map(game => {
          const isOn = chosen.has(game.id);
          return (
            <li className="genre-games-item" key={game.id}>
              <button
                type="button"
                className={`genre-games-row${isOn ? ' is-selected' : ''}`}
                aria-pressed={isOn}
                onClick={() => onToggleGame?.(game.id)}
              >
                <span className="genre-games-box" aria-hidden="true">
                  {isOn && <Icon name="check" size={12} />}
                </span>
                <span className="genre-games-text">
                  <span className="genre-games-name">{game.title}</span>
                  <span className="genre-games-meta">{game.studio} · {game.year}</span>
                </span>
                <span className="genre-games-tag">{favoriteGenreLabel(lang, game.genre)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
