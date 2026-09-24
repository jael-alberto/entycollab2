import { useApp } from '../context/AppContext.jsx';
import { getCategoryMeta, getCategoryLabel, avatarColorClass, escapeHTML } from '../lib/helpers.js';

// ==========================================================================
// COMPONENTES UI PEQUEÑOS REUTILIZABLES
// ==========================================================================

export function Modal({ open, onClose, size = '', title, subtitle, children }) {
  return (
    <div
      className="modal-overlay"
      style={{ display: open ? 'flex' : 'none' }}
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

export function ProjectBanner({ project, mode = 'card' }) {
  const { l10n, lang } = useApp();
  const cssClass = mode === 'detail' ? 'detail-project-image' : 'project-card-image';
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
      <span className={mode === 'detail' ? 'detail-project-image-icon' : 'project-card-image-icon'}>{meta.icon}</span>
      <span className={mode === 'detail' ? 'detail-project-image-label' : 'project-card-image-label'}>{label}</span>
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