import { Children, cloneElement, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { getCategoryMeta, getCategoryLabel, avatarColorClass, escapeHTML, profileLinks } from '../lib/helpers.js';
import { useLeaveTransition } from '../lib/useLeaveTransition.js';
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
export function Modal({ open, onClose, size = '', title, subtitle, layer = 0, children, label, footer }) {
  const { t } = useApp();
  const isMouseDownOnOverlayRef = useRef(false);
  const isMouseDownOnScrollbarRef = useRef(false);
  const cardRef = useRef(null);
  const prevFocusRef = useRef(null);

  // La salida se anima: el nodo sigue montado mientras corre y solo entonces
  // se avisa al padre para que lo desmonte.
  const { leaving, close } = useLeaveTransition(open, onClose, 180);

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
        close();
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
  }, [open, close]);

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
      if (onClose) close();
    }

    isMouseDownOnOverlayRef.current = false;
  };

  if (!open && !leaving) return null;

  return (
    <div
      className={`modal-overlay${leaving ? ' is-leaving' : ''}`}
      style={{ display: 'flex', zIndex: 1000 + layer * 10 }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        ref={cardRef}
        className={`modal-card${size ? ' ' + size : ''}${leaving ? ' is-leaving' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label || title || 'Diálogo'}
        tabIndex={-1}
      >
        {onClose && <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}><span aria-hidden="true">&times;</span></button>}
        {title && <h2 className="auth-title">{title}</h2>}
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
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
    /* El color de categoria se pasa como variable para teñir la superficie en
       lugar de pintar un bloque saturado (era el tell mas visible del grid). */
    <div className={`${cssClass} ${cssClass}-default`} style={{ '--cat': meta.color }}>
      <span className={`${cssClass}-icon`}><Icon name={meta.icon || 'gamepad'} size={36} /></span>
      <span className={`${cssClass}-label`}>{label}</span>
    </div>
  );
}

export function Stars({ rating, size = 13, showValue = true }) {
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
import {
  IconAlertTriangle, IconArrowLeft, IconArrowRight, IconArrowUpRight, IconBallFootball, IconBox,
  IconCheck, IconChess, IconCode, IconCompass, IconCrosshair, IconDeviceGamepad2, IconDeviceMobile,
  IconFolder, IconGlobe, IconHome, IconInbox, IconKarate, IconLeaf, IconLock, IconLogout, IconMail,
  IconMoon, IconBell, IconMenu2, IconChevronDown, IconChevronUp, IconPlant2,
  IconMusic, IconPalette, IconPencil, IconPhoto, IconPlus, IconPuzzle, IconSearch, IconSend,
  IconSettings, IconSparkles, IconStairsUp, IconStar, IconSteeringWheel, IconSun, IconSword,
  IconTag, IconUserPlus, IconUsers, IconX
} from '@tabler/icons-react';

const TABLER_ICONS = {
  globe: IconGlobe, search: IconSearch, users: IconUsers, box: IconBox, star: IconStar,
  sparkles: IconSparkles, 'arrow-left': IconArrowLeft, compass: IconCompass, plus: IconPlus,
  settings: IconSettings, home: IconHome, lock: IconLock, mail: IconMail,
  'user-plus': IconUserPlus, folder: IconFolder, inbox: IconInbox, check: IconCheck,
  alert: IconAlertTriangle, sun: IconSun, moon: IconMoon, gamepad: IconDeviceGamepad2,
  image: IconPhoto, logout: IconLogout, x: IconX, send: IconSend, code: IconCode,
  smartphone: IconDeviceMobile, tag: IconTag, 'arrow-right': IconArrowRight,
  'arrow-up-right': IconArrowUpRight, palette: IconPalette, music: IconMusic,
  'chevron-down': IconChevronDown, 'chevron-up': IconChevronUp,
  pencil: IconPencil, leaf: IconLeaf, menu: IconMenu2, bell: IconBell,
  crosshair: IconCrosshair, sword: IconSword, chess: IconChess, ball: IconBallFootball,
  puzzle: IconPuzzle, 'steering-wheel': IconSteeringWheel, karate: IconKarate,
  plant: IconPlant2, stairs: IconStairsUp
};

export function Icon({ name, size = 18, label, cls }) {
  const Cmp = TABLER_ICONS[name];
  if (!Cmp) return null;
  const common = { size, strokeWidth: 2, ...(cls ? { className: cls } : {}), ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }) };
  return <Cmp {...common} />;
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
export function TalentRow({ label, values, centered = false, limit }) {
  if (!values || values.length === 0) return null;
  const shown = limit ? values.slice(0, limit) : values;
  const rest = values.length - shown.length;
  return (
    <div className="person-chips-row">
      <span className="person-chips-label">{label}</span>
      <div className={'person-categories' + (centered ? ' profile-links' : '')}>
        {shown.map(v => <span key={v} className="person-cat-chip">{escapeHTML(v)}</span>)}
        {rest > 0 && <span className="person-cat-chip">+{rest}</span>}
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
          <Icon name="star" size={13} />
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
