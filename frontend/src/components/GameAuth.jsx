import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Icon, Modal, SkipLink, Spinner } from './common.jsx';
import { LegalContent } from '../pages/Legal.jsx';
import { ALL_LANGUAGES, DISCIPLINES, FAVORITE_GENRES, GAME_TYPES, disciplineLabel, favoriteGenreLabel, gameTypeLabel } from '../lib/talent.js';
import { emailKey, nameKey, passwordKey, requiredKey, usernameKey } from '../lib/validation.js';

function ChoiceGrid({ items, selected, onChange, label, describedBy }) {
  return (
    <div className="game-auth-choice-grid" role="group" aria-label={label} aria-describedby={describedBy}>
      {items.map(item => {
        const val = item.value || item;
        const active = selected.includes(val);
        return (
          <button
            key={val}
            type="button"
            className={active ? 'selected' : ''}
            aria-pressed={active}
            onClick={() => onChange(val)}
          >
            <i aria-hidden="true">{active ? '✓' : ''}</i>
            {item.label || item}
          </button>
        );
      })}
    </div>
  );
}

/** Logotipo oficial multicolor de Google (solo UI, sin OAuth real). */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

/** Marca oficial de GitHub (solo UI, sin OAuth real). */
function GitHubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function GameAuth({ initialMode }) {
  const { login, register, t, lang } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legal, setLegal] = useState(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [gameTypes, setGameTypes] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [stepError, setStepError] = useState('');
  const isRegister = initialMode === 'register';

  const toggle = (setter, selected, value) =>
    setter(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);

  // Solo UI brandeada: no hay OAuth real implementado.
  const social = () => showToast(t('auth.socialSoon'), 'info');

  const openLegal = (section) => (e) => {
    e.preventDefault();
    setLegal(section);
  };

  const tabKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const target = e.key === 'ArrowRight' ? '/register' : '/login';
    navigate(target);
    window.setTimeout(() => {
      const active = document.querySelector('.game-auth-tabs [aria-selected="true"]');
      if (active && typeof active.focus === 'function') active.focus();
    }, 0);
  };

  const tErr = (key, replacements) => (key ? t(key, replacements) : '');

  const continueAccount = (event) => {
    event.preventDefault();
    const errors = {
      name: tErr(nameKey(name)),
      username: tErr(usernameKey(username)),
      email: tErr(emailKey(email)),
      password: tErr(passwordKey(password)),
    };
    setFieldErrors(errors);
    if (errors.name || errors.username || errors.email || errors.password) return;
    setStepError('');
    setStep(2);
  };

  const continueExperience = () => {
    if (!gameTypes.length || !languages.length) {
      setStepError(t('auth.chooseAtLeastOne'));
      return;
    }
    setStepError('');
    setStep(3);
  };

  const submitRegister = () => {
    if (!favoriteGenres.length || !disciplines.length) {
      setStepError(t('auth.chooseAtLeastOne'));
      return;
    }
    setLoading(true);
    const result = register({
      name: name.trim(),
      username: username.replace(/^@/, '').trim(),
      email: email.trim().toLowerCase(),
      password,
      skills: [...new Set([...languages, ...disciplines.map(value => disciplineLabel(lang, value))])],
      bio: '',
      gameTypes,
      favoriteGenres,
      disciplines,
      languages
    });
    setLoading(false);
    if (result === 'email') {
      setFieldErrors(prev => ({ ...prev, email: t('toast.accountExists') }));
      setStep(1);
      return;
    }
    if (result === 'username') {
      setFieldErrors(prev => ({ ...prev, username: t('toast.usernameTaken') }));
      setStep(1);
      return;
    }
    showToast(t('toast.welcome', { name: username.replace(/^@/, '').trim() }), 'success');
    navigate('/perfil');
  };

  const submitLogin = (event) => {
    event.preventDefault();
    const errors = {
      loginIdentifier: tErr(requiredKey(loginIdentifier)),
      loginPassword: tErr(requiredKey(loginPassword)),
    };
    setFieldErrors(errors);
    if (errors.loginIdentifier || errors.loginPassword) return;
    setLoading(true);
    const user = login(loginIdentifier.trim(), loginPassword);
    setLoading(false);
    if (!user) {
      setStepError(t('toast.loginError'));
      return;
    }
    setStepError('');
    showToast(t('toast.welcome', { name: user.username }), 'success');
    navigate('/dashboard');
  };

  const legalRow = (
    <p className="auth-legal">
      {t('auth.legalAgree')}{' '}
      <a href="/legal/privacidad" onClick={openLegal('privacy')}>{t('auth.privacy')}</a>
      {' · '}
      <a href="/legal/terminos" onClick={openLegal('terms')}>{t('auth.terms')}</a>
    </p>
  );

  const oauthRow = (
    <div className="game-auth-oauth">
      <button type="button" className="oauth-btn" onClick={social}>
        <GoogleMark />
        <span>{t('auth.google')}</span>
      </button>
      <button type="button" className="oauth-btn" onClick={social}>
        <GitHubMark />
        <span>{t('auth.github')}</span>
      </button>
    </div>
  );

  const passwordToggleLabel = showPassword ? t('auth.hidePassword') : t('auth.showPassword');

  return (
    <div className="game-auth-page">
      <SkipLink targetId="game-auth-main" />
      <header className="game-auth-header">
        <div className="game-auth-header-inner">
          <Link className="game-auth-back" to="/">← {t('auth.backHome')}</Link>
          <Link className="game-auth-logo" to="/"><span aria-hidden="true"><Icon name="gamepad" size={16} /></span> ENTYTEC<b>OLLAB</b></Link>
          <div className="game-auth-tabs" role="tablist" aria-label={`${t('nav.login')} / ${t('nav.register')}`} onKeyDown={tabKeyDown}>
            <Link role="tab" aria-selected={!isRegister} tabIndex={!isRegister ? 0 : -1} className={!isRegister ? 'active' : ''} to="/login">{t('nav.login')}</Link>
            <Link role="tab" aria-selected={isRegister} tabIndex={isRegister ? 0 : -1} className={isRegister ? 'active register' : ''} to="/register">{t('nav.register')}</Link>
          </div>
        </div>
      </header>
      <main className="game-auth-main" id="game-auth-main" tabIndex={-1}>
        {isRegister ? (
          <section className="game-auth-register" aria-labelledby="game-auth-register-title">
            <div className="game-auth-title">
              <h1 id="game-auth-register-title">{t('register.title')}</h1>
              <p>{t('register.subtitle')}</p>
            </div>
            <div className="game-auth-progress">
              <div>
                <span>{t('auth.stepOf', { step })}</span>
                <span>{step === 1 ? t('auth.stepAccount') : step === 2 ? t('auth.stepExperience') : t('auth.stepPrefs')}</span>
              </div>
              <ol aria-label={t('auth.stepOf', { step })}>
                {[1, 2, 3].map(number => (
                  <li
                    key={number}
                    aria-current={number === step ? 'step' : undefined}
                    className={`${step >= number ? 'active' : ''} ${step > number ? 'completed' : ''}`}
                  >
                    <span aria-hidden="true">{number}</span>
                  </li>
                ))}
              </ol>
            </div>
            {stepError && <p className="game-auth-error" role="alert">{stepError}</p>}
            {step === 1 && (
              <form onSubmit={continueAccount} className="game-auth-form" noValidate>
                <div className="game-auth-row">
                  <Field label={t('register.name')} htmlFor="ga-name" error={fieldErrors.name} required>
                    <input value={name} onChange={event => setName(event.target.value)} placeholder={t('register.namePh')} autoComplete="name" />
                  </Field>
                  <Field label={t('register.username')} htmlFor="ga-username" error={fieldErrors.username} required>
                    <input value={username} onChange={event => setUsername(event.target.value)} placeholder={t('register.usernamePh')} autoComplete="username" />
                  </Field>
                </div>
                <Field label={t('login.email')} htmlFor="ga-email" error={fieldErrors.email} required>
                  <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder={t('auth.emailPh')} autoComplete="email" />
                </Field>
                <Field label={t('login.password')} htmlFor="ga-password" error={fieldErrors.password} required>
                  <span className="game-auth-password">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder={t('register.passwordPh')}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={passwordToggleLabel} aria-pressed={showPassword}>
                      {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    </button>
                  </span>
                </Field>
                <button className="game-auth-primary" type="submit" disabled={loading} aria-busy={loading}>
                  {loading && <Spinner />}
                  {loading ? t('auth.creating') : t('auth.continue')}
                </button>
                {legalRow}
              </form>
            )}
            {step === 2 && (
              <div className="game-auth-step">
                <section aria-labelledby="ga-gt-title">
                  <h2 id="ga-gt-title">{t('filters.gameTypes')}</h2>
                  <p id="ga-gt-hint">{t('filters.languagesHint')}</p>
                  <ChoiceGrid label={t('filters.gameTypes')} describedBy="ga-gt-hint" items={GAME_TYPES.map(item => ({ ...item, label: gameTypeLabel(lang, item.value) }))} selected={gameTypes} onChange={value => toggle(setGameTypes, gameTypes, value)} />
                </section>
                <section aria-labelledby="ga-lang-title">
                  <h2 id="ga-lang-title">{t('filters.languages')}</h2>
                  <p>{t('settings.languagesHintActive')}</p>
                  <ChoiceGrid label={t('filters.languages')} items={ALL_LANGUAGES} selected={languages} onChange={value => toggle(setLanguages, languages, value)} />
                </section>
                <div className="game-auth-next">
                  <button type="button" onClick={() => { setStepError(''); setStep(1); }}>{t('auth.back')}</button>
                  <button type="button" className="game-auth-primary" onClick={continueExperience}>{t('auth.continue')}</button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="game-auth-step">
                <section aria-labelledby="ga-fg-title">
                  <h2 id="ga-fg-title">{t('auth.favGenresTitle')}</h2>
                  <p>{t('auth.favGenresHint')}</p>
                  <ChoiceGrid label={t('auth.favGenresTitle')} items={FAVORITE_GENRES.map(item => ({ ...item, label: favoriteGenreLabel(lang, item.value) }))} selected={favoriteGenres} onChange={value => toggle(setFavoriteGenres, favoriteGenres, value)} />
                </section>
                <section aria-labelledby="ga-disc-title">
                  <h2 id="ga-disc-title">{t('auth.skillsTitle')}</h2>
                  <p>{t('auth.skillsHint')}</p>
                  <ChoiceGrid label={t('auth.skillsTitle')} items={DISCIPLINES.map(item => ({ ...item, label: disciplineLabel(lang, item.value) }))} selected={disciplines} onChange={value => toggle(setDisciplines, disciplines, value)} />
                </section>
                <div className="game-auth-next">
                  <button type="button" onClick={() => { setStepError(''); setStep(2); }}>{t('auth.back')}</button>
                  <button type="button" className="game-auth-primary" onClick={submitRegister} disabled={loading} aria-busy={loading}>
                    {loading && <Spinner />}
                    {loading ? t('auth.creating') : t('register.submit')}
                  </button>
                </div>
              </div>
            )}
            <p className="game-auth-switch">{t('register.switch')}<Link to="/login">{t('register.switchLink')}</Link></p>
          </section>
        ) : (
          <section className="game-auth-login" aria-labelledby="game-auth-login-title">
            <div className="game-auth-login-icon" aria-hidden="true"><Icon name="gamepad" size={28} /></div>
            <h1 id="game-auth-login-title">{t('auth.loginHeading')}</h1>
            <div className="game-auth-login-card">
              <form onSubmit={submitLogin} className="game-auth-form" noValidate>
                <Field label={t('auth.loginIdLabel')} htmlFor="ga-login-id" error={fieldErrors.loginIdentifier} required>
                  <input value={loginIdentifier} onChange={event => setLoginIdentifier(event.target.value)} placeholder={t('auth.loginIdPh')} autoComplete="username" />
                </Field>
                <Field label={t('login.password')} htmlFor="ga-login-password" error={fieldErrors.loginPassword} required>
                  <span className="game-auth-password">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={event => setLoginPassword(event.target.value)}
                      placeholder={t('auth.passwordPh')}
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={passwordToggleLabel} aria-pressed={showPassword}>
                      {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    </button>
                  </span>
                </Field>
                {stepError && <p className="game-auth-error" role="alert">{stepError}</p>}
                <button className="game-auth-primary" type="submit" disabled={loading} aria-busy={loading}>
                  {loading && <Spinner />}
                  {loading ? t('auth.signingIn') : t('login.submit')}
                </button>
                {legalRow}
              </form>
              <div className="game-auth-or" aria-hidden="true"><span>{t('auth.orContinueWith')}</span></div>
              {oauthRow}
            </div>
            <div className="game-auth-new">{t('auth.newHere')} <Link to="/register">{t('auth.createOne')}</Link></div>
          </section>
        )}
      </main>
      <Modal open={!!legal} onClose={() => setLegal(null)} title={legal === 'terms' ? t('auth.terms') : t('auth.privacy')}>
        <LegalContent section={legal} />
      </Modal>
    </div>
  );
}
