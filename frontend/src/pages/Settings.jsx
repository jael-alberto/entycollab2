import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Avatar, Field, SkillTags, SkipLink, Spinner } from '../components/common.jsx';
import { fileToDataURL, userCategories, getCategoryLabel, normalizeLinkUrl, escapeHTML } from '../lib/helpers.js';
import { emailKey, nameKey, passwordKey, usernameKey } from '../lib/validation.js';
import {
  disciplineLabel,
  favoriteGenreLabel,
  gameTypeLabel,
  userDisciplines,
  userFavoriteGenres,
  userGameTypes,
  userLanguages
} from '../lib/talent.js';

const BIO_MAX = 220;

function isValidLink(value) {
  if (!value.trim()) return true;
  return !!normalizeLinkUrl(value.trim());
}

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
  const [accErrors, setAccErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const categories = userCategories(user);
  const setAccField = (field) => (e) => {
    setAcc(prev => ({ ...prev, [field]: e.target.value }));
    if (accErrors[field]) setAccErrors(prev => ({ ...prev, [field]: '' }));
  };

  const tErr = (key) => (key ? t(key) : '');

  const saveAccount = (e) => {
    e.preventDefault();
    const found = {
      name: tErr(nameKey(acc.name)),
      username: tErr(usernameKey(acc.username)),
      email: tErr(emailKey(acc.email)),
      password: tErr(passwordKey(acc.password, { allowEmpty: true })),
      github: isValidLink(github) ? '' : t('toast.invalidLink'),
      portfolio: isValidLink(portfolio) ? '' : t('toast.invalidLink'),
    };
    Object.keys(found).forEach(k => { if (!found[k]) delete found[k]; });
    setAccErrors(found);
    if (Object.keys(found).length > 0) {
      showToast(t('form.fixErrors', { n: Object.keys(found).length }), 'error');
      return;
    }

    setSaving(true);
    const res = updateAccount(acc);
    if (res === 'incomplete') {
      setSaving(false);
      return showToast(t('settings.incomplete'), 'error');
    }
    if (res === 'email') {
      setSaving(false);
      setAccErrors(prev => ({ ...prev, email: t('toast.accountExists') }));
      return showToast(t('toast.accountExists'), 'error');
    }
    if (res === 'username') {
      setSaving(false);
      setAccErrors(prev => ({ ...prev, username: t('toast.usernameTaken') }));
      return showToast(t('toast.usernameTaken'), 'error');
    }
    if (res !== 'ok') {
      setSaving(false);
      return showToast(t('toast.invalidLink'), 'error');
    }

    const githubUrl = normalizeLinkUrl(github);
    const portfolioUrl = normalizeLinkUrl(portfolio);

    // Habilidades y categorías no se editan acá: se reenvían como están
    // guardadas para no pisar lo que se cambió desde el modal.
    saveProfile({
      bio: bio.trim(),
      skills: (user.skills || []).slice(),
      categories,
      githubUrl,
      portfolioUrl,
      gameTypes: userGameTypes(user),
      languages: userLanguages(user),
      favoriteGenres: userFavoriteGenres(user),
      disciplines: userDisciplines(user)
    });
    setAcc(prev => ({ ...prev, password: '' }));
    setAccErrors({});
    setSaving(false);
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
    <div className="section-block" id="settings-main">
      <SkipLink targetId="settings-main" />
      <div className="section-header-row">
        <h2 className="section-title">{t('settings.title')}</h2>
        <span className="settings-storage-hint">{t('settings.storageHint')}</span>
      </div>
      <p className="settings-subtitle">{t('settings.subtitle')}</p>

      {/* ====== FOTO DE PERFIL ====== */}
      <section className="settings-card" aria-labelledby="settings-photo-title">
        <header className="settings-card-head">
          <h3 id="settings-photo-title">{t('settings.photoSection')}</h3>
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
      <form className="settings-card" onSubmit={saveAccount} noValidate aria-labelledby="settings-account-title">
        <header className="settings-card-head">
          <h3 id="settings-account-title">{t('settings.accountSection')}</h3>
          <p className="form-hint">{t('settings.accountHint')}</p>
        </header>

        <div className="form-row">
          <Field label={t('register.name')} htmlFor="set-name" error={accErrors.name} required>
            <input type="text" value={acc.name} onChange={setAccField('name')} placeholder={t('register.namePh')} autoComplete="name" />
          </Field>
          <Field label={t('register.username')} htmlFor="set-username" error={accErrors.username} required>
            <input type="text" value={acc.username} onChange={setAccField('username')} placeholder={t('register.usernamePh')} autoComplete="username" />
          </Field>
        </div>

        <div className="form-row">
          <Field label={t('login.email')} htmlFor="set-email" error={accErrors.email} required>
            <input type="email" value={acc.email} onChange={setAccField('email')} placeholder={t('auth.emailPh')} autoComplete="email" />
          </Field>
          <Field label={t('login.password')} htmlFor="set-password" hint={t('settings.passwordKeep')} error={accErrors.password}>
            <input
              type="password"
              value={acc.password}
              onChange={setAccField('password')}
              placeholder={t('settings.passwordKeep')}
              autoComplete="new-password"
            />
          </Field>
        </div>

        <Field
          label={t('profile.bioLabel')}
          htmlFor="set-bio"
          hint={`${bio.length}/${BIO_MAX}`}
        >
          <textarea rows="3" maxLength={BIO_MAX} value={bio} onChange={e => setBio(e.target.value)} placeholder={t('profile.bioPh')}></textarea>
        </Field>

        <div className="form-row">
          <Field label={t('profile.githubLabel')} htmlFor="set-github" error={accErrors.github}>
            <input type="url" value={github} onChange={e => { setGithub(e.target.value); if (accErrors.github) setAccErrors(prev => ({ ...prev, github: '' })); }} placeholder={t('profile.githubPh')} autoComplete="url" />
          </Field>
          <Field label={t('profile.portfolioLabel')} htmlFor="set-portfolio" error={accErrors.portfolio}>
            <input type="url" value={portfolio} onChange={e => { setPortfolio(e.target.value); if (accErrors.portfolio) setAccErrors(prev => ({ ...prev, portfolio: '' })); }} placeholder={t('profile.portfolioPh')} autoComplete="url" />
          </Field>
        </div>
        <p className="form-hint">{t('profile.linksHint')}</p>

        <div className="edit-skills-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving} aria-busy={saving}>
            {saving && <Spinner />}
            {saving ? t('settings.saving') : t('profile.saveBtn')}
          </button>
        </div>
      </form>

      {/* ====== HABILIDADES ====== */}
      <section className="settings-card" aria-labelledby="settings-skills-title">
        <header className="settings-card-head">
          <h3 id="settings-skills-title">{t('settings.skillsSection')}</h3>
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

      {/* ====== PERFIL DE TALENTO ====== */}
      <section className="settings-card" aria-labelledby="settings-talent-title">
        <header className="settings-card-head">
          <h3 id="settings-talent-title">{t('settings.talentSection')}</h3>
          <p className="form-hint">{t('settings.talentHint')}</p>
        </header>

        {/* Sin tipo de juego ni habilidad la persona desaparece en cuanto alguien
            filtra por el buscador, así que se avisa. */}
        {userGameTypes(user).length === 0 && (
          <div className="talent-warning" role="status">{t('settings.talentIncomplete')}</div>
        )}

        <div className="settings-skills-summary">
          <span className="settings-summary-label">{t('settings.gameTypesLabel')}</span>
          {userGameTypes(user).length === 0
            ? <span className="form-hint">{t('settings.noGameTypes')}</span>
            : userGameTypes(user).map(v => (
              <span key={v} className="person-cat-chip">{escapeHTML(gameTypeLabel(lang, v))}</span>
            ))}
        </div>

        <div className="settings-skills-summary">
          <span className="settings-summary-label">{t('settings.languagesLabel')}</span>
          {userLanguages(user).length === 0
            ? <span className="form-hint">{t('settings.noLanguages')}</span>
            : <SkillTags skills={userLanguages(user)} limit={999} />}
        </div>

        <div className="settings-skills-summary">
          <span className="settings-summary-label">{t('settings.favoriteGenresLabel')}</span>
          {userFavoriteGenres(user).length === 0
            ? <span className="form-hint">{t('settings.noGenres')}</span>
            : userFavoriteGenres(user).map(v => (
              <span key={v} className="person-cat-chip">{escapeHTML(favoriteGenreLabel(lang, v))}</span>
            ))}
        </div>

        <div className="settings-skills-summary">
          <span className="settings-summary-label">{t('settings.disciplinesLabel')}</span>
          {userDisciplines(user).length === 0
            ? <span className="form-hint">{t('settings.noDisciplines')}</span>
            : userDisciplines(user).map(v => (
              <span key={v} className="person-cat-chip">{escapeHTML(disciplineLabel(lang, v))}</span>
            ))}
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
