import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Icon } from './common.jsx';
import { favoriteGenreLabel } from '../lib/talent.js';
import {
  gamesForGenre,
  pruneFavoriteGames,
  topGamesForGenre,
  MAX_GAMES_PER_TYPE
} from '../lib/favoriteGames.js';

/**
 * Tags de juegos favoritos por categoría. Cada categoría marcada arriba
 * muestra un campo de texto libre donde la persona escribe sus 2 juegos,
 * y debajo los 2 juegos más repetidos entre la comunidad como sugerencias.
 *
 * En el registro las categorías son géneros; en el perfil son tipos de juego.
 * El valor viaja en `value` como { categoria: [titulo, titulo] }.
 */
export default function FavoriteGamesTags({
  categories = [],
  value = {},
  onChange,
  labelFor = favoriteGenreLabel
}) {
  const { t, lang, users, user } = useApp();
  const [drafts, setDrafts] = useState({});

  const currentValue = pruneFavoriteGames(value, categories);

  const saveCategory = (category, games) => {
    onChange(pruneFavoriteGames({ ...currentValue, [category]: games }, categories));
  };

  const addGame = (category, raw) => {
    const title = String(raw || '').trim();
    if (!title) return;
    const current = gamesForGenre(currentValue, category);
    if (current.length >= MAX_GAMES_PER_TYPE) return;
    if (current.some(name => name.toLocaleLowerCase() === title.toLocaleLowerCase())) return;
    saveCategory(category, [...current, title]);
    setDrafts(prev => ({ ...prev, [category]: '' }));
  };

  const removeGame = (category, name) =>
    saveCategory(category, gamesForGenre(currentValue, category).filter(item => item !== name));

  if (categories.length === 0) {
    return <p className="form-hint favgames-empty">{t('games.selectTypeHint')}</p>;
  }

  const others = (users || []).filter(person => person?.id !== user?.id);

  return (
    <div className="favgames">
      {categories.map(category => {
        const games = gamesForGenre(currentValue, category);
        const taken = new Set(games.map(name => name.toLocaleLowerCase()));
        const full = games.length >= MAX_GAMES_PER_TYPE;
        const top = topGamesForGenre(others, category, 2);
        const label = labelFor(lang, category);
        const draft = drafts[category] || '';

        return (
          <section className="favgames-group" key={category} aria-labelledby={`favgames-${category}`}>
            <h4 className="favgames-title" id={`favgames-${category}`}>{label}</h4>

            <div className="favgames-tags" aria-live="polite">
              {games.length === 0 && <span className="form-hint">{t('games.noGamesYet')}</span>}
              {games.map(name => (
                <span className="favgames-tag" key={name}>
                  {name}
                  <button
                    type="button"
                    className="favgames-remove"
                    aria-label={t('games.remove', { name })}
                    onClick={() => removeGame(category, name)}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </span>
              ))}
            </div>

            <div className="favgames-input-row">
              <input
                type="text"
                value={draft}
                maxLength={80}
                disabled={full}
                placeholder={full ? t('games.maxReached') : t('games.pickPlaceholder')}
                aria-label={`${label}: ${t('games.addLabel')}`}
                onChange={event => setDrafts(prev => ({ ...prev, [category]: event.target.value }))}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addGame(category, draft);
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={full || !draft.trim()}
                onClick={() => addGame(category, draft)}
              >
                {t('games.addLabel')}
              </button>
            </div>

            <div className="favgames-top">
              <span className="favgames-top-title">{t('games.topTitle')}</span>
              {top.length === 0 ? (
                <span className="form-hint">{t('games.topEmpty')}</span>
              ) : (
                <ol className="favgames-top-list">
                  {top.map((item, index) => {
                    const isTaken = taken.has(item.name.toLocaleLowerCase());
                    return (
                      <li key={item.name}>
                        <button
                          type="button"
                          className="favgames-top-item"
                          disabled={full || isTaken}
                          onClick={() => addGame(category, item.name)}
                          title={isTaken ? t('games.alreadyAdded') : t('games.addTop', { name: item.name })}
                        >
                          <span className="favgames-rank">{index + 1}</span>
                          <span className="favgames-top-name">{item.name}</span>
                          <span className="favgames-top-count">{t('games.peopleCount', { n: item.count })}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
