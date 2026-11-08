import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { ProjectBanner, StatusPill, Stars, SkillTags, Icon } from './common.jsx';
import { getUserAvgRating, escapeHTML, avatarColorClass } from '../lib/helpers.js';

// Etiqueta de estado con el vocabulario del producto:
// Reclutando (open) · En desarrollo (in-progress) · Finalizado (completed).
function statusLabelKey(status) {
  if (status === 'open') return 'status.recruiting';
  if (status === 'in-progress') return 'status.developing';
  if (status === 'completed') return 'status.finished';
  return 'status.closed';
}

export function formatDeadline(lang, iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return iso;
  }
}

export default function ProjectCard({ project, currentUser }) {
  const { users, applications, ratings, lang, t, l10n } = useApp();
  const { openDetail, openApply } = useModals();

  const owner = users.find(u => u.id === project.ownerId);
  const apps = applications.filter(a => a.projectId === project.id);
  const accepted = apps.filter(a => a.status === 'accepted').length;
  const slotsFull = accepted >= project.slots;
  const hasApplied = apps.find(a => a.userId === currentUser.id);
  const isOwner = project.ownerId === currentUser.id;
  const avgRating = owner ? getUserAvgRating(owner.id, ratings) : 0;

  // La postulación pide pitch (140-500) en el modal dedicado (Agente E).
  const onApply = () => openApply(project.id);

  // Lógica de CTA conservada: postularse / pendiente / gestionar / ver.
  let actions;
  if (isOwner) {
    const label = project.status === 'open' || project.status === 'completed' ? t('card.viewDetailBtn') : t('card.manageBtn');
    actions = <button className="btn btn-ghost btn-sm" onClick={() => openDetail(project.id)}>{label}</button>;
  } else if (hasApplied) {
    if (hasApplied.status === 'accepted') {
      actions = <button className="btn btn-ghost btn-sm" onClick={() => openDetail(project.id)}>{t('card.viewProject')}</button>;
    } else if (hasApplied.status === 'pending') {
      actions = <span className="project-status status-in-progress" style={{ fontSize: '0.75rem' }}>{t('card.pending')}</span>;
    } else {
      actions = <span className="project-status status-closed" style={{ fontSize: '0.75rem' }}>{t('card.rejected')}</span>;
    }
  } else if (project.status === 'open' && !slotsFull) {
    actions = (
      <>
        <button className="btn btn-primary btn-sm" onClick={onApply}>{t('card.postulate')}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => openDetail(project.id)}>{t('card.view')}</button>
      </>
    );
  } else {
    actions = <button className="btn btn-ghost btn-sm" onClick={() => openDetail(project.id)}>{t('card.viewDetailBtn')}</button>;
  }

  return (
    <article className="project-card project-card-v2">
      <button
        type="button"
        className="project-card-cover"
        onClick={() => openDetail(project.id)}
        aria-label={escapeHTML(l10n(project.title))}
        tabIndex={0}
      >
        <ProjectBanner project={project} />
      </button>
      <div className="project-card-body">
        <div className="project-card-header">
          <h3 className="project-card-title">
            <button type="button" className="project-card-title-btn" onClick={() => openDetail(project.id)}>
              {escapeHTML(l10n(project.title))}
            </button>
          </h3>
          <StatusPill status={project.status} label={t(statusLabelKey(project.status))} />
        </div>
        <div className="project-card-owner">
          {owner && (
            <span className={`project-card-owner-avatar ${avatarColorClass(owner)}`} aria-hidden="true">
              {escapeHTML(owner.name.charAt(0).toUpperCase())}
            </span>
          )}
          <span className="project-card-owner-name">
            {owner ? escapeHTML(owner.name) : t('card.unknown')}
          </span>
          {avgRating > 0 && <Stars rating={avgRating} showValue={false} size={13} />}
        </div>
        <p className="project-card-description project-card-description-clamp2">
          {l10n(project.description) ? escapeHTML(l10n(project.description)) : ''}
        </p>
        <SkillTags skills={project.tech} limit={3} />
        <div className="project-card-chips">
          <span
            className={`meta-chip${slotsFull ? ' is-full' : ''}`}
            title={`${t('card.cupos')}: ${accepted}/${project.slots}`}
          >
            <Icon name="users" size={13} />
            {accepted}/{project.slots}
            {slotsFull ? ` · ${t('card.slotsFull')}` : ''}
          </span>
          <span className="meta-chip" title={`${t('card.deadline')}: ${formatDeadline(lang, project.deadline)}`}>
            <Icon name="tag" size={13} />
            {formatDeadline(lang, project.deadline)}
          </span>
          <span className="meta-chip" title={`${t('card.ratingReq')}: ${project.minRating || 1}`}>
            <Icon name="star" size={13} />
            {project.minRating || 1}+
          </span>
        </div>
        <div className="project-card-footer project-card-footer-cta">
          <div className="project-actions">{actions}</div>
        </div>
      </div>
    </article>
  );
}

// Esqueleto de carga con la misma silueta de la tarjeta (portada 16/9 + líneas).
export function ProjectCardSkeleton() {
  return (
    <article className="project-card project-card-v2 project-card-skeleton" aria-hidden="true">
      <div className="skeleton skeleton-cover" />
      <div className="project-card-body">
        <div className="skeleton skeleton-line skeleton-title" />
        <div className="skeleton skeleton-line skeleton-short" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton-tags">
          <span className="skeleton skeleton-tag" />
          <span className="skeleton skeleton-tag" />
          <span className="skeleton skeleton-tag" />
        </div>
        <div className="skeleton-meta">
          <span className="skeleton skeleton-chip" />
          <span className="skeleton skeleton-chip" />
          <span className="skeleton skeleton-chip" />
        </div>
      </div>
    </article>
  );
}
