import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getUserAvgRating, avatarColorClass, escapeHTML } from '../lib/helpers.js';

export function LoggedHeader() {
  const { user, ratings, lang, theme, menuOpen, setMenuOpen, activeGroup, groups, t, toggleLang, toggleTheme, logout, selectGroup } = useApp();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [setMenuOpen]);

  const avg = user ? getUserAvgRating(user.id, ratings) : 0;
  const myGroups = groups.filter(group => group.members?.some(member => member.userId === user?.id));
  const isDashboard = pathname === '/dashboard';
  const isGroupWorkspace = pathname.startsWith('/grupos/');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (isDashboard && !activeGroup) {
      // En dashboard sin grupo: buscar grupos
      // El filtrado se hace en el sidebar del dashboard
    } else if (isGroupWorkspace) {
      // En workspace de grupo: navegar a la tab correspondiente con filtro
      const groupId = activeGroup?.id;
      if (groupId) {
        navigate(`/grupos/${groupId}?tab=projects&q=${encodeURIComponent(searchQuery)}`);
      }
    } else {
      // En otras páginas: buscar globalmente en proyectos
      navigate(`/proyectos?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleGlobalSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <header className="site-header logged-in-header">
      <div className="header-container header-compact">
        <div className="header-left">
          <Link to="/dashboard" onClick={() => selectGroup(null)} className="header-logo-link" title="EntyTec">
            <img src="/img/logo-pg.png" alt="EntyTec" className="site-logo-small" />
            <span className="header-brand-name">EntyTec</span>
          </Link>
        </div>

        <div className="header-center">
          <form className="header-search-form" onSubmit={handleSearch} role="search">
            <label htmlFor="global-search" className="sr-only">
              {isDashboard && !activeGroup ? 'Buscar grupos' : isGroupWorkspace ? `Buscar en ${activeGroup?.name}` : 'Buscar proyectos'}
            </label>
            <div className="search-input-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                id="global-search"
                type="search"
                className="header-search-input"
                placeholder={isDashboard && !activeGroup ? 'Buscar grupos...' : isGroupWorkspace ? `Buscar en ${activeGroup?.name}...` : 'Buscar proyectos, personas...'}
                value={searchQuery}
                onChange={handleGlobalSearchChange}
                autoComplete="off"
              />
              {searchQuery && (
                <button type="button" className="search-clear" onClick={clearSearch} aria-label="Limpiar búsqueda">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="header-right">
          <button className={'theme-toggle lang-toggle' + (theme ? ' active' : '')} onClick={toggleLang} title={lang === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish'} aria-label="Cambiar idioma">
            {lang === 'es' ? 'ES' : 'EN'}
          </button>
          <button className={'theme-toggle' + (theme ? ' active' : '')} onClick={toggleTheme} title="Cambiar modo claro/oscuro" aria-label="Cambiar modo claro/oscuro">
            {theme ? '☀️' : '🌙'}
          </button>
          <div className="user-bubble-wrap" id="user-bubble-wrap" ref={wrapRef}>
            <button className="user-bubble" onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
              <UserBubbleAvatar user={user} />
              <span className="user-bubble-name">{user ? user.name.split(' ')[0] : ''}</span>
              <span className="user-bubble-rating">
                {user ? (avg > 0 ? `★ ${avg.toFixed(1)}` : '☆ 0.0') : '☆ 0.0'}
              </span>
            </button>
            {menuOpen && user && (
              <div className="user-bubble-menu" style={{ display: 'block' }}>
                <Link to="/perfil" onClick={() => setMenuOpen(false)}>{t('menu.profile')}</Link>
                <Link to="/proyectos/mis-proyectos" onClick={() => setMenuOpen(false)}>{t('menu.myProjects')}</Link>
                <Link to="/proyectos/postulaciones" onClick={() => setMenuOpen(false)}>{t('menu.myApps')}</Link>
                <Link to="/ajustes" onClick={() => setMenuOpen(false)}>{t('menu.settings')}</Link>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
                <a href="#" className="user-bubble-menu-danger" onClick={e => { e.preventDefault(); setMenuOpen(false); logout(); showToast(t('toast.logout'), 'info'); }}>{t('menu.logout')}</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
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