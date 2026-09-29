import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import PersonCard from '../components/PersonCard.jsx';
import { EmptyState } from '../components/common.jsx';
import { userCategories } from '../lib/helpers.js';
import { availablePeopleCategoriesList } from '../lib/filters.js';

export default function People() {
  const { user, users, lang, t, selectedPeopleCategories, selectedPeopleTechFilters } = useApp();
  const { openPeopleCategoryFilter, openPeopleTechFilter } = useModals();
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    let out = users.filter(u => u.available === true);
    const q = search.toLowerCase();
    if (q) {
      out = out.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.skills || []).some(s => s.toLowerCase().includes(q))
      );
    }
    if (selectedPeopleCategories.length > 0) {
      out = out.filter(u => userCategories(u).some(c => selectedPeopleCategories.includes(c)));
    }
    if (selectedPeopleTechFilters.length > 0) {
      out = out.filter(u => (u.skills || []).some(s => selectedPeopleTechFilters.includes(s)));
    }
    return [...out].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, search, selectedPeopleCategories, selectedPeopleTechFilters]);

  const catLabel = useMemo(() => {
    if (selectedPeopleCategories.length === 0) return t('filter.allCat');
    if (selectedPeopleCategories.length === 1) return (availablePeopleCategoriesList(lang).find(o => o.value === selectedPeopleCategories[0]) || {}).label;
    return t('filter.catsCount', { n: selectedPeopleCategories.length });
  }, [selectedPeopleCategories, lang, t]);

  const techLabel = useMemo(() => {
    if (selectedPeopleTechFilters.length === 0) return t('filter.allTech');
    if (selectedPeopleTechFilters.length === 1) return selectedPeopleTechFilters[0];
    return t('filter.techsCount', { n: selectedPeopleTechFilters.length });
  }, [selectedPeopleTechFilters, t]);

  return (
    <div className="section-block">
      <div className="section-header-row">
        <h2 className="section-title">{t('nav.people')}</h2>
      </div>
      <p className="section-subtitle">{t('people.subtitle')}</p>

      <div className="filters-bar">
        <div className="form-group form-group-inline">
          <input type="text" placeholder={t('people.searchPh')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="form-group form-group-inline">
          <button type="button" className="filters-toggle-btn" onClick={openPeopleCategoryFilter}>{catLabel}</button>
        </div>
        <div className="form-group form-group-inline">
          <button type="button" className="filters-toggle-btn" onClick={openPeopleTechFilter}>{techLabel}</button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="🔍" title={t('empty.people')} sub={t('empty.peopleSub')} />
      ) : (
        <div className="people-grid">
          {list.map(u => <PersonCard key={u.id} person={u} me={user} />)}
        </div>
      )}
    </div>
  );
}