import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Avatar, SkillTags } from '../components/common.jsx';
import { fileToDataURL, userCategories, getCategoryLabel, normalizeLinkUrl } from '../lib/helpers.js';

export default function Settings() {
  const { user, lang, t, l10n, saveProfile, updateAccount, setAvatar } = useApp();
  const { showToast } = useToast();
  const { openSkillsSettings } = useModals();
  const avatarInputRef = useRef(null);

  const [acc, setAcc] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    password: ''
  });

  const [bio, setBio] = useState(() => l10n(user?.bio) || '');
  const [github, setGithub] = useState(user?.githubUrl || '');
  const [portfolio, setPortfolio] = useState(user?.portfolioUrl || '');

  if (!user) return null;

  const categories = userCategories(user);
  const setAccField = (field) => (e) => setAcc(prev => ({ ...prev, [field]: e.target.value }));

  const saveAccount = (e) => {
    e.preventDefault();

    const res = updateAccount(acc);
    if (res === 'incomplete') return showToast(t('settings.incomplete'), 'error');
    if (res === 'email') return showToast(t('toast.accountExists'), 'error');
    if (res === 'username') return showToast(t('toast.usernameTaken'), 'error');
    if (res !== 'ok') return showToast(t('toast.invalidLink'), 'error');

    const githubUrl = normalizeLinkUrl(github);
    if (github.trim() && !githubUrl) return showToast(t('toast.invalidLink'), 'error');
    const portfolioUrl = normalizeLinkUrl(portfolio);
    if (portfolio.trim() && !portfolioUrl) return showToast(t('toast.invalidLink'), 'error');

    // Habilidades y categorías no se editan acá: se reenvían como están
    // guardadas para no pisar lo que se cambió desde el modal.
    saveProfile({
      bio: bio.trim(),
      skills: (user.skills || []).slice(),
      categories,
      githubUrl,
      portfolioUrl
    });
    setAcc(prev => ({ ...prev, password: '' }));
    showToast(t('settings.savedAccount'), 'success');
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(t('toast.imageFile'), 'error');
      e.target.value = '';
      return;
    }
    setAvatar(await fileToDataURL(file));
    showToast(t('toast.photoUpdated'), 'success');
    e.target.value = '';
  };

  const removePhoto = () => {
    setAvatar(null);
    showToast(t('toast.photoRemoved'), 'info');
  };

  return (
    <div className="section-block">
      <div className="section-header-row">
        <h2 className="section-title">{t('settings.title')}</h2>
        <span className="settings-storage-hint">{t('settings.storageHint')}</span>
      </div>
      <p className="settings-subtitle">{t('settings.subtitle')}</p>

      {/* ====== FOTO DE PERFIL ====== */}
      <section className="settings-card">
        <header className="settings-card-head">
          <h3>{t('settings.photoSection')}</h3>
          <p className="form-hint">{t('settings.photoHint')}</p>
        </header>
        <div className="settings-photo-row">
          <Avatar user={user} cls="profile-avatar" />
          <div className="profile-photo-actions">
            <label className="btn btn-ghost btn-sm profile-photo-btn" htmlFor="settings-avatar-input">
              {t('profile.changePhoto')}
            </label>
            <input type="file" id="settings-avatar-input" ref={avatarInputRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            {user.avatar && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={removePhoto}>
                {t('profile.removePhoto')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ====== DATOS DE CUENTA ====== */}
      <form className="settings-card" onSubmit={saveAccount}>
        <header className="settings-card-head">
          <h3>{t('settings.accountSection')}</h3>
          <p className="form-hint">{t('settings.accountHint')}</p>
        </header>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="set-name">{t('register.name')}</label>
            <input type="text" id="set-name" required value={acc.name} onChange={setAccField('name')} placeholder={t('register.namePh')} />
          </div>
          <div className="form-group">
            <label htmlFor="set-username">{t('register.username')}</label>
            <input type="text" id="set-username" required value={acc.username} onChange={setAccField('username')} placeholder={t('register.usernamePh')} pattern="^[a-zA-Z0-9_]+$" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="set-email">{t('login.email')}</label>
            <input type="email" id="set-email" required value={acc.email} onChange={setAccField('email')} placeholder="tu@email.com" />
          </div>
          <div className="form-group">
            <label htmlFor="set-password">{t('login.password')}</label>
            <input
              type="password"
              id="set-password"
              value={acc.password}
              onChange={setAccField('password')}
              placeholder={t('settings.passwordKeep')}
              minLength="6"
              autoComplete="new-password"
            />
            <p className="form-hint">{t('settings.passwordKeep')}</p>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="set-bio">{t('profile.bioLabel')}</label>
          <textarea id="set-bio" rows="3" maxLength="220" value={bio} onChange={e => setBio(e.target.value)} placeholder={t('profile.bioPh')}></textarea>
          <p className="form-hint">{bio.length}/220</p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="set-github">{t('profile.githubLabel')}</label>
            <input type="url" id="set-github" value={github} onChange={e => setGithub(e.target.value)} placeholder={t('profile.githubPh')} />
          </div>
          <div className="form-group">
            <label htmlFor="set-portfolio">{t('profile.portfolioLabel')}</label>
            <input type="url" id="set-portfolio" value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder={t('profile.portfolioPh')} />
          </div>
        </div>
        <p className="form-hint">{t('profile.linksHint')}</p>

        <div className="edit-skills-actions">
          <button type="submit" className="btn btn-primary btn-sm">{t('profile.saveBtn')}</button>
        </div>
      </form>

      {/* ====== HABILIDADES ====== */}
      <section className="settings-card">
        <header className="settings-card-head">
          <h3>{t('settings.skillsSection')}</h3>
          <p className="form-hint">{t('settings.skillsHint')}</p>
        </header>

        <div className="settings-skills-summary">
          <span className="settings-summary-label">{t('skillsModal.catLabel')}</span>
          {categories.length === 0
            ? <span className="form-hint">{t('profile.selectCat')}</span>
            : categories.map(c => (
              <span key={c} className="person-cat-chip">{getCategoryLabel(lang, c)}</span>
            ))}
        </div>

        <div className="settings-skills-summary">
          <span className="settings-summary-label">{t('skillsModal.techLabel')}</span>
          {(user.skills || []).length === 0
            ? <span className="form-hint">{t('settings.noSkills')}</span>
            : <SkillTags skills={user.skills} limit={999} />}
        </div>

        <div className="edit-skills-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={openSkillsSettings}>
            {t('settings.editSkills')}
          </button>
        </div>
      </section>
    </div>
  );
}
