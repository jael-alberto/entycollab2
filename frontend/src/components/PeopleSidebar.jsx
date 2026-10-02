import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  COMPLETED_BUCKETS,
  DISCIPLINES,
  FAVORITE_GENRES,
  GAME_TYPES,
  RATING_BUCKETS,
  languagesForGameTypes
} from '../lib/talent.js';
import { activeFilterCount, emptyFilters, toggleValue } from '../lib/talentSearch.js';

// Cuántas opciones se muestran antes del "Ver más".
const PREVIEW = 8;

// Un renglón del sidebar: título + cantidad de personas que devolvería.
function Facet({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="facet">
      <button type="button" className="facet-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="facet-title">{title}</span>
        <span className="facet-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="facet-body">{children}</div>}
    </section>
  );
}

// Una opción con su conteo. Las que darían 0 se atenúan para no invites a
// marcar filtros que no van a mostrar nada.
function FacetOption({ label, icon, count, checked, onChange }) {
  const empty = count === 0 && !checked;
  return (
    <label className={'facet-option' + (checked ? ' is-checked' : '') + (empty ? ' is-empty' : '')}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {icon && <span className="facet-option-icon" aria-hidden="true">{icon}</span>}
      <span className="facet-option-label">{label}</span>
      <span className="facet-option-count">{count}</span>
    </label>
  );
}

// Lista que muestra las primeras PREVIEW opciones y el resto con "Ver más".
function OptionList({ options, selected, counts, onToggle, renderLabel }) {
  const { t } = useApp();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, PREVIEW);

  return (
    <>
      <div className="facet-options">
        {visible.map(opt => {
          const value = typeof opt === 'string' ? opt : opt.value;
          return (
            <FacetOption
              key={value}
              icon={typeof opt === 'string' ? null : opt.icon}
              label={renderLabel ? renderLabel(opt) : value}
              count={counts[value] || 0}
              checked={selected.includes(value)}
              onChange={() => onToggle(value)}
            />
          );
        })}
      </div>
      {options.length > PREVIEW && (
        <button type="button" className="facet-more" onClick={() => setExpanded(e => !e)}>
          {expanded ? t('filters.showLess') : `${t('filters.showMore')} (${options.length - PREVIEW})`}
        </button>
      )}
    </>
  );
}

export default function PeopleSidebar({ filters, counts, shown, total, onChange }) {
  const { t } = useApp();

  const toggle = (key, value) => {
    const next = toggleValue(filters[key], value);
    const updated = { ...filters, [key]: next };
    // Los lenguajes dependen del tipo de juego: si se deselecciona un tipo,
    // se descartan los lenguajes que ya no están disponibles.
    if (key === 'gameTypes') {
      const allowed = languagesForGameTypes(next);
      updated.languages = filters.languages.filter(l => allowed.includes(l));
    }
    onChange(updated);
  };

  const activeCount = activeFilterCount(filters);

  return (
    <aside className="people-sidebar">
      <div className="people-sidebar-head">
        <h3 className="people-sidebar-title">{t('people.filters')}</h3>
        {activeCount > 0 && (
          <button type="button" className="people-sidebar-clear" onClick={() => onChange(emptyFilters())}>
            {t('people.clearAll')}
          </button>
        )}
      </div>

      <Facet title={t('filters.gameTypes')}>
        <OptionList
          options={GAME_TYPES}
          selected={filters.gameTypes}
          counts={counts.gameTypes}
          onToggle={v => toggle('gameTypes', v)}
          renderLabel={opt => t(`gt.${opt.value}`)}
        />
      </Facet>

      <Facet title={t('filters.languages')}>
        {filters.gameTypes.length === 0 && (
          <p className="facet-hint">{t('filters.languagesHint')}</p>
        )}
        <OptionList
          options={languagesForGameTypes(filters.gameTypes)}
          selected={filters.languages}
          counts={counts.languages}
          onToggle={v => toggle('languages', v)}
        />
      </Facet>

      <Facet title={t('filters.favoriteGenres')}>
        <OptionList
          options={FAVORITE_GENRES}
          selected={filters.favoriteGenres}
          counts={counts.favoriteGenres}
          onToggle={v => toggle('favoriteGenres', v)}
          renderLabel={opt => t(`fg.${opt.value}`)}
        />
      </Facet>

      <Facet title={t('filters.disciplines')}>
        <OptionList
          options={DISCIPLINES}
          selected={filters.disciplines}
          counts={counts.disciplines}
          onToggle={v => toggle('disciplines', v)}
          renderLabel={opt => t(`disc.${opt.value}`)}
        />
      </Facet>

      <Facet title={t('filters.completed')}>
        <div className="facet-options">
          {COMPLETED_BUCKETS.map(min => (
            <FacetOption
              key={min}
              label={`${min}+`}
              count={counts.completed[min] || 0}
              checked={filters.completed.includes(min)}
              onChange={() => toggle('completed', min)}
            />
          ))}
        </div>
      </Facet>

      <Facet title={t('filters.rating')}>
        <div className="facet-options">
          {RATING_BUCKETS.map(min => (
            <FacetOption
              key={min}
              label={min === 0 ? t('filters.noRating') : `★ ${min}+`}
              count={counts.rating[min] || 0}
              checked={filters.rating.includes(min)}
              onChange={() => toggle('rating', min)}
            />
          ))}
        </div>
      </Facet>

      {activeCount > 0 && (
        <button type="button" className="btn btn-ghost btn-sm people-sidebar-reset" onClick={() => onChange(emptyFilters())}>
          {t('people.clearAll')}
        </button>
      )}

      <p className="people-sidebar-total">{t('people.showing', { n: shown, total })}</p>
    </aside>
  );
}
