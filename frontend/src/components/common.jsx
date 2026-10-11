import { useApp } from '../context/AppContext.jsx';
import { getCategoryMeta, getCategoryLabel, avatarColorClass, escapeHTML, profileLinks } from '../lib/helpers.js';

// ==========================================================================
// COMPONENTES UI PEQUEÑOS REUTILIZABLES
// ==========================================================================

// `layer` apila un modal sobre otro (detalle de proyecto encima del detalle de
// usuario, por ejemplo). Todos los overlays comparten el mismo z-index, así que
// sin esto el que se monte después en el DOM acaba tapando al anterior.
export function Modal({ open, onClose, size = '', title, subtitle, layer = 0, children }) {
  return (
    <div
      className="modal-overlay"
      style={{ display: open ? 'flex' : 'none', zIndex: 1000 + layer * 10 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal-card${size ? ' ' + size : ''}`}>
        {onClose && <button className="modal-close" onClick={onClose}>&times;</button>}
        {title && <h2 className="auth-title">{title}</h2>}
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon = '📦', title, sub }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      {title && <h3>{title}</h3>}
      {sub && <p>{sub}</p>}
    </div>
  );
}

export function statusClass(status) {
  return status === 'open' ? 'status-open'
    : status === 'in-progress' ? 'status-in-progress'
      : status === 'completed' ? 'status-completed' : 'status-closed';
}

export function StatusPill({ status, label }) {
  return <span className={`project-status ${statusClass(status)}`}>{label}</span>;
}

// Tres tamaños: la tarjeta de proyecto, el detalle y la miniatura del
// historial. El nombre de cada clase sale del modo, así no se duplica el CSS.
const BANNER_CLASS = {
  detail: 'detail-project-image',
  thumb: 'history-project-image'
};

export function ProjectBanner({ project, mode = 'card' }) {
  const { l10n, lang } = useApp();
  const cssClass = BANNER_CLASS[mode] || 'project-card-image';
  if (project.image) {
    return (
      <div className={cssClass}>
        <img src={project.image} alt={escapeHTML(l10n(project.title))} onError={e => { e.currentTarget.parentElement.style.display = 'none'; }} />
      </div>
    );
  }
  const meta = getCategoryMeta(project.category);
  const label = getCategoryLabel(lang, project.category);
  return (
    <div className={`${cssClass} ${cssClass}-default`} style={{ background: meta.gradient }}>
      <span className={`${cssClass}-icon`}>{meta.icon}</span>
      <span className={`${cssClass}-label`}>{label}</span>
    </div>
  );
}

export function Stars({ rating }) {
  if (rating <= 0) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span className="stars-inline">
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(empty)}{' '}
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>({rating.toFixed(1)})</span>
    </span>
  );
}

// Set de iconos SVG en línea (sin dependencias). Reutilizable en toda la app.
export function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'globe':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>;
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
    case 'users':
      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'box':
      return <svg {...common}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" /></svg>;
    case 'star':
      return <svg {...common}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
    case 'sparkles':
      return <svg {...common}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" /></svg>;
    case 'arrow-left':
      return <svg {...common}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;
    case 'compass':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5z" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    case 'home':
      return <svg {...common}><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
    case 'lock':
      return <svg {...common}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
    case 'mail':
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
    case 'user-plus':
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>;
    default:
      return null;
  }
}

// Avatar cuadrado de grupo (estilo organización de GitHub). Usa un color
// estable derivado del id del grupo, igual que avatarColorClass para usuarios.
export function GroupAvatar({ group, size = 'md', cls = '' }) {
  const letter = group?.name ? group.name.charAt(0).toUpperCase() : '#';
  return (
    <span className={`group-avatar group-avatar-${size} ${avatarColorClass(group || {})} ${cls}`.trim()}>
      {escapeHTML(letter)}
    </span>
  );
}

export function Avatar({ user, cls = 'person-avatar' }) {
  const { t } = useApp();
  if (!user) return <div className={cls}>&#63;</div>;
  if (user.avatar) {
    return (
      <div className={cls}>
        <img src={user.avatar} alt={t('photo.alt', { name: user.name })} />
      </div>
    );
  }
  return <div className={`${cls} ${avatarColorClass(user)}`}>{escapeHTML(user.name.charAt(0).toUpperCase())}</div>;
}

// Botones con los enlaces públicos del perfil (GitHub / portafolio).
export function ProfileLinks({ user }) {
  const { t } = useApp();
  const links = profileLinks(user);
  if (links.length === 0) return null;
  return (
    <div className="person-categories profile-links">
      {links.map(l => (
        <a
          key={l.key}
          className="person-cat-chip"
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {l.key === 'github' ? t('profile.linkGitHub') : t('profile.linkPortfolio')}
        </a>
      ))}
    </div>
  );
}

// Fila de "perfil de talento": título + etiquetas del usuario.
export function TalentRow({ label, values, centered = false }) {
  if (!values || values.length === 0) return null;
  return (
    <div className="person-chips-row">
      <span className="person-chips-label">{label}</span>
      <div className={'person-categories' + (centered ? ' profile-links' : '')}>
        {values.map(v => <span key={v} className="person-cat-chip">{escapeHTML(v)}</span>)}
      </div>
    </div>
  );
}

export function SkillTags({ skills, limit = 3 }) {
  const list = (skills || []).slice();
  if (list.length === 0) return null;
  const shown = list.slice(0, limit);
  const rest = list.slice(limit);
  return (
    <div className="project-card-tech">
      {shown.map(s => <span key={s} className="tech-tag">{escapeHTML(s)}</span>)}
      {rest.length > 0 && <span className="tech-tag skill-more-tag" title={rest.join(', ')}>+{rest.length}</span>}
    </div>
  );
}

// Selector de estrellas interactivo (min rating, rate, etc.)
export function StarInput({ value, onChange, title }) {
  return (
    <span className="star-input-icon" style={{ cursor: 'pointer' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span
          key={s}
          className={s <= value ? 'active' : ''}
          onClick={() => onChange && onChange(s)}
          title={title}
          style={{ cursor: 'pointer' }}
        >
          ★
        </span>
      ))}
    </span>
  );
}