import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Icon, GroupAvatar } from './common.jsx';
import { getUserAvgRating, avatarColorClass, escapeHTML } from '../lib/helpers.js';

// Agente B: navegación única compartida por LoggedHeader y PublicHeader.
// NavLink aplica aria-current="page" automáticamente al enlace activo.
const siteLinks = [
  { to: '/proyectos', label: 'Explorar', end: false },
  { to: '/proyectos/mis-proyectos', label: 'Publicar', end: false },
  { to: '/personas', label: 'Personas', end: true },
  { to: '/perfil', label: 'Mi cuenta', end: true },
];

function SiteNav({ label = 'Principal' }) {
  return (
    <nav className="header-nav" aria-label={label}>
      <ul className="nav-list">
        {siteLinks.map(link => (
          <li key={link.to}>
            <NavLink to={link.to} end={link.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LoggedHeader() {
  const { user, ratings, lang, theme, menuOpen, setMenuOpen, activeGroup, groups, t, toggleLang, toggleTheme, logout, selectGroup } = useApp();
  const { showToast } = useToast();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const siteRef = useRef(null);
  const [siteOpen, setSiteOpen] = useState(false);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
      if (siteRef.current && !siteRef.current.contains(e.target)) setSiteOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [setMenuOpen]);

  const avg = user ? getUserAvgRating(user.id, ratings) : 0;
  const myGroups = groups.filter(group => group.members?.some(member => member.userId === user?.id));
  const isGroupWorkspace = pathname.startsWith('/grupos/');
  const isGlobal = pathname === '/dashboard' && new URLSearchParams(search).get('view') === 'global';
  const showSiteSwitcher = isGlobal || isGroupWorkspace;
  const siteLabel = isGroupWorkspace && activeGroup
    ? activeGroup.name
    : isGlobal
      ? t('dash.global')
      : 'ENTYCOLLAB';

  const goGlobal = () => {
    selectGroup(null);
    setSiteOpen(false);
    navigate('/dashboard?view=global');
  };

  const goGroup = (groupId) => {
    selectGroup(groupId);
    setSiteOpen(false);
    navigate(`/grupos/${groupId}`);
  };

  return (
    <header className="site-header logged-in-header">
      <div className="header-container header-compact">
        <div className="header-left">
          <Link
            to="/dashboard"
            className="header-logo-link"
            title={t('dash.backHome')}
            aria-label={t('dash.backHome')}
            onClick={() => { selectGroup(null); setSiteOpen(false); }}
          >
            <img src="/img/logo-pg.png" alt="EntyTec" className="header-logo-img" />
          </Link>

          {showSiteSwitcher && (
          <div className="site-switcher" ref={siteRef}>
            <button
              type="button"
              className="site-switcher-btn"
              onClick={e => { e.stopPropagation(); setSiteOpen(open => !open); }}
              aria-haspopup="menu"
              aria-expanded={siteOpen}
            >
              {isGroupWorkspace && activeGroup
                ? <GroupAvatar group={activeGroup} size="sm" />
                : <Icon name={isGlobal ? 'globe' : 'home'} size={16} />}
              <span className="site-switcher-label">{escapeHTML(siteLabel)}</span>
              <span className="site-switcher-caret">▾</span>
            </button>

            {siteOpen && (
              <div className="site-switcher-menu" role="menu">
                <button
                  type="button"
                  className={`site-switcher-item${isGlobal ? ' active' : ''}`}
                  role="menuitem"
                  onClick={goGlobal}
                >
                  <Icon name="globe" size={16} />
                  <span className="site-switcher-item-name">{t('dash.global')}</span>
                  {isGlobal && <span className="site-switcher-item-check">✓</span>}
                </button>

                <div className="site-switcher-sep" />
                <div className="site-switcher-heading">
                  {t('dash.yourGroups')} · {myGroups.length}
                </div>

                {myGroups.length === 0 ? (
                  <p className="site-switcher-empty">{t('dash.noGroups')}</p>
                ) : (
                  myGroups.map(group => {
                    const isActive = isGroupWorkspace && activeGroup?.id === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        className={`site-switcher-item${isActive ? ' active' : ''}`}
                        role="menuitem"
                        onClick={() => goGroup(group.id)}
                      >
                        <GroupAvatar group={group} size="sm" />
                        <span className="site-switcher-item-name">{escapeHTML(group.name)}</span>
                        {isActive && <span className="site-switcher-item-check">✓</span>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          )}
        </div>

        <SiteNav />

        <div className="header-center">
          <Link to="/proyectos" className="b2-header-search" aria-label="Buscar proyectos">
            <span aria-hidden="true">⌕</span>
            <span>Buscar proyectos…</span>
          </Link>
        </div>

        <div className="header-right">
          <button className={'theme-toggle lang-toggle' + (theme ? ' active' : '')} onClick={toggleLang} title={lang === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish'} aria-label="Cambiar idioma">
            {lang === 'es' ? 'ES' : 'EN'}
          </button>
          <button className={'theme-toggle' + (theme ? ' active' : '')} onClick={toggleTheme} title="Cambiar modo claro/oscuro" aria-label="Cambiar modo claro/oscuro" aria-pressed={!!theme}>
            <Icon name={theme ? 'sun' : 'moon'} size={16} />
          </button>
          <div className="user-bubble-wrap" id="user-bubble-wrap" ref={wrapRef}>
            <button className="user-bubble" onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }} aria-haspopup="menu" aria-expanded={menuOpen}>
              <UserBubbleAvatar user={user} />
              <span className="user-bubble-name">{user ? user.name.split(' ')[0] : ''}</span>
              <span className="user-bubble-rating">
                {user ? (avg > 0 ? `★ ${avg.toFixed(1)}` : '☆ 0.0') : '☆ 0.0'}
              </span>
            </button>
            {menuOpen && user && (
              <div className="user-bubble-menu" role="menu" style={{ display: 'block' }}>
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
  return (
    <header className="site-header logged-in-header">
      <div className="header-container header-compact">
        <div className="header-left">
          <Link to="/" className="header-logo-link" aria-label="ENTYCOLLAB — inicio">
            <img src="/img/logo-pg.png" alt="EntyTec" className="header-logo-img" />
          </Link>
        </div>

        <SiteNav />

        <div className="header-right">
          <Link to="/login" className="btn btn-ghost btn-sm">Iniciar sesión</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Crear cuenta</Link>
        </div>
      </div>
    </header>
  );
}
