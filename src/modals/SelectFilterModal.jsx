import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, EmptyState } from '../components/common.jsx';
import { escapeHTML } from '../lib/helpers.js';
import { availableCategoriesList, availablePeopleCategoriesList, availablePeopleTechList, availableTechList } from '../lib/filters.js';

// kind: "category" | "tech" | "peopleCategory" | "peopleTech"
export default function SelectFilterModal({ kind }) {
  const {
    lang,
    projects, users,
    t,
    selectedCategories, setSelectedCategories,
    selectedTechFilters, setSelectedTechFilters,
    selectedPeopleCategories, setSelectedPeopleCategories,
    selectedPeopleTechFilters, setSelectedPeopleTechFilters
  } = useApp();
  const modals = useModals();

  const isCategory = kind === 'category';
  const isPeopleCategory = kind === 'peopleCategory';
  const isPeople = kind === 'peopleTech';
  const techNeedsCategory = kind === 'tech'
    ? selectedCategories.length === 0
    : kind === 'peopleTech'
      ? selectedPeopleCategories.length === 0
      : false;

  const [draft, setDraft] = useState(() => snapshot());

  const apply = isCategory ? setSelectedCategories
    : isPeopleCategory ? setSelectedPeopleCategories
      : isPeople ? setSelectedPeopleTechFilters
        : setSelectedTechFilters;
  const onClose = isCategory ? modals.closeCategoryFilter
    : isPeopleCategory ? modals.closePeopleCategoryFilter
      : isPeople ? modals.closePeopleTechFilter
        : modals.closeTechFilter;

  const options = isCategory
    ? availableCategoriesList(projects, lang)
    : isPeopleCategory
      ? availablePeopleCategoriesList(lang)
      : isPeople
        ? availablePeopleTechList(users, selectedPeopleCategories)
        : availableTechList(projects, selectedCategories);

  function title() {
    return isCategory || isPeopleCategory ? t('catFilter.title') : t('techFilter.title');
  }
  function subtitle() {
    if (isPeople) return t('peopleTechFilter.subtitle');
    return isCategory || isPeopleCategory ? t('catFilter.subtitle') : t('techFilter.subtitle');
  }

  const toggle = (value) => {
    setDraft(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  };

  const confirm = () => {
    apply(draft);
    if (isCategory) {
      const techList = availableTechList(projects, draft);
      setSelectedTechFilters(selectedTechFilters.filter(tt => techList.includes(tt)));
    } else if (isPeopleCategory) {
      const techList = availablePeopleTechList(users, draft);
      setSelectedPeopleTechFilters(selectedPeopleTechFilters.filter(tt => techList.includes(tt)));
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={title()} subtitle={subtitle()}>
      {techNeedsCategory ? (
        <EmptyState icon="🗂️" title={t('techFilter.requireCat')} sub={t('techFilter.requireCatSub')} />
      ) : (
        <>
          <div className="featured-counter">{t('catFilter.counterSelected', { n: draft.length, total: options.length })}</div>
          <div className="featured-list">
            {options.length === 0 ? (
              <EmptyState title={isCategory || isPeopleCategory ? t('empty.noCategories') : t('empty.noTechs')} icon={null} />
            ) : (
              options.map((opt, i) => {
                const value = typeof opt === 'string' ? opt : opt.value;
                const label = typeof opt === 'string' ? opt : opt.label;
                const selectedNow = draft.includes(value);
                return (
                  <button
                    type="button"
                    key={i}
                    className={'featured-proj-card' + (selectedNow ? ' selected' : '')}
                    onClick={() => toggle(value)}
                  >
                    <span className="featured-proj-tick">{selectedNow ? '★' : '☆'}</span>
                    <span className="featured-proj-title">{escapeHTML(label)}</span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
      <div className="featured-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('invite.cancel')}</button>
        {!techNeedsCategory && (
          <button className="btn btn-primary" onClick={confirm}>{t('invite.apply')}</button>
        )}
      </div>
    </Modal>
  );

  function snapshot() {
    return isCategory ? selectedCategories.slice()
      : isPeopleCategory ? selectedPeopleCategories.slice()
        : isPeople ? selectedPeopleTechFilters.slice()
          : selectedTechFilters.slice();
  }
}
