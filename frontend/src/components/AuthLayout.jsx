import { useApp } from '../context/AppContext.jsx';

/**
 * AuthLayout — Split-screen wrapper for Login / Register pages.
 * Left 50%: pure-black panel with white text + theme toggle top-left
 * Right 50%: Antrio space image, no overlay, no text
 * Mobile: image becomes a short banner at the top
 */
export default function AuthLayout({ children }) {
  const { theme, toggleTheme, lang, toggleLang, t } = useApp();

  return (
    <div className="auth-split">
      {/* ── Left panel: form ── */}
      <div className="auth-split__form">
        {/* Language & Theme toggles — top-left corner */}
        <div className="auth-top-controls">
          <button
            id="auth-lang-toggle"
            className={'theme-toggle lang-toggle auth-lang-btn' + (theme ? ' active' : '')}
            onClick={toggleLang}
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
            aria-label={t('auth.langToggle')}
          >
            {lang === 'es' ? 'ES' : 'EN'}
          </button>
          <button
            id="auth-theme-toggle"
            className={'theme-toggle auth-theme-btn' + (theme ? ' active' : '')}
            onClick={toggleTheme}
            title={theme ? t('auth.themeToggleLight') : t('auth.themeToggleDark')}
            aria-label={theme ? t('auth.themeToggleLight') : t('auth.themeToggleDark')}
          >
            {theme ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="auth-split__form-inner">
          {children}
        </div>
      </div>

      {/* ── Right panel: illustration only, no overlay ── */}
      <div className="auth-split__visual" aria-hidden="true">
        <img
          src="/img/antrio-space.jpg"
          alt={t('auth.imgAlt')}
          className="auth-split__visual-img"
        />
      </div>
    </div>
  );
}
