import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, Avatar, Stars, SkillTags, ProfileLinks, TalentRow } from '../components/common.jsx';
import UserHistory from '../components/UserHistory.jsx';
import { primaryRoleLabel } from '../components/PersonCard.jsx';
import {
  completedProjectsCount,
  disciplineLabel,
  favoriteGenreLabel,
  gameTypeLabel,
  userDisciplines,
  userFavoriteGenres,
  userGameTypes,
  userLanguages
} from '../lib/talent.js';
import {
  getUserAvgRating,
  getUserRatingCount,
  escapeHTML,
  userCategories,
  getCategoryLabel
} from '../lib/helpers.js';

// Ficha de colaborador (se abre desde la tarjeta o el historial): header
// (avatar, rol, disponibilidad, valoración, links) + tabs
// Proyectos (historial + destacados máx 5) / Reseñas / Sobre mí.
// Propio → Editar; ajeno → Invitar. No cambia de ruta: vive en modal.
export default function UserDetailModal() {
  const { users, ratings, projects, applications, lang, t, l10n } = useApp();
  const { userDetailId, closeUserDetail, openInvite } = useModals();
  const { user: me } = useApp();
  const [tab, setTab] = useState('projects');

  const u = users.find(x => x.id === userDetailId);
  if (!u) return null;

  const rating = getUserAvgRating(u.id, ratings);
  const ratingCount = getUserRatingCount(u.id, ratings);
  const bio = l10n(u.bio);
  const isSelf = me && me.id === u.id;
  const categories = userCategories(u);
  const completed = completedProjectsCount(u.id, projects, applications);
  const role = primaryRoleLabel(u, lang);
  const receivedRatings = ratings.filter(r => r.ratedUserId === u.id);

  const tabs = [
    { id: 'projects', label: lang === 'en' ? 'Projects' : 'Proyectos' },
    { id: 'reviews', label: lang === 'en' ? 'Reviews' : 'Reseñas' },
    { id: 'about', label: lang === 'en' ? 'About' : 'Sobre mí' }
  ];

  const onTabKeyDown = e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = tabs.findIndex(x => x.id === tab);
    const next = e.key === 'ArrowRight'
      ? tabs[(idx + 1) % tabs.length]
      : tabs[(idx - 1 + tabs.length) % tabs.length];
    setTab(next.id);
    document.getElementById(`udm-tab-${next.id}`)?.focus();
  };

  return (
    <Modal open onClose={closeUserDetail} size="modal-large" title={t('userDetail.title')}>
      {/* ====== HEADER ====== */}
      <header className="udm-header">
        <Avatar user={u} cls="profile-avatar profile-avatar--lg" />
        <div className="udm-id">
          <h3 className="udm-name">{escapeHTML(u.name)}</h3>
          <p className="profile-username">@{escapeHTML(u.username)}</p>
          <div className="profile-top-badges">
            {role && <span className="person-role-badge">{escapeHTML(role)}</span>}
            {u.available === true && (
              <span className="person-avail">
                <span className="person-avail-dot is-on" aria-hidden="true" />
                <span className="person-avail-text">{t('person.available')}</span>
              </span>
            )}
          </div>
          <div
            className="profile-rating-display"
            aria-label={`${t('profile.statRating')}: ${ratingCount > 0 ? rating.toFixed(1) : t('filters.noRating')}`}
          >
            {rating > 0 ? (
              <>
                <Stars rating={rating} />
                {ratingCount > 0 && <span className="person-metric-count">({ratingCount})</span>}
              </>
            ) : t('filters.noRating')}
          </div>
          <ul className="person-stats" aria-label={t('profile.completedProjects')}>
            <li><strong>{completed}</strong> {t('profile.completedProjects')}</li>
          </ul>
          <ProfileLinks user={u} />
        </div>
      </header>

      {/* ====== TABS ====== */}
      <div className="profile-tabs" role="tablist" aria-label={u.name} onKeyDown={onTabKeyDown}>
        {tabs.map(x => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`udm-tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls={`udm-panel-${x.id}`}
            tabIndex={tab === x.id ? 0 : -1}
            className={'profile-tab' + (tab === x.id ? ' is-active' : '')}
            onClick={() => setTab(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>

      <section
        role="tabpanel"
        id="udm-panel-projects"
        aria-labelledby="udm-tab-projects"
        hidden={tab !== 'projects'}
        className="profile-panel"
      >
        <UserHistory user={u} />
      </section>

      <section
        role="tabpanel"
        id="udm-panel-reviews"
        aria-labelledby="udm-tab-reviews"
        hidden={tab !== 'reviews'}
        className="profile-panel"
      >
        <h3 className="profile-panel-title">{t('profile.ratingsReceived')}</h3>
        {receivedRatings.length === 0 ? (
          <div className="empty-state" role="status"><p>{t('profile.noRatingsReceived')}</p></div>
        ) : (
          <div className="reviews-list">
            {receivedRatings.map(r => {
              const rater = users.find(x => x.id === r.ratedBy);
              const project = projects.find(p => p.id === r.projectId);
              return (
                <div className="rating-row" key={r.id}>
                  <div>
                    <span className="rating-by">
                      {rater ? escapeHTML(rater.name) : t('profile.anonymous')} · {project ? escapeHTML(l10n(project.title)) : t('profile.deletedProject')}
                    </span>
                  </div>
                  <span className="rating-stars-display" aria-label={`${r.stars}/5`}>
                    {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section
        role="tabpanel"
        id="udm-panel-about"
        aria-labelledby="udm-tab-about"
        hidden={tab !== 'about'}
        className="profile-panel"
      >
        <p className="profile-bio">{bio ? escapeHTML(bio) : t('person.noBio')}</p>

        <TalentRow label={t('settings.gameTypesLabel')} values={userGameTypes(u).map(v => gameTypeLabel(lang, v))} />
        <TalentRow label={t('filters.disciplines')} values={userDisciplines(u).map(v => disciplineLabel(lang, v))} />
        <TalentRow label={t('settings.favoriteGenresLabel')} values={userFavoriteGenres(u).map(v => favoriteGenreLabel(lang, v))} />

        {categories.length > 0 && (
          <div className="person-categories">
            {categories.map(c => <span key={c} className="person-cat-chip">{escapeHTML(getCategoryLabel(lang, c))}</span>)}
          </div>
        )}

        <TalentRow label={t('settings.languagesLabel')} values={userLanguages(u)} />

        <div className="profile-skills">
          {userLanguages(u).length === 0 && <SkillTags skills={u.skills} limit={999} />}
        </div>
      </section>

      {isSelf ? (
        <Link
          className="btn btn-ghost btn-full"
          style={{ marginTop: '1rem' }}
          to="/ajustes"
          onClick={closeUserDetail}
        >
          {t('profile.editBtn')}
        </Link>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-full"
          style={{ marginTop: '1rem' }}
          onClick={() => { closeUserDetail(); openInvite(u.id); }}
        >
          {t('person.inviteProject')}
        </button>
      )}
    </Modal>
  );
}
