import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Icon, GroupAvatar } from './common.jsx';
import { getUserAvgRating, avatarColorClass, escapeHTML } from '../lib/helpers.js';
import { useLeaveTransition } from '../lib/useLeaveTransition.js';

// El item activo se resuelve UNA SOLA VEZ y se compara por identidad del
// item, no por prefijo item a item. Comprobar cada item por separado
// activaba a la vez '/proyectos' y '/proyectos/mis-proyectos', porque la
// segunda ruta empieza por la primera.
const NAV = [
  { to: '/dashboard', label: 'Mi panel', icon: 'home', match: ['/dashboard'] },
  { to: '/proyectos/mis-proyectos', label: 'Mis proyectos', icon: 'folder', badge: true, match: ['/proyectos/mis-proyectos'] },
  { to: '/proyectos', label: 'Explorar proyectos', icon: 'compass', match: ['/proyectos'] },
  { to: '/personas', label: 'Personas', icon: 'users', match: ['/personas'] },
  { to: '/grupos', label: 'Grupos', icon: 'box', match: ['/grupos'] },
];

// Gana la coincidencia mas especifica. Devuelve un unico item (o null).
function resolveActiveNav(pathname) {
  let active = null;
  let bestLength = -1;
  for (const item of NAV) {
    for (const prefix of item.match) {
      const hit = pathname === prefix || pathname.startsWith(prefix + '/');
      if (hit && prefix.length > bestLength) {
        bestLength = prefix.length;
        active = item;
      }
    }
  }
  return active;
}

const CRUMB = [
  [/^\/dashboard/, 'Mi panel'],
  [/^\/proyectos\/mis-proyectos/, 'Mis proyectos'],
  [/^\/proyectos/, 'Explorar proyectos'],
  [/^\/personas/, 'Personas'],
  [/^\/grupos/, 'Grupos'],
  [/^\/perfil/, 'Mi perfil'],
  [/^\/ajustes/, 'Ajustes'],
];

export default function WorkspaceShell({ children }) {
  const { user, projects, applications, groups, activeGroup, ratings, theme, lang, menuOpen, setMenuOpen, t, toggleTheme, toggleLang, logout, selectGroup } = useApp();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const [wsOpen, setWsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('entycollab_sidebar') === 'collapsed'
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('entycollab_sidebar', prev ? 'expanded' : 'collapsed');
      return !prev;
    });
  }, []);
  const { leaving: wsLeaving, close: closeWsMenu } = useLeaveTransition(wsOpen, () => setWsOpen(false), 120);

  useEffect(() => {
    function onDocClick(e) {
      if (wsRef.current && !wsRef.current.contains(e.target)) closeWsMenu();
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [closeWsMenu]);

  useEffect(() => { setMenuOpen(false); }, [pathname, setMenuOpen]);

  // Escape cierra el panel lateral en movil; antes solo se cerraba navegando.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = event => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen, setMenuOpen]);

  if (!user) return children;

  const myProjects = projects.filter(project => project.ownerId === user.id || project.creatorId === user.id);
  const myApps = applications.filter(app => app.userId === user.id);
  const avg = getUserAvgRating(user.id, ratings);
  const crumb = (CRUMB.find(([re]) => re.test(pathname)) || [, 'Mi panel'])[1];
  const activeItem = resolveActiveNav(pathname);

  // Al cerrar sesión se vuelve a la portada de la plataforma, no al formulario
  // de acceso: quien sale puede querer seguir explorando como visitante.
  const doLogout = () => { logout(); showToast(t('toast.logout'), 'info'); navigate('/'); };

  return (
    <div className={`ws-shell${menuOpen ? ' is-open' : ''}${sidebarCollapsed ? ' is-collapsed' : ''}`}>
      {menuOpen && <button type="button" className="ws-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <aside className="ws-sidebar" ref={wsRef}>
        <div className="ws-brand">
          <Link to="/dashboard" className="ws-brand-link" aria-label="ENTYTEC COLLAB, inicio">
            <img className="ws-brand-logo" src="/img/collab-logo.png" alt="" />
            <img className="ws-brand-mark" src="/img/collab-mark.svg" alt="" />
            <small className="ws-brand-tag">GAMEDEV COMMUNITY</small>
          </Link>
          <button
            type="button"
            className="ws-sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            title={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            aria-expanded={!sidebarCollapsed}
            aria-controls="ws-sidebar-nav"
          >
            <Icon name={sidebarCollapsed ? 'arrow-right' : 'arrow-left'} size={15} />
          </button>
        </div>

        <div className="ws-workspace">
          <button type="button" className="ws-workspace-btn" aria-haspopup="menu" aria-expanded={wsOpen} onClick={e => { e.stopPropagation(); setWsOpen(o => !o); }}>
            {activeGroup ? <GroupAvatar group={activeGroup} size="sm" /> : <Icon name="globe" size={16} />}
            <span className="ws-workspace-label ws-side-label">{escapeHTML(activeGroup?.name || t('dash.global'))}</span>
            <span className="ws-workspace-caret">▾</span>
          </button>
          {wsOpen && (
            <div className={`ws-workspace-menu${wsLeaving ? ' is-leaving' : ''}`} role="menu">
              <button type="button" role="menuitem" className={!activeGroup ? 'active' : ''} onClick={() => { selectGroup(null); closeWsMenu(); }}>
                <Icon name="globe" size={15} /><span>{t('dash.global')}</span>{!activeGroup && <span className="ws-check"><Icon name="check" size={13} /></span>}
              </button>
              <div className="ws-menu-sep" />
              {groups.map(group => (
                <button key={group.id} type="button" role="menuitem" className={activeGroup?.id === group.id ? 'active' : ''} onClick={() => { selectGroup(group.id); closeWsMenu(); navigate(`/grupos/${group.id}`); }}>
                  <GroupAvatar group={group} size="sm" /><span className="ws-group-label">{escapeHTML(group.name)}</span>
                  {activeGroup?.id === group.id && <span className="ws-check"><Icon name="check" size={13} /></span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="ws-nav" id="ws-sidebar-nav" aria-label={t('nav.main') || 'Principal'}>
          <p className="ws-nav-title ws-side-label">WORKSPACE</p>
          {NAV.map(item => (
            /* Se usa Link y no NavLink: NavLink anade su propia clase "active"
               (match por prefijo) y su propio aria-current, asi que
               "/proyectos" y "/proyectos/mis-proyectos" quedaban los dos
               marcados a la vez. Aqui manda solo nuestra resolucion. */
            <Link
              key={item.to}
              to={item.to}
              className={`ws-nav-link${item === activeItem ? ' active' : ''}`}
              aria-current={item === activeItem ? 'page' : undefined}
            >
              <Icon name={item.icon} size={17} />
              <span className="ws-nav-label">{item.label}</span>
              {item.badge && <span className="ws-badge">{myProjects.length}</span>}
            </Link>
          ))}
        </nav>

        <div className="ws-groups">
          <div className="ws-groups-head">
            <p className="ws-side-label">TUS GRUPOS</p>
            <button type="button" className="ws-icon-btn" aria-label="Crear grupo" title="Crear grupo" onClick={() => navigate('/grupos?new=1')}>
              <Icon name="plus" size={14} />
            </button>
          </div>
          {groups.slice(0, 3).map(group => (
            <Link key={group.id} to={`/grupos/${group.id}`} className="ws-group">
              <GroupAvatar group={group} size="sm" />
              <span className="ws-group-label">{escapeHTML(group.name)}</span>
            </Link>
          ))}
        </div>

        <div className="ws-invite">
          <span className="ws-invite-icon" aria-hidden="true"><Icon name="gamepad" size={16} /></span>
          <p className="ws-invite-text"><b>Las buenas ideas se construyen en equipo.</b>Encuentra tu próxima aventura.</p>
          <Link to="/" className="ws-invite-link">Conoce a la comunidad <span aria-hidden="true">↗</span></Link>
        </div>

        <div className="ws-side-foot">
          <Link to="/ajustes" className="ws-foot-link"><Icon name="settings" size={16} /><span className="ws-foot-label">Ajustes</span></Link>
          <button type="button" className="ws-foot-link ws-danger" onClick={doLogout}><Icon name="logout" size={16} /><span className="ws-foot-label">{t('menu.logout')}</span></button>
          <Link to="/perfil" className="ws-foot-profile">
            <span className={`ws-foot-avatar ${avatarColorClass(user)}`}>{escapeHTML(user.name.charAt(0).toUpperCase())}</span>
            <span className="ws-foot-name">{escapeHTML(user.name.split(' ')[0])}</span>
          </Link>
        </div>
      </aside>

      <div className="ws-main">
        <header className="ws-topbar">
          <div className="ws-crumbs">
            <button type="button" className="ws-menu-btn" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><Icon name={menuOpen ? 'x' : 'menu'} size={18} /></button>
            <span>Workspace</span>
            <span aria-hidden="true">›</span>
            <b>{crumb}</b>
          </div>
          <div className="ws-top-actions">
            <span className="ws-community"><i /> Comunidad gamedev</span>
            <button type="button" className="ws-theme" onClick={toggleTheme} title={lang === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish'} aria-label="Cambiar idioma">{lang === 'es' ? 'ES' : 'EN'}</button>
            <button type="button" className="ws-theme" onClick={toggleTheme} title="Cambiar modo claro/oscuro" aria-label="Cambiar modo claro/oscuro" aria-pressed={!!theme}>
              <Icon name={theme ? 'sun' : 'moon'} size={16} />
            </button>
            <button type="button" className="ws-bell" aria-label="Notificaciones" title="Notificaciones" onClick={() => showToast(t('toast.notificationsSoon') || 'Notificaciones (demo)', 'info')}>
              <Icon name="bell" size={17} />
            </button>
            <Link to="/perfil" className="ws-profile">
              <span className={`ws-profile-avatar ${avatarColorClass(user)}`}>{escapeHTML(user.name.charAt(0).toUpperCase())}</span>
              <span className="ws-profile-name">{escapeHTML(user.name.split(' ')[0])}</span>
              <span className="ws-profile-rating"><Icon name="star" size={11} />{avg > 0 ? avg.toFixed(1) : '0.0'}</span>
            </Link>
          </div>
        </header>
        <main className="ws-content">{children}
          <footer className="ws-foot">
            <span>© 2026 EntyTec</span>
            <span className="ws-foot-note">Vista demo · datos ficticios</span>
            <span className="ws-foot-links">
              <a href="/legal/privacidad">Privacidad</a>
              <a href="/legal/terminos">Términos</a>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
