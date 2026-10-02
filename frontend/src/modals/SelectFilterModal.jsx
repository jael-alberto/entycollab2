import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, EmptyState } from '../components/common.jsx';
import { escapeHTML } from '../lib/helpers.js';
import { availableCategoriesList, availableTechList } from '../lib/filters.js';

// kind: "category" | "tech"
export default function SelectFilterModal({ kind }) {
  const {
    lang,
    projects,
    t,
    selectedCategories, setSelectedCategories,
    selectedTechFilters, setSelectedTechFilters
  } = useApp();
  const modals = useModals();

  const isCategory = kind === 'category';
  const techNeedsCategory = isCategory ? false : selectedCategories.length === 0;

  const [draft, setDraft] = useState(() => snapshot());

  const apply = isCategory ? setSelectedCategories : setSelectedTechFilters;
  const onClose = isCategory ? modals.closeCategoryFilter : modals.closeTechFilter;

  const options = isCategory
    ? availableCategoriesList(projects, lang)
    : availableTechList(projects, selectedCategories);

  function title() {
    return isCategory ? t('catFilter.title') : t('techFilter.title');
  }
  function subtitle() {
    return isCategory ? t('catFilter.subtitle') : t('techFilter.subtitle');
  }

  const toggle = (value) => {
    setDraft(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  };

  const confirm = () => {
    apply(draft);
    // Al cambiar las categorías se descartan las tecnologías que ya no
    // pertenece a ninguna categoría elegida.
    if (isCategory) {
      const techList = availableTechList(projects, draft);
      setSelectedTechFilters(selectedTechFilters.filter(tt => techList.includes(tt)));
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
              <EmptyState title={isCategory ? t('empty.noCategories') : t('empty.noTechs')} icon={null} />
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
    return isCategory ? selectedCategories.slice() : selectedTechFilters.slice();
  }
}
