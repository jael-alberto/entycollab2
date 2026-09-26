import { useApp } from '../context/AppContext.jsx';
import UserHistory from '../components/UserHistory.jsx';
import { Avatar, SkillTags, ProfileLinks } from '../components/common.jsx';
import {
  getUserAvgRating, getUserRatingCount, escapeHTML,
  userProjectsList, userCategories, getCategoryLabel
} from '../lib/helpers.js';

export default function Profile() {
  const { user, users, projects, applications, ratings, lang, t, l10n, toggleAvailability } = useApp();

  if (!user) return null;

  const avg = getUserAvgRating(user.id, ratings);
  const count = getUserRatingCount(user.id, ratings);
  const categories = userCategories(user);
  const myProjects = userProjectsList(user, projects, applications);
  const bio = l10n(user.bio);
  const receivedRatings = ratings.filter(r => r.ratedUserId === user.id);

  return (
    <div className="section-block">
      <div className="section-header-row profile-header-row">
        <h2 className="section-title">{t('profile.title')}</h2>
        <div className="availability-card">
          <div className="availability-info">
            <strong>{t('profile.availableToggle')}</strong>
          </div>
          <label className="switch">
            <input type="checkbox" checked={user.available === true} onChange={toggleAvailability} />
            <span className="switch-slider"></span>
          </label>
        </div>
      </div>

      <div className="profile-layout">
        <div className="profile-info profile-hero">
          <div className="profile-hero-body">
            <Avatar user={user} cls="profile-avatar profile-avatar-hero" />

            <h3>{escapeHTML(user.name)}</h3>
            <p className="profile-username">@{escapeHTML(user.username)}</p>

            <ul className="profile-stats">
              <li className="profile-stat">
                <span className="profile-stat-value">{myProjects.length}</span>
                <span className="profile-stat-label">{t('profile.statProjects')}</span>
              </li>
              <li className="profile-stat">
                <span className="profile-stat-value">{(user.skills || []).length}</span>
                <span className="profile-stat-label">{t('profile.statTechs')}</span>
              </li>
              <li className="profile-stat">
                <span className="profile-stat-value">{count > 0 ? avg.toFixed(1) : '—'}</span>
                <span className="profile-stat-label">★ {t('profile.statRating')}</span>
              </li>
            </ul>

            {bio && <p className="profile-bio profile-bio-clamp">{bio}</p>}

            {categories.length > 0 && (
              <div className="person-categories profile-links">
                {categories.map(c => <span key={c} className="person-cat-chip">{escapeHTML(getCategoryLabel(lang, c))}</span>)}
              </div>
            )}

            <div className="profile-skills">
              <SkillTags skills={user.skills} limit={999} />
            </div>

            <ProfileLinks user={user} />
          </div>
        </div>

        <div className="profile-history">
          <h3>{t('profile.showcaseTitle')}</h3>
          <UserHistory user={user} />

          <h3 style={{ marginTop: '1.5rem' }}>{t('profile.ratingsReceived')}</h3>
          {receivedRatings.length === 0 ? (
            <div className="empty-state"><p>{t('profile.noRatingsReceived')}</p></div>
          ) : (
            receivedRatings.map(r => {
              const rater = users.find(u => u.id === r.ratedBy);
              const project = projects.find(p => p.id === r.projectId);
              return (
                <div className="rating-row" key={r.id}>
                  <div>
                    <span className="rating-by">
                      {rater ? escapeHTML(rater.name) : t('profile.anonymous')} · {project ? escapeHTML(l10n(project.title)) : t('profile.deletedProject')}
                    </span>
                  </div>
                  <span className="rating-stars-display">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
