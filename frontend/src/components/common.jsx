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