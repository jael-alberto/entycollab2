import { useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getUserAvgRating, avatarColorClass, escapeHTML } from '../lib/helpers.js';

export function LoggedHeader() {
  const { user, ratings, lang, theme, menuOpen, setMenuOpen, t, toggleLang, toggleTheme, logout } = useApp();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [setMenuOpen]);

  const avg = user ? getUserAvgRating(user.id, ratings) : 0;

  return (
    <header className="site-header logged-in-header">
      <div className="header-container header-compact">
        <div className="header-brand">
          <div className="header-brand-logo">
            <img src="/img/logo-pg.png" alt="Logo ENTYCOLLAB" className="site-logo-small" />
          </div>
        </div>
        <nav className="header-nav" aria-label="Navegación principal">
          <ul className="nav-list">
            <li><NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>{t('nav.home')}</NavLink></li>
            <li><NavLink to="/proyectos" className={() => 'nav-link' + (isProjectsPath(pathname) ? ' active' : '')}>{t('nav.projects')}</NavLink></li>
            <li><NavLink to="/personas" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>{t('nav.people')}</NavLink></li>
          </ul>
        </nav>
        <div className="header-right">
          <button className={'theme-toggle lang-toggle' + (theme ? ' active' : '')} onClick={toggleLang} title={lang === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish'} aria-label="Cambiar idioma">{lang === 'es' ? 'ES' : 'EN'}</button>
          <button className={'theme-toggle' + (theme ? ' active' : '')} onClick={toggleTheme} title="Cambiar modo claro/oscuro" aria-label="Cambiar modo claro/oscuro">{theme ? '☀️' : '🌙'}</button>
          <div className="user-bubble-wrap" id="user-bubble-wrap" ref={wrapRef}>
            <button className="user-bubble" onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
              <UserBubbleAvatar user={user} />
              <span className="user-bubble-name">{user ? user.name.split(' ')[0] : ''}</span>
              <span className="user-bubble-rating">
                {user ? (avg > 0 ? `★ ${avg.toFixed(1)} ${'☆'.repeat(Math.max(0, 5 - Math.round(avg)))}` : '☆ 0.0') : '☆ 0.0'}
              </span>
            </button>
            {menuOpen && user && (
              <div className="user-bubble-menu" style={{ display: 'block' }}>
                <Link to="/perfil" onClick={() => setMenuOpen(false)}>{t('menu.profile')}</Link>
                <Link to="/proyectos/mis-proyectos" onClick={() => setMenuOpen(false)}>{t('menu.myProjects')}</Link>
                <Link to="/proyectos/postulaciones" onClick={() => setMenuOpen(false)}>{t('menu.myApps')}</Link>
                <a href="#" className="user-bubble-menu-danger" onClick={e => { e.preventDefault(); setMenuOpen(false); logout(); showToast(t('toast.logout'), 'info'); }}>{t('menu.logout')}</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );

}

function isProjectsPath(pathname) {
  return pathname.startsWith('/proyectos')
    && !pathname.endsWith('/mis-proyectos')
    && !pathname.endsWith('/postulaciones');
}

function UserBubbleAvatar({ user }) {
  if (!user) return <span className="user-bubble-avatar">?</span>;
  if (user.avatar) {
    return <span className="user-bubble-avatar"><img src={user.avatar} alt={user.name} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} /></span>;
  }
  return <span className={`user-bubble-avatar ${avatarColorClass(user)}`}>{escapeHTML(user.name.charAt(0).toUpperCase())}</span>;
}

export function PublicHeader() {
  const { t } = useApp();
  return (
    <header className="site-header">
      <div className="header-container">
        <div className="logo-container">
          <img src="/img/logo-pg.png" alt="Logo ENTYCOLLAB" className="site-logo" />
        </div>
        <span className="badge-tag">Open Source Collaboration</span>
        <h1>ENTYCOLLAB</h1>
        <p className="welcome-msg">{t('welcome')}</p>
        <div className="header-actions">
          <NavLink to="/login" className="btn btn-primary">{t('nav.login')}</NavLink>
          <NavLink to="/register" className="btn btn-outline">{t('nav.register')}</NavLink>
        </div>
      </div>
    </header>
  );
}