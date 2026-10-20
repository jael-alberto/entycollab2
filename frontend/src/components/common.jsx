import { Children, cloneElement, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { getCategoryMeta, getCategoryLabel, avatarColorClass, escapeHTML, profileLinks } from '../lib/helpers.js';
import PeekRating from './PeekRating.jsx';

// ==========================================================================
// COMPONENTES UI PEQUEÑOS REUTILIZABLES
// ==========================================================================

let activeModalCount = 0;

/**
 * Detecta si el puntero se encuentra sobre la barra de desplazamiento nativa (scrollbar)
 * del elemento contenedor al interactuar con el ratón.
 */
export function isClickOnScrollbar(e) {
  const el = e.currentTarget;
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const isRtl = typeof getComputedStyle === 'function' && getComputedStyle(el).direction === 'rtl';

  // Barra de desplazamiento vertical (derecha en LTR, izquierda en RTL)
  if (el.offsetWidth > el.clientWidth) {
    if (!isRtl && e.clientX >= rect.left + el.clientLeft + el.clientWidth) {
      return true;
    }
    if (isRtl && e.clientX <= rect.left + el.clientLeft + (el.offsetWidth - el.clientWidth)) {
      return true;
    }
  }

  // Barra de desplazamiento horizontal (al fondo)
  if (el.offsetHeight > el.clientHeight) {
    if (e.clientY >= rect.top + el.clientTop + el.clientHeight) {
      return true;
    }
  }

  return false;
}

// `layer` apila un modal sobre otro (detalle de proyecto encima del detalle de
// usuario, por ejemplo). Todos los overlays comparten el mismo z-index, así que
// sin esto el que se monte después en el DOM acaba tapando al anterior.
export function Modal({ open, onClose, size = '', title, subtitle, layer = 0, children, label }) {
  const { t } = useApp();
  const isMouseDownOnOverlayRef = useRef(false);
  const isMouseDownOnScrollbarRef = useRef(false);
  const cardRef = useRef(null);
  const prevFocusRef = useRef(null);

  // Bloquea el scroll del fondo (body) mientras haya al menos un modal abierto
  useEffect(() => {
    if (!open) return;
    activeModalCount++;
    if (activeModalCount === 1) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [open]);

  // Cerrar al pulsar la tecla Escape + trampa de foco (Tab cíclico dentro del modal)
  useEffect(() => {
    if (!open || !onClose) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && cardRef.current) {
        const nodes = cardRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(nodes).filter(el => el.offsetParent !== null);
        if (list.length === 0) {
          e.preventDefault();
          return;
        }
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Guarda el foco previo, mueve el foco al abrir y lo restaura al cerrar
  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement;
    const timer = setTimeout(() => {
      const card = cardRef.current;
      if (!card) return;
      const firstFocusable = card.querySelector(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'
      );
      (firstFocusable || card).focus();
    }, 0);
    return () => {
      clearTimeout(timer);
      if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') {
        prevFocusRef.current.focus();
      }
    };
  }, [open ]);

  const handleMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      if (isClickOnScrollbar(e)) {
        isMouseDownOnScrollbarRef.current = true;
        isMouseDownOnOverlayRef.current = false;
      } else {
        isMouseDownOnScrollbarRef.current = false;
        isMouseDownOnOverlayRef.current = true;
      }
    } else {
      isMouseDownOnScrollbarRef.current = false;
      isMouseDownOnOverlayRef.current = false;
    }
  };

  const handleClick = (e) => {
    // Si la interacción o arrastre comenzó en la barra de scroll, no cerramos
    if (isMouseDownOnScrollbarRef.current) {
      isMouseDownOnScrollbarRef.current = false;
      isMouseDownOnOverlayRef.current = false;
      return;
    }

    // Solo cerramos si el mousedown inició en el fondo exterior (backdrop)
    // y el clic terminó también en el fondo exterior, fuera de la barra de scroll
    if (
      isMouseDownOnOverlayRef.current &&
      e.target === e.currentTarget &&
      !isClickOnScrollbar(e)
    ) {
      if (onClose) onClose();
    }

    isMouseDownOnOverlayRef.current = false;
  };

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex', zIndex: 1000 + layer * 10 }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        ref={cardRef}
        className={`modal-card${size ? ' ' + size : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label || title || 'Diálogo'}
        tabIndex={-1}
      >
        {onClose && <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}><span aria-hidden="true">&times;</span></button>}
        {title && <h2 className="auth-title">{title}</h2>}
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon = 'folder', title, sub, action, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon" aria-hidden="true"><Icon name={icon} size={28} /></div>}
      {title && <h3>{title}</h3>}
      {sub && <p>{sub}</p>}
      {action && <div className="empty-state-action">{action}</div>}
      {!action && actionLabel && onAction && (
        <div className="empty-state-action">
          <button type="button" className="btn btn-primary btn-sm" onClick={onAction}>{actionLabel}</button>
        </div>
      )}
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
    <div className={`${cssClass} ${cssClass}-default`} style={{ background: meta.color }}>
      <span className={`${cssClass}-icon`}><Icon name={meta.icon || 'gamepad'} size={36} /></span>
      <span className={`${cssClass}-label`}>{label}</span>
    </div>
  );
}

export function Stars({ rating }) {
  if (rating <= 0) return null;
  const rounded = Math.round(rating);
  return (
    <span className="stars-inline">
      <PeekRating value={rounded} readOnly size={18} lift={5} magnify={1.1} riseDuration={280} />
      {' '}
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>({rating.toFixed(1)})</span>
    </span>
  );
}

// Set de iconos SVG en línea (sin dependencias). Reutilizable en toda la app.
// Sin `label` el icono es decorativo (aria-hidden); con `label` se anuncia.
export function Icon({ name, size = 18, label }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }) };
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
    case 'folder':
      return <svg {...common}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
    case 'inbox':
      return <svg {...common}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;
    case 'check':
      return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>;
    case 'alert':
      return <svg {...common}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" /><path d="M12 9v4M12 17h.01" /></svg>;
    case 'sun':
      return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>;
    case 'moon':
      return <svg {...common}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" /></svg>;
    case 'gamepad':
      return <svg {...common}><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01" /><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.54-.6-6.58-.68-7.26A4 4 0 0 0 17.32 5z" /></svg>;
    case 'image':
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.08-3.08a2 2 0 0 0-2.83 0L6 21" /></svg>;
    case 'logout':
      return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>;
    case 'x':
      return <svg {...common}><path d="M18 6 6 18M6 6l12 12" /></svg>;
    case 'send':
      return <svg {...common}><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>;
    case 'code':
      return <svg {...common}><path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /></svg>;
    case 'smartphone':
      return <svg {...common}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M12 18h.01" /></svg>;
    case 'tag':
      return <svg {...common}><path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42z" /><circle cx="7" cy="7" r="1.5" /></svg>;
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

// Selector de estrellas accesible: radiogroup real con teclado
// (flechas / 1-5 / Enter-Espacio). Misma API que antes: { value, onChange, title }.
export function StarInput({ value, onChange, title, label }) {
  const { t } = useApp();
  const current = Number(value) || 0;
  const groupLabel = label || title || t('createProject.minRating');
  const starRefs = useRef([]);
  const focusStar = (s) => {
    const el = starRefs.current[s];
    if (el && typeof el.focus === 'function') el.focus();
  };
  const starAriaLabel = (s) => (s === 1 ? t('star.one') : t('star.many', { n: s }));
  const handleKeyDown = (e) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, (current || 0) + 1) || 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, (current || 1) - 1);
    else if (e.key >= '1' && e.key <= '5') next = Number(e.key);
    else if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.dataset && e.target.dataset.star) {
      next = Number(e.target.dataset.star);
    }
    if (next == null) return;
    e.preventDefault();
    if (onChange) onChange(next);
    focusStar(next);
  };
  return (
    <span className="star-input-icon star-group" role="radiogroup" aria-label={groupLabel} onKeyDown={handleKeyDown}>
      {[1, 2, 3, 4, 5].map(s => (
        <span
          key={s}
          ref={el => { starRefs.current[s] = el; }}
          data-star={s}
          role="radio"
          aria-checked={s === current}
          aria-label={starAriaLabel(s)}
          title={title || starAriaLabel(s)}
          tabIndex={s === (current || 1) ? 0 : -1}
          className={s <= current ? 'active' : ''}
          onClick={() => onChange && onChange(s)}
        >
          <span aria-hidden="true">★</span>
        </span>
      ))}
    </span>
  );
}

// ==========================================================================
// AGENTE E — Field, Spinner, Skeleton, ErrorState, SkipLink
// ==========================================================================

/** Enlace "saltar al contenido" (visible solo con teclado). */
export function SkipLink({ targetId = 'main-content', label }) {
  const { t } = useApp();
  return <a className="skip-link" href={`#${targetId}`}>{label || t('a11y.skipToContent')}</a>;
}

/**
 * Campo de formulario accesible: <label> real + hint + error con
 * aria-describedby y aria-invalid. Clona el control hijo para inyectarlos.
 */
export function Field({ label, htmlFor, hint, error, required, children }) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const control = Children.map(children, child => {
    if (!child || typeof child !== 'object' || !('type' in child)) return child;
    return cloneElement(child, {
      id: child.props.id || htmlFor,
      'aria-describedby': describedBy,
      'aria-invalid': error ? true : undefined,
    });
  });
  return (
    <div className={'form-group field' + (error ? ' field-invalid' : '')}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {hint && <p className="form-hint field-hint" id={hintId}>{hint}</p>}
      {control}
      {error && <p className="field-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

/** Indicador de carga en línea (el botón padre lleva aria-busy + disabled). */
export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

/** Marcador de posición mientras cargan datos (respeta reduced-motion). */
export function Skeleton({ lines = 3, label }) {
  const { t } = useApp();
  const text = label || t('common.loading');
  return (
    <div className="skeleton-block" role="status" aria-label={text}>
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="skeleton skeleton-line skeleton-block-line" aria-hidden="true" />
      ))}
      <span className="sr-only">{text}</span>
    </div>
  );
}

/** Error de carga de datos con acción de reintento. */
export function ErrorState({ title, sub, onRetry, retryLabel }) {
  const { t } = useApp();
  return (
    <div className="error-state" role="alert">
      <div className="error-state-icon" aria-hidden="true"><Icon name="alert" size={28} /></div>
      <h3>{title || t('common.loadError')}</h3>
      {sub && <p>{sub}</p>}
      {onRetry && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
          {retryLabel || t('common.retry')}
        </button>
      )}
    </div>
  );
}
