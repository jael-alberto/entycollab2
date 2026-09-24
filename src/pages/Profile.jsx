import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import UserHistory from '../components/UserHistory.jsx';
import { Avatar, SkillTags } from '../components/common.jsx';
import { getUserAvgRating, getUserRatingCount, escapeHTML, fileToDataURL, techsForCategory, getCategoryLabel, userCategories } from '../lib/helpers.js';

export default function Profile() {
  const { user, users, projects, ratings, lang, t, l10n, saveProfile, setAvatar, toggleAvailability } = useApp();
  const { showToast } = useToast();
  const avatarInputRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [draftBio, setDraftBio] = useState('');
  const [draftSkills, setDraftSkills] = useState([]);
  const [draftCategories, setDraftCategories] = useState([]);

  if (!user) return null;

  const avg = getUserAvgRating(user.id, ratings);
  const count = getUserRatingCount(user.id, ratings);

  const startEdit = () => {
    setDraftBio(l10n(user.bio) || '');
    setDraftSkills((user.skills || []).slice());
    setDraftCategories(userCategories(user).slice());
    setEditing(true);
  };

  const save = () => {
    if (draftCategories.length === 0) {
      showToast(t('profile.selectCat'), 'error');
      return;
    }
    if (draftSkills.length === 0) {
      showToast(t('toast.applyTech'), 'error');
      return;
    }
    saveProfile({ bio: draftBio.trim(), skills: draftSkills, categories: draftCategories });
    setEditing(false);
    showToast(t('profile.saved'), 'success');
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(t('toast.imageFile'), 'error');
      e.target.value = '';
      return;
    }
    const dataUrl = await fileToDataURL(file);
    setAvatar(dataUrl);
    showToast(t('toast.photoUpdated'), 'success');
    e.target.value = '';
  };

  const removePhoto = () => {
    setAvatar(null);
    showToast(t('toast.photoRemoved'), 'info');
  };

  const toggleSkill = (skill) => {
    setDraftSkills(prev => prev.includes(skill) ? prev.filter(x => x !== skill) : [...prev, skill]);
  };

  const toggleCategory = (cat) => {
    setDraftCategories(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]);
  };

  const availableTechs = [];
  const seenTechs = new Set();
  draftCategories.forEach(cat => {
    techsForCategory(cat).forEach(tech => {
      if (!seenTechs.has(tech)) {
        seenTechs.add(tech);
        availableTechs.push(tech);
      }
    });
  });

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
        <div className="profile-info">
          {user.avatar ? (
            <Avatar user={user} cls="profile-avatar" />
          ) : (
            <div className={`profile-avatar ${avatarColor(user)}`}>{escapeHTML(user.name.charAt(0).toUpperCase())}</div>
          )}
          <div className="profile-photo-actions">
            <label className="btn btn-ghost btn-sm profile-photo-btn" htmlFor="profile-avatar-input">{t('profile.changePhoto')}</label>
            <input type="file" id="profile-avatar-input" ref={avatarInputRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            {user.avatar && (
              <button className="btn btn-ghost btn-sm" onClick={removePhoto}>{t('profile.removePhoto')}</button>
            )}
          </div>
          <h3>{escapeHTML(user.name)}</h3>
          <p className="profile-username">@{escapeHTML(user.username)}</p>
          <div className="profile-rating-display">
            <span className="stars-inline">
              {avg > 0
                ? (() => {
                  const full = Math.floor(avg);
                  const half = avg % 1 >= 0.5 ? 1 : 0;
                  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
                })()
                : '☆☆☆☆☆'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
              ({count} {t('profile.ratingsCount')})
            </span>
          </div>

          {!editing && <p className="profile-bio">{l10n(user.bio)}</p>}
          {!editing && (
            <div className="profile-skills">
              <SkillTags skills={user.skills} limit={999} />
            </div>
          )}

          {!editing && (
            <button className="btn btn-ghost btn-sm profile-edit-btn" onClick={startEdit}>{t('profile.editProfile')}</button>
          )}

          {editing && (
            <div className="edit-skills-panel">
              <div className="form-group">
                <label htmlFor="profile-bio-input">{t('profile.bioLabel')}</label>
                <textarea id="profile-bio-input" rows="3" value={draftBio} onChange={e => setDraftBio(e.target.value)} placeholder={t('profile.bioPh')}></textarea>
              </div>
              <div className="form-group">
                <label>{t('profile.categoriesLabel')}</label>
                <p className="form-hint">{t('profile.categoriesHint')}</p>
                <div className="tech-buttons tech-buttons-form">
                  {['web', 'mobile', 'game'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={'tech-chip' + (draftCategories.includes(cat) ? ' active' : '')}
                      onClick={() => toggleCategory(cat)}
                    >
                      {escapeHTML(getCategoryLabel(lang, cat))}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>{t('profile.skillsLabel')}</label>
                <p className="form-hint">{t('profile.skillsHint')}</p>
                {draftCategories.length === 0 ? (
                  <p className="form-hint">{t('profile.selectCat')}</p>
                ) : (
                  <div className="tech-buttons tech-buttons-form">
                    {availableTechs.map(s => (
                      <button
                        key={s}
                        type="button"
                        className={'tech-chip' + (draftSkills.includes(s) ? ' active' : '')}
                        onClick={() => toggleSkill(s)}
                      >
                        {escapeHTML(s)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="edit-skills-actions">
                <button className="btn btn-primary btn-sm" onClick={save}>{t('profile.saveBtn')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>{t('profile.cancelBtn')}</button>
              </div>
            </div>
          )}
        </div>

        <div className="profile-history">
          <h3>{t('profile.history')}</h3>
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

function avatarColor(u) {
  let seed = 0;
  const key = u.id || u.name || '';
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  return 'avatar-color-' + (seed % 10);
}