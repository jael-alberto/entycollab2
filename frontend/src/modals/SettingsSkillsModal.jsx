import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, EmptyState } from '../components/common.jsx';
import { escapeHTML, userCategories } from '../lib/helpers.js';
import { availablePeopleCategoriesList, availablePeopleTechList } from '../lib/filters.js';
import {
  DISCIPLINES,
  FAVORITE_GENRES,
  GAME_TYPES,
  languagesForGameTypes,
  userDisciplines,
  userFavoriteGenres,
  userGameTypes,
  userLanguages
} from '../lib/talent.js';

// Grilla de opciones con check. Mismo patrón visual que los modales de filtro
// de Proyectos y Personas.
function OptionGrid({ options, selected, onToggle, renderLabel }) {
  return (
    <div className="featured-list featured-list-compact">
      {options.map(opt => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const selectedNow = selected.includes(value);
        return (
          <button
            type="button"
            key={value}
            className={'featured-proj-card' + (selectedNow ? ' selected' : '')}
            onClick={() => onToggle(value)}
          >
            <span className="featured-proj-tick">{selectedNow ? '★' : '☆'}</span>
            <span className="featured-proj-title">{escapeHTML(renderLabel ? renderLabel(opt) : value)}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsSkillsModal() {
  const { user, lang, t, saveProfile } = useApp();
  const { showToast } = useToast();
  const { closeSkillsSettings } = useModals();

  const [draftCats, setDraftCats] = useState(() => userCategories(user || {}).slice());
  const [draftSkills, setDraftSkills] = useState(() => (user?.skills || []).slice());
  const [draftGameTypes, setDraftGameTypes] = useState(() => userGameTypes(user).slice());
  const [draftLanguages, setDraftLanguages] = useState(() => userLanguages(user).slice());
  const [draftGenres, setDraftGenres] = useState(() => userFavoriteGenres(user).slice());
  const [draftDisciplines, setDraftDisciplines] = useState(() => userDisciplines(user).slice());
  const [search, setSearch] = useState('');

  const catOptions = availablePeopleCategoriesList(lang);
  const allTechs = availablePeopleTechList(null, draftCats);
  const availableLanguages = languagesForGameTypes(draftGameTypes);

  const query = search.trim().toLowerCase();
  const techOptions = query ? allTechs.filter(tech => tech.toLowerCase().includes(query)) : allTechs;

  if (!user) return null;

  const toggleIn = (setter) => (value) => {
    setter(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  };

  // Al cambiar el tipo de juego se recalculan los lenguajes disponibles: los
  // que ya no apliquen se descartan para no guardar datos imposibles.
  const toggleGameType = (value) => {
    const next = toggleIn(setDraftGameTypes)(value);
    setDraftGameTypes(next);
    const allowed = languagesForGameTypes(next);
    setDraftLanguages(prev => prev.filter(l => allowed.includes(l)));
  };

  const confirm = () => {
    if (draftCats.length === 0) return showToast(t('profile.selectCat'), 'error');
    if (draftSkills.length === 0) return showToast(t('toast.applyTech'), 'error');
    if (draftGameTypes.length === 0) return showToast(t('toast.selectGameTypes'), 'error');
    if (draftLanguages.length === 0) return showToast(t('toast.selectLanguages'), 'error');
    if (draftDisciplines.length === 0) return showToast(t('toast.applyTech'), 'error');

    // Al quitar una categoría se descartan sus tecnologías, para no guardar
    // habilidades que la persona ya no puede ver en la lista.
    const allowed = new Set(availablePeopleTechList(null, draftCats));
    const kept = draftSkills.filter(tech => allowed.has(tech));

    // bio y links se reenvían tal como están guardados: este modal solo
    // cambia habilidades y perfil de talento.
    saveProfile({
      bio: user.bio,
      skills: kept,
      categories: draftCats,
      githubUrl: user.githubUrl,
      portfolioUrl: user.portfolioUrl,
      gameTypes: draftGameTypes,
      languages: draftLanguages,
      favoriteGenres: draftGenres,
      disciplines: draftDisciplines
    });
    closeSkillsSettings();
    showToast(t('profile.saved'), 'success');
  };

  return (
    <Modal open onClose={closeSkillsSettings} title={t('skillsModal.title')} subtitle={t('skillsModal.subtitle')}>
      <div className="form-group">
        <label>{t('profile.categoriesLabel')}</label>
        <p className="form-hint">{t('profile.categoriesHint')}</p>
        <OptionGrid
          options={catOptions}
          selected={draftCats}
          onToggle={toggleIn(setDraftCats)}
          renderLabel={opt => opt.label}
        />
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
            <OptionGrid
              options={techOptions}
              selected={draftSkills}
              onToggle={toggleIn(setDraftSkills)}
            />
          </>
        )}
      </div>

      {/* ====== PERFIL DE TALENTO ====== */}
      <div className="form-group">
        <label>{t('settings.gameTypesLabel')}</label>
        <p className="form-hint">{t('settings.gameTypesHint')}</p>
        <OptionGrid
          options={GAME_TYPES}
          selected={draftGameTypes}
          onToggle={toggleGameType}
          renderLabel={opt => t(`gt.${opt.value}`)}
        />
      </div>

      <div className="form-group">
        <label>{t('settings.languagesLabel')}</label>
        <p className="form-hint">
          {draftGameTypes.length === 0 ? t('settings.languagesHint') : t('settings.languagesHintActive')}
        </p>
        <div className="featured-counter">
          {t('catFilter.counterSelected', { n: draftLanguages.length, total: availableLanguages.length })}
        </div>
        <OptionGrid
          options={availableLanguages}
          selected={draftLanguages}
          onToggle={toggleIn(setDraftLanguages)}
        />
      </div>

      <div className="form-group">
        <label>{t('settings.favoriteGenresLabel')}</label>
        <p className="form-hint">{t('settings.favoriteGenresHint')}</p>
        <OptionGrid
          options={FAVORITE_GENRES}
          selected={draftGenres}
          onToggle={toggleIn(setDraftGenres)}
          renderLabel={opt => t(`fg.${opt.value}`)}
        />
      </div>

      <div className="form-group">
        <label>{t('settings.disciplinesLabel')}</label>
        <p className="form-hint">{t('settings.disciplinesHint')}</p>
        <OptionGrid
          options={DISCIPLINES}
          selected={draftDisciplines}
          onToggle={toggleIn(setDraftDisciplines)}
          renderLabel={opt => t(`disc.${opt.value}`)}
        />
      </div>


      <div className="featured-actions">
        <button className="btn btn-ghost" onClick={closeSkillsSettings}>{t('invite.cancel')}</button>
        <button className="btn btn-primary" onClick={confirm}>{t('invite.apply')}</button>
      </div>
    </Modal>
  );
}
