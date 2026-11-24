import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Icon, Modal } from '../components/common.jsx';
import FavoriteGamesTags from '../components/FavoriteGamesTags.jsx';
import { normalizeFavoriteGames, pruneFavoriteGames } from '../lib/favoriteGames.js';
import { escapeHTML, userCategories } from '../lib/helpers.js';
import {
  DISCIPLINES,
  GAME_TYPES,
  gameTypeLabel,
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
        const selectedNow = (selected || []).includes(value);
        return (
          <button
            type="button"
            key={value}
            className={'featured-proj-card' + (selectedNow ? ' selected' : '')}
            onClick={() => onToggle(value)}
          >
            <span className="featured-proj-tick">{selectedNow ? <Icon name="star" size={14} /> : <Icon name="star" size={14} cls="is-empty" />}</span>
            <span className="featured-proj-title">{escapeHTML(renderLabel ? renderLabel(opt) : value)}</span>
          </button>
        );
      })}
    </div>
  );
}

// El mismo modal atiende los dos botones de Ajustes, pero cada uno edita solo
// su parte: `skills` -> lenguajes + habilidades; `talent` -> tipos de juego + tags.
export default function SettingsSkillsModal({ mode = 'skills' }) {
  const { user, t, saveProfile } = useApp();
  const { showToast } = useToast();
  const { closeSkillsSettings } = useModals();

  const isTalent = mode === 'talent';

  const [draftGameTypes, setDraftGameTypes] = useState(() => userGameTypes(user).slice());
  const [draftLanguages, setDraftLanguages] = useState(() => userLanguages(user).slice());
  const [draftGames, setDraftGames] = useState(() => normalizeFavoriteGames(user?.favoriteGames));
  const [draftDisciplines, setDraftDisciplines] = useState(() => userDisciplines(user).slice());

  const availableLanguages = languagesForGameTypes(draftGameTypes);

  if (!user) return null;

  const toggleIn = (setter) => (value) => {
    setter(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  };

  // Al cambiar el tipo de juego se recalculan los lenguajes disponibles: los
  // que ya no apliquen se descartan para no guardar datos imposibles.
  const toggleGameType = (value) => {
    const next = draftGameTypes.includes(value)
      ? draftGameTypes.filter(type => type !== value)
      : [...draftGameTypes, value];
    setDraftGameTypes(next);
    const allowed = languagesForGameTypes(next);
    setDraftLanguages(prev => prev.filter(l => allowed.includes(l)));
  };

  const confirm = async () => {
    if (isTalent) {
      if (draftGameTypes.length === 0) return showToast(t('toast.selectGameTypes'), 'error');
    } else {
      if (draftLanguages.length === 0) return showToast(t('toast.selectLanguages'), 'error');
      if (draftDisciplines.length === 0) return showToast(t('settings.noDisciplines'), 'error');
    }

    // Lo que no se edita en este modal viaja tal cual para no borrarlo.
    const currentTypes = userGameTypes(user);
    const saved = await saveProfile({
      bio: user.bio,
      skills: (user.skills || []).slice(),
      categories: userCategories(user),
      githubUrl: user.githubUrl,
      portfolioUrl: user.portfolioUrl,
      gameTypes: isTalent ? draftGameTypes : currentTypes,
      languages: isTalent ? userLanguages(user) : draftLanguages,
      favoriteGenres: userFavoriteGenres(user),
      favoriteGames: pruneFavoriteGames(draftGames, [
        ...(isTalent ? draftGameTypes : currentTypes),
        ...userFavoriteGenres(user)
      ]),
      disciplines: isTalent ? userDisciplines(user) : draftDisciplines
    });
    if (!saved) return;
    closeSkillsSettings();
    showToast(t('profile.saved'), 'success');
  };

  return (
    <Modal
      open
      onClose={closeSkillsSettings}
      title={isTalent ? t('settings.talentSection') : t('skillsModal.title')}
      subtitle={isTalent ? t('settings.talentHint') : t('skillsModal.subtitle')}
    >
      {isTalent ? (
        <div className="form-group">
          <label>{t('settings.gameTypesLabel')}</label>
          <p className="form-hint">{t('settings.gameTypesHint')}</p>
          <OptionGrid
            options={GAME_TYPES}
            selected={draftGameTypes}
            onToggle={toggleGameType}
            renderLabel={opt => t(`gt.${opt.value}`)}
          />
          <FavoriteGamesTags
            categories={draftGameTypes}
            value={draftGames}
            onChange={setDraftGames}
            labelFor={gameTypeLabel}
          />
        </div>
      ) : (
        <>
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
            <label>{t('settings.disciplinesLabel')}</label>
            <p className="form-hint">{t('settings.disciplinesHint')}</p>
            <OptionGrid
              options={DISCIPLINES}
              selected={draftDisciplines}
              onToggle={toggleIn(setDraftDisciplines)}
              renderLabel={opt => t(`disc.${opt.value}`)}
            />
          </div>
        </>
      )}

      <div className="featured-actions">
        <button className="btn btn-ghost" onClick={closeSkillsSettings}>{t('invite.cancel')}</button>
        <button className="btn btn-primary" onClick={confirm}>{t('invite.apply')}</button>
      </div>
    </Modal>
  );
}
