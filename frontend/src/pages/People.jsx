import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import PersonCard from '../components/PersonCard.jsx';
import PeopleSidebar from '../components/PeopleSidebar.jsx';
import { EmptyState } from '../components/common.jsx';
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

// Solo se listan quienes activaron "Estoy disponible para colaborar".
function availableUsers(users) {
  return users.filter(u => u.available === true);
}

export default function People() {
  const { user, users, projects, applications, ratings, lang, t } = useApp();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [sortBy, setSortBy] = useState('relevance');

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

  const removeChip = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: toggleValue(prev[key], value) }));
  };

  const resultsLabel = results.length === 1
    ? t('people.resultsOne')
    : t('people.results', { n: results.length });

  return (
    <div className="section-block people-page">
      <div className="section-header-row">
        <h2 className="section-title">{t('nav.people')}</h2>
      </div>
      <p className="section-subtitle">{t('people.subtitle')}</p>

      {/* ====== BÚSQUEDA ====== */}
      <div className="people-search">
        <span className="people-search-icon" aria-hidden="true">{t('people.searchIcon')}</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('people.searchPh')}
          aria-label={t('people.searchPh')}
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
            <span className="people-results-count">{resultsLabel}</span>
            <label className="people-sort">
              <span>{t('people.sortLabel')}</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label={t('people.sortLabel')}>
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="people-chips">
              {chips.map(chip => (
                <button
                  type="button"
                  key={`${chip.key}:${chip.value}`}
                  className="people-chip"
                  onClick={() => removeChip(chip.key, chip.value)}
                  title={t('invite.cancel')}
                >
                  {chip.label}
                  <span className="people-chip-x" aria-hidden="true">&times;</span>
                </button>
              ))}
              <button type="button" className="people-chips-clear" onClick={() => setFilters(emptyFilters())}>
                {t('people.clearAll')}
              </button>
            </div>
          )}

          {results.length === 0 ? (
            <EmptyState icon="🔍" title={t('empty.people')} sub={t('empty.peopleSub')} />
          ) : (
            <div className="people-grid">
              {results.map(u => (
                <PersonCard
                  key={u.id}
                  person={u}
                  me={user}
                  options={optionsByUser.get(u.id)}
                  showCompleted={showCompleted}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
