import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Icon, Modal, SkipLink, Spinner } from './common.jsx';
import { LegalContent } from '../pages/Legal.jsx';
import { ALL_LANGUAGES, DISCIPLINES, FAVORITE_GENRES, GAME_TYPES, disciplineLabel, favoriteGenreLabel, gameTypeLabel } from '../lib/talent.js';
import { emailKey, nameKey, passwordKey, requiredKey, usernameKey } from '../lib/validation.js';
import { supabase } from '../lib/supabaseClient.js';

function ChoiceGrid({ items, selected, onChange, label, describedBy }) {
  return (
    <div className="ga-grid" role="group" aria-label={label} aria-describedby={describedBy}>
      {items.map(item => {
        const val = item.value || item;
        const active = selected.includes(val);
        return (
          <button key={val} type="button" className={active ? 'is-active' : ''} aria-pressed={active} onClick={() => onChange(val)}>
            <i aria-hidden="true">{active ? <Icon name="check" size={12} /> : ''}</i>
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

// ─── Feature flag ────────────────────────────────────────────────────────────
// Cambia a `true` cuando hayas configurado los proveedores OAuth en Supabase
// (Google y GitHub). Ver docs/DEPLOY_STAGING.md para los pasos de configuración.
// No es necesario tocar nada más en el código: todo está implementado.
const OAUTH_ENABLED = false;
// ─────────────────────────────────────────────────────────────────────────────

export default function GameAuth({ initialMode }) {
  const { login, register, t, lang, theme, toggleTheme, toggleLang } = useApp();
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
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [available, setAvailable] = useState(true);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [stepError, setStepError] = useState('');
  const isRegister = initialMode === 'register';

  const toggle = (setter, selected, value) =>
    setter(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);

  const signInWithProvider = async (provider) => {
    if (!supabase) {
      showToast(t('auth.socialSoon'), 'info');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) showToast(error.message, 'error');
    } catch {
      showToast(t('errors.generic'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const openLegal = (section) => (e) => {
    e.preventDefault();
    setLegal(section);
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

  const submitRegister = async () => {
    if (!gameTypes.length || !favoriteGenres.length) {
      setStepError(t('auth.chooseAtLeastOne'));
      return;
    }
    setLoading(true);
    const result = await register({
      name: name.trim(),
      username: username.replace(/^@/, '').trim(),
      email: email.trim().toLowerCase(),
      password,
      skills: [...new Set(disciplines.map(value => disciplineLabel(lang, value)))],
      bio: '',
      gameTypes,
      favoriteGenres,
      disciplines,
      languages: [],
      available
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
    if (result !== 'ok') {
      setStepError(t('toast.registerError'));
      return;
    }
    showToast(t('toast.welcome', { name: username.replace(/^@/, '').trim() }), 'success');
    navigate('/perfil');
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    const errors = {
      loginIdentifier: tErr(requiredKey(loginIdentifier)),
      loginPassword: tErr(requiredKey(loginPassword)),
    };
    setFieldErrors(errors);
    if (errors.loginIdentifier || errors.loginPassword) return;
    setLoading(true);
    const user = await login(loginIdentifier.trim(), loginPassword);
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
    <p className="ga-legal">
      {t('auth.legalAgree')}{' '}
      <a href="/legal/privacidad" onClick={openLegal('privacy')}>{t('auth.privacy')}</a>
      {' · '}
      <a href="/legal/terminos" onClick={openLegal('terms')}>{t('auth.terms')}</a>
    </p>
  );

  const oauthRow = OAUTH_ENABLED ? (
    <div className="ga-social">
      <button type="button" className="ga-social-btn" onClick={() => signInWithProvider('google')} disabled={loading}>
        <GoogleMark />
        <span>{t('auth.google')}</span>
      </button>
      <button type="button" className="ga-social-btn" onClick={() => signInWithProvider('github')} disabled={loading}>
        <GitHubMark />
        <span>{t('auth.github')}</span>
      </button>
    </div>
  ) : null;

  const passwordToggleLabel = showPassword ? t('auth.hidePassword') : t('auth.showPassword');

  const visual = (
    <div className="ga-visual ga-visual--art" aria-hidden="true">
      <img className="ga-visual-img" src="/img/antrio-space.jpg" alt="" />
    </div>
  );

  const notice = (
    <div className="ga-notice" role="note">
      <Icon name="alert" size={16} />
      <span>Prototipo visual. No introduzcas contraseñas reales. Cuenta demo: <b>maria@demo.com</b> / <b>123456</b>.</span>
    </div>
  );

  return (
    <div className="ga-page">
      <SkipLink targetId="ga-main" />
      <div className="ga-split">
        {visual}
        <main className="ga-panel" id="ga-main" tabIndex={-1}>
          <div className="ga-panel-top">
            <Link className="ga-back" to="/">{t('auth.backHome')}</Link>
            <div className="ga-panel-controls">
              <button
                type="button"
                className="ga-control-btn"
                onClick={toggleLang}
                title={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
                aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
              >
                {lang === 'es' ? 'ES' : 'EN'}
              </button>
              <button
                type="button"
                className="ga-control-btn"
                onClick={toggleTheme}
                title={theme ? t('auth.themeToggleLight') : t('auth.themeToggleDark')}
                aria-label={theme ? t('auth.themeToggleLight') : t('auth.themeToggleDark')}
                aria-pressed={!!theme}
              >
                <Icon name={theme ? 'sun' : 'moon'} size={16} />
              </button>
            </div>
          </div>

          {isRegister ? (
            <section className="ga-form-wrap" aria-labelledby="ga-register-title">
              <p className="ga-eyebrow">BIENVENIDO A ENTYTEC COLLAB</p>
              <h1 id="ga-register-title">Crea tu cuenta demo</h1>
              <p className="ga-lead">Crea tu cuenta y empieza a construir con la comunidad.</p>
              {stepError && <p className="ga-error" role="alert">{stepError}</p>}

              {step === 1 && (
                <form onSubmit={continueAccount} className="ga-form" noValidate>
                  <Field label={t('register.name')} htmlFor="ga-name" error={fieldErrors.name} required>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder={t('register.namePh')} autoComplete="name" />
                  </Field>
                  <div className="ga-row">
                    <Field label={t('register.username')} htmlFor="ga-username" error={fieldErrors.username} required>
                      <input value={username} onChange={e => setUsername(e.target.value)} placeholder={t('register.usernamePh')} autoComplete="username" />
                    </Field>
                    <Field label={t('register.email')} htmlFor="ga-email" error={fieldErrors.email} required>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.emailPh')} autoComplete="email" />
                    </Field>
                  </div>
                  <Field label={t('register.password')} htmlFor="ga-password" error={fieldErrors.password} required>
                    <span className="ga-password">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('register.passwordPh')} autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={passwordToggleLabel} aria-pressed={showPassword}>
                        <Icon name={showPassword ? 'x' : 'search'} size={15} />
                      </button>
                    </span>
                  </Field>
                  <label className="ga-check">
                    <input type="checkbox" required />
                    <span>{t('auth.legalAgree')} <a href="/legal/privacidad" onClick={openLegal('privacy')}>{t('auth.privacy')}</a> · <a href="/legal/terminos" onClick={openLegal('terms')}>{t('auth.terms')}</a></span>
                  </label>
                  <button className="ga-primary" type="submit" disabled={loading} aria-busy={loading}>
                    {loading && <Spinner />}
                    {loading ? t('auth.creating') : t('auth.continue')}
                  </button>
                </form>
              )}

              {step === 1 && (
                <>
                  <div className="ga-divider" aria-hidden="true"><span>{t('auth.orContinueWith')}</span></div>
                  {oauthRow}
                </>
              )}

              {step === 2 && (
                <div className="ga-form">
                  <section aria-labelledby="ga-gt-title">
                    <h3 id="ga-gt-title">¿Qué te gusta crear?</h3>
                    <ChoiceGrid items={GAME_TYPES.map(item => ({ ...item, label: gameTypeLabel(lang, item.value) }))} selected={gameTypes} onChange={v => toggle(setGameTypes, gameTypes, v)} label={t('filters.gameTypes')} />
                  </section>
                  <section aria-labelledby="ga-fg-title">
                    <h3 id="ga-fg-title">¿Con qué disciplina colaboras?</h3>
                    <ChoiceGrid items={FAVORITE_GENRES.map(item => ({ ...item, label: favoriteGenreLabel(lang, item.value) }))} selected={favoriteGenres} onChange={v => toggle(setFavoriteGenres, favoriteGenres, v)} label={t('filters.favGenres')} />
                    <div className="ga-extra">
                      <ChoiceGrid items={DISCIPLINES.map(item => ({ ...item, label: disciplineLabel(lang, item.value) }))} selected={disciplines} onChange={v => toggle(setDisciplines, disciplines, v)} label={t('auth.skillsTitle')} />
                    </div>
                  </section>
                  <label className="ga-check">
                    <input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} />
                    <span>Disponible para colaborar</span>
                  </label>
                  <div className="ga-actions">
                    <button type="button" className="ga-ghost" onClick={() => { setStepError(''); setStep(1); }}>{t('auth.back')}</button>
                    <button type="button" className="ga-primary" onClick={submitRegister} disabled={loading} aria-busy={loading}>
                      {loading && <Spinner />}
                      {loading ? t('auth.creating') : t('register.submit')} <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              )}

              <p className="ga-switch">{t('auth.alreadyHave')} <Link to="/login">{t('auth.logIn')}</Link></p>
            </section>
          ) : (
            <section className="ga-form-wrap" aria-labelledby="ga-login-title">
              <p className="ga-eyebrow">BIENVENIDO A ENTYTEC COLLAB</p>
              <h1 id="ga-login-title">Volvamos a crear.</h1>
              <p className="ga-lead">Entra a tu espacio y sigue dando vida a tus ideas.</p>
              <form onSubmit={submitLogin} className="ga-form" noValidate>
                {oauthRow}
                <div className="ga-divider" aria-hidden="true"><span>{t('auth.orContinueWith')}</span></div>
                <Field label={t('auth.loginIdLabel')} htmlFor="ga-login-id" error={fieldErrors.loginIdentifier} required>
                  <input value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} placeholder={t('auth.loginIdPh')} autoComplete="username" />
                </Field>
                <Field label={t('login.password')} htmlFor="ga-login-password" error={fieldErrors.loginPassword} required>
                  <span className="ga-password">
                    <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder={t('auth.passwordPh')} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={passwordToggleLabel} aria-pressed={showPassword}>
                      <Icon name={showPassword ? 'x' : 'search'} size={15} />
                    </button>
                  </span>
                </Field>
                {stepError && <p className="ga-error" role="alert">{stepError}</p>}
                <div className="ga-remember">
                  <label className="ga-check">
                    <input type="checkbox" />
                    <span>Recordarme</span>
                  </label>
                  <a href="/login" onClick={e => { e.preventDefault(); showToast(t('auth.forgotSoon'), 'info'); }}>¿Olvidaste tu contraseña?</a>
                </div>
                <button className="ga-primary" type="submit" disabled={loading} aria-busy={loading}>
                  {loading && <Spinner />}
                  {loading ? t('auth.signingIn') : t('login.submit')} <span aria-hidden="true">→</span>
                </button>
              </form>
              <p className="ga-switch">{t('auth.newHere')} <Link to="/register">{t('auth.createOne')}</Link></p>
              {notice}
            </section>
          )}
        </main>
      </div>
      <Modal open={!!legal} onClose={() => setLegal(null)} title={legal === 'terms' ? t('auth.terms') : t('auth.privacy')}>
        <LegalContent section={legal} />
      </Modal>
    </div>
  );
}
