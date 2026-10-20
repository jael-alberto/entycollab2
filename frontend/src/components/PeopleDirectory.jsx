import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import PersonCard from './PersonCard.jsx';
import PeopleSidebar from './PeopleSidebar.jsx';
import { Icon } from './common.jsx';
import {
  SORT_OPTIONS,
  activeChips,
  emptyFilters,
  facetCounts,
  filterPeople,
  revealedOptions,
  sortPeople,
  toggleValue
} from '../lib/talentSearch.js';

// Tarjetas por página del grid denso. La paginación es solo presentación:
// no toca el filtrado facetado ni el orden, solo pagina `results`.
const PAGE_SIZE = 12;

// Solo se listan quienes activaron "Estoy disponible para colaborar".
function availableUsers(users) {
  return users.filter(u => u.available === true);
}

// Buscador facetado de personas (sidebar + tarjetas). Se reutiliza tanto en la
// página /personas como dentro del módulo "Personas" de la vista Global.
export default function PeopleDirectory() {
  const { user, users, projects, applications, ratings, lang, t } = useApp();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [sortBy, setSortBy] = useState('relevance');
  const [page, setPage] = useState(1);

  const pool = useMemo(() => availableUsers(users), [users]);
  const ctx = useMemo(
    () => ({ projects, applications, ratings }),
    [projects, applications, ratings]
  );

  const counts = useMemo(
    () => facetCounts(pool, filters, search, lang, ctx),
    [pool, filters, search, lang, ctx]
  );

  const results = useMemo(() => {
    const matched = filterPeople(pool, filters, search, lang, ctx);
    return sortPeople(matched, sortBy, ctx);
  }, [pool, filters, search, lang, sortBy, ctx]);

  const chips = useMemo(() => activeChips(filters, lang), [filters, lang]);

  // El contador de proyectos de la tarjeta solo sale cuando se está
  // mirando esa faceta: con el filtro de historial marcado o con una búsqueda.
  const showCompleted = filters.completed.length > 0 || search.trim() !== '';

  // Qué etiquetas se revelan en cada tarjeta: solo las opciones que esa
  // persona tiene y que coinciden con los filtros o con lo escrito.
  const optionsByUser = useMemo(() => {
    const out = new Map();
    results.forEach(u => out.set(u.id, revealedOptions(u, filters, search, lang)));
    return out;
  }, [results, filters, search, lang]);

  // Al cambiar búsqueda, filtros u orden se vuelve a la primera página.
  useEffect(() => {
    setPage(1);
  }, [search, filters, sortBy]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const removeChip = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: toggleValue(prev[key], value) }));
  };

  const clearAll = () => {
    setFilters(emptyFilters());
    setSearch('');
    setPage(1);
  };

  const resultsLabel = results.length === 1
    ? t('people.resultsOne')
    : t('people.results', { n: results.length });

  const pageLabel = lang === 'en'
    ? `Page ${safePage} of ${totalPages}`
    : `Página ${safePage} de ${totalPages}`;

  const removeFilterLabel = chip => (lang === 'en'
    ? `Remove filter: ${chip.label}`
    : `Quitar filtro: ${chip.label}`);

  return (
    <>
      {/* ====== BÚSQUEDA ====== */}
      <div className="people-search" role="search">
        <label className="b2-visually-hidden" htmlFor="people-search-input">
          {t('people.searchPh')}
        </label>
        <span className="people-search-icon" aria-hidden="true"><Icon name="search" size={16} /></span>
        <input
          id="people-search-input"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('people.searchPh')}
          aria-label={t('people.searchPh')}
          autoComplete="off"
        />
        {search && (
          <button type="button" className="people-search-clear" onClick={() => setSearch('')} aria-label={t('people.clearSearch')}>
            &times;
          </button>
        )}
      </div>

      <div className="people-layout">
        <PeopleSidebar
          filters={filters}
          counts={counts}
          shown={results.length}
          total={pool.length}
          onChange={setFilters}
        />

        <div className="people-results">
          <div className="people-results-head">
            <p className="people-results-count" aria-live="polite">
              {resultsLabel}
              {totalPages > 1 && <span className="people-page-hint"> · {pageLabel}</span>}
            </p>
            <label className="people-sort" htmlFor="people-sort-select">
              <span>{t('people.sortLabel')}</span>
              <select
                id="people-sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                aria-label={t('people.sortLabel')}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="people-chips" role="group" aria-label={t('people.filters')}>
              {chips.map(chip => (
                <button
                  type="button"
                  key={`${chip.key}:${chip.value}`}
                  className="people-chip"
                  onClick={() => removeChip(chip.key, chip.value)}
                  title={t('invite.cancel')}
                  aria-label={removeFilterLabel(chip)}
                >
                  {chip.label}
                  <span className="people-chip-x" aria-hidden="true">&times;</span>
                </button>
              ))}
              <button type="button" className="people-chips-clear" onClick={clearAll}>
                {t('people.clearAll')}
              </button>
            </div>
          )}

          {results.length === 0 ? (
            <div className="empty-state people-empty" role="status">
              <div className="empty-state-icon" aria-hidden="true"><Icon name="search" size={28} /></div>
              <h3>{t('empty.people')}</h3>
              <p>{t('empty.peopleSub')}</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={clearAll}>
                {t('people.clearAll')}
              </button>
            </div>
          ) : (
            <>
              <div className="people-grid people-grid--dense">
                {pageItems.map(u => (
                  <PersonCard
                    key={u.id}
                    person={u}
                    me={user}
                    options={optionsByUser.get(u.id)}
                    showCompleted={showCompleted}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="people-pagination" aria-label={pageLabel}>
                  <button
                    type="button"
                    className="people-page-btn"
                    disabled={safePage === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    aria-label={lang === 'en' ? 'Previous page' : 'Página anterior'}
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      type="button"
                      className={'people-page-btn' + (n === safePage ? ' is-current' : '')}
                      aria-current={n === safePage ? 'page' : undefined}
                      aria-label={(lang === 'en' ? 'Page ' : 'Página ') + n}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="people-page-btn"
                    disabled={safePage === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    aria-label={lang === 'en' ? 'Next page' : 'Página siguiente'}
                  >
                    ›
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
