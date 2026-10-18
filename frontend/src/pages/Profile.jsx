import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import UserHistory from '../components/UserHistory.jsx';
import { primaryRoleLabel } from '../components/PersonCard.jsx';
import { Avatar, SkillTags, ProfileLinks, Stars, TalentRow } from '../components/common.jsx';
import {
  getUserAvgRating, getUserRatingCount, escapeHTML,
  userCategories, getCategoryLabel
} from '../lib/helpers.js';
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

// /perfil (ruta intacta, sin :username): perfil propio con header
// (avatar, rol, disponibilidad, valoración, links) y tabs
// Proyectos / Reseñas / Sobre mí. Propio → Editar.
export default function Profile() {
  const { user, users, projects, applications, ratings, lang, t, l10n, toggleAvailability } = useApp();
  const [tab, setTab] = useState('projects');

  if (!user) return null;

  const avg = getUserAvgRating(user.id, ratings);
  const count = getUserRatingCount(user.id, ratings);
  const categories = userCategories(user);
  const bio = l10n(user.bio);
  const receivedRatings = ratings.filter(r => r.ratedUserId === user.id);
  const completed = completedProjectsCount(user.id, projects, applications);
  const languages = userLanguages(user);
  const role = primaryRoleLabel(user, lang);
  const techCount = languages.length > 0 ? languages.length : (user.skills || []).length;

  const tabs = [
    { id: 'projects', label: lang === 'en' ? 'Projects' : 'Proyectos' },
    { id: 'reviews', label: lang === 'en' ? 'Reviews' : 'Reseñas' },
    { id: 'about', label: lang === 'en' ? 'About' : 'Sobre mí' }
  ];

  // Teclado: flechas mueven el foco entre tabs (patrón tabs WAI-ARIA).
  const onTabKeyDown = e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = tabs.findIndex(x => x.id === tab);
    const next = e.key === 'ArrowRight'
      ? tabs[(idx + 1) % tabs.length]
      : tabs[(idx - 1 + tabs.length) % tabs.length];
    setTab(next.id);
    document.getElementById(`profile-tab-${next.id}`)?.focus();
  };

  return (
    <div className="section-block profile-page">
      <div className="section-header-row profile-header-row">
        <h2 className="section-title">{t('profile.title')}</h2>
        <div className="availability-card">
          <div className="availability-info">
            <strong>{t('profile.availableToggle')}</strong>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={user.available === true}
              onChange={toggleAvailability}
              aria-label={t('profile.availableToggle')}
            />
            <span className="switch-slider"></span>
          </label>
        </div>
      </div>

      {/* ====== HEADER ====== */}
      <header className="profile-top">
        <Avatar user={user} cls="profile-avatar profile-avatar--lg" />
        <div className="profile-top-main">
          <h3 className="profile-top-name">{escapeHTML(user.name)}</h3>
          <p className="profile-username">@{escapeHTML(user.username)}</p>
          <div className="profile-top-badges">
            {role && <span className="person-role-badge">{escapeHTML(role)}</span>}
            <span className="person-avail">
              <span
                className={'person-avail-dot' + (user.available === true ? ' is-on' : '')}
                aria-hidden="true"
              />
              <span className="person-avail-text">
                {user.available === true ? t('person.available') : t('person.you')}
              </span>
            </span>
          </div>
          <div className="person-rating" aria-label={`${t('profile.statRating')}: ${count > 0 ? avg.toFixed(1) : t('filters.noRating')}`}>
            {avg > 0 ? (
              <>
                <Stars rating={avg} />
                <span className="person-metric-count">({count})</span>
              </>
            ) : t('filters.noRating')}
          </div>
          <ProfileLinks user={user} />
        </div>
        <div className="profile-top-side">
          <ul className="profile-stats profile-stats--row">
            <li className="profile-stat">
              <span className="profile-stat-value">{completed}</span>
              <span className="profile-stat-label">{t('profile.completedProjects')}</span>
            </li>
            <li className="profile-stat">
              <span className="profile-stat-value">{techCount}</span>
              <span className="profile-stat-label">{t('profile.statTechs')}</span>
            </li>
            <li className="profile-stat">
              <span className="profile-stat-value">{count > 0 ? avg.toFixed(1) : '—'}</span>
              <span className="profile-stat-label">★ {t('profile.statRating')}</span>
            </li>
          </ul>
          <Link className="btn btn-ghost btn-sm" to="/ajustes">
            {t('profile.editBtn')}
          </Link>
        </div>
      </header>

      {/* ====== TABS ====== */}
      <div className="profile-tabs" role="tablist" aria-label={user.name} onKeyDown={onTabKeyDown}>
        {tabs.map(x => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`profile-tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls={`profile-panel-${x.id}`}
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
        id="profile-panel-projects"
        aria-labelledby="profile-tab-projects"
        hidden={tab !== 'projects'}
        className="profile-panel"
      >
        <UserHistory user={user} />
      </section>

      <section
        role="tabpanel"
        id="profile-panel-reviews"
        aria-labelledby="profile-tab-reviews"
        hidden={tab !== 'reviews'}
        className="profile-panel"
      >
        <h3 className="profile-panel-title">{t('profile.ratingsReceived')}</h3>
        {receivedRatings.length === 0 ? (
          <div className="empty-state" role="status"><p>{t('profile.noRatingsReceived')}</p></div>
        ) : (
          <div className="reviews-list">
            {receivedRatings.map(r => {
              const rater = users.find(u => u.id === r.ratedBy);
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
        id="profile-panel-about"
        aria-labelledby="profile-tab-about"
        hidden={tab !== 'about'}
        className="profile-panel"
      >
        {bio && <p className="profile-bio">{bio}</p>}

        <TalentRow
          label={t('settings.gameTypesLabel')}
          values={userGameTypes(user).map(v => gameTypeLabel(lang, v))}
        />
        <TalentRow
          label={t('filters.disciplines')}
          values={userDisciplines(user).map(v => disciplineLabel(lang, v))}
        />
        <TalentRow
          label={t('settings.favoriteGenresLabel')}
          values={userFavoriteGenres(user).map(v => favoriteGenreLabel(lang, v))}
        />

        {categories.length > 0 && (
          <div className="person-categories profile-links">
            {categories.map(c => <span key={c} className="person-cat-chip">{escapeHTML(getCategoryLabel(lang, c))}</span>)}
          </div>
        )}

        <div className="profile-skills">
          {languages.length > 0
            ? <SkillTags skills={languages} limit={999} />
            : <SkillTags skills={user.skills} limit={999} />}
        </div>
      </section>
    </div>
  );
}
