import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, EmptyState } from '../components/common.jsx';
import { escapeHTML, userCategories } from '../lib/helpers.js';
import { availablePeopleCategoriesList, availablePeopleTechList } from '../lib/filters.js';

// Selector de habilidades del perfil. Mismo patrón visual que los modales de
// filtro (categorías / tecnologías) de Proyectos y Personas.
export default function SettingsSkillsModal() {
  const { user, lang, t, saveProfile } = useApp();
  const { showToast } = useToast();
  const { closeSkillsSettings } = useModals();

  const [draftCats, setDraftCats] = useState(() => userCategories(user || {}).slice());
  const [draftSkills, setDraftSkills] = useState(() => (user?.skills || []).slice());
  const [search, setSearch] = useState('');

  const catOptions = availablePeopleCategoriesList(lang);
  const allTechs = availablePeopleTechList(null, draftCats);

  const query = search.trim().toLowerCase();
  const techOptions = query ? allTechs.filter(tech => tech.toLowerCase().includes(query)) : allTechs;

  if (!user) return null;

  const toggleCat = (value) => {
    setDraftCats(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  };

  const toggleTech = (value) => {
    setDraftSkills(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  };

  const confirm = () => {
    if (draftCats.length === 0) return showToast(t('profile.selectCat'), 'error');
    if (draftSkills.length === 0) return showToast(t('toast.applyTech'), 'error');

    // Al quitar una categoría se descartan sus tecnologías, para no guardar
    // habilidades que la persona ya no puede ver en la lista.
    const allowed = new Set(availablePeopleTechList(null, draftCats));
    const kept = draftSkills.filter(tech => allowed.has(tech));

    // bio y links se reenvían tal como están guardados: este modal solo
    // cambia categorías y tecnologías.
    saveProfile({
      bio: user.bio,
      skills: kept,
      categories: draftCats,
      githubUrl: user.githubUrl,
      portfolioUrl: user.portfolioUrl
    });
    closeSkillsSettings();
    showToast(t('profile.saved'), 'success');
  };

  return (
    <Modal open onClose={closeSkillsSettings} title={t('skillsModal.title')} subtitle={t('skillsModal.subtitle')}>
      <div className="form-group">
        <label>{t('profile.categoriesLabel')}</label>
        <p className="form-hint">{t('profile.categoriesHint')}</p>
        <div className="featured-list featured-list-compact">
          {catOptions.map(opt => {
            const selectedNow = draftCats.includes(opt.value);
            return (
              <button
                type="button"
                key={opt.value}
                className={'featured-proj-card' + (selectedNow ? ' selected' : '')}
                onClick={() => toggleCat(opt.value)}
              >
                <span className="featured-proj-tick">{selectedNow ? '★' : '☆'}</span>
                <span className="featured-proj-title">{escapeHTML(opt.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <label>{t('profile.skillsLabel')}</label>
        <p className="form-hint">{t('profile.skillsHint')}</p>
        {draftCats.length === 0 ? (
          <EmptyState icon="🗂️" title={t('techFilter.requireCat')} sub={t('techFilter.requireCatSub')} />
        ) : (
          <>
            <div className="form-group">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('skillsModal.searchPh')}
                aria-label={t('profile.skillsLabel')}
              />
            </div>
            <div className="featured-counter">
              {t('catFilter.counterSelected', { n: draftSkills.length, total: allTechs.length })}
            </div>
            <div className="featured-list featured-list-compact">
              {techOptions.length === 0 ? (
                <EmptyState title={t('empty.noTechs')} icon={null} />
              ) : (
                techOptions.map(tech => {
                  const selectedNow = draftSkills.includes(tech);
                  return (
                    <button
                      type="button"
                      key={tech}
                      className={'featured-proj-card' + (selectedNow ? ' selected' : '')}
                      onClick={() => toggleTech(tech)}
                    >
                      <span className="featured-proj-tick">{selectedNow ? '★' : '☆'}</span>
                      <span className="featured-proj-title">{escapeHTML(tech)}</span>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <div className="featured-actions">
        <button className="btn btn-ghost" onClick={closeSkillsSettings}>{t('invite.cancel')}</button>
        <button className="btn btn-primary" onClick={confirm}>{t('invite.apply')}</button>
      </div>
    </Modal>
  );
}
