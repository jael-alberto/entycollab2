import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { ProjectBanner, StatusPill, Stars, SkillTags } from './common.jsx';
import { getUserAvgRating, escapeHTML } from '../lib/helpers.js';

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
        <p className="project-card-owner">
          {t('card.by')} {owner ? escapeHTML(owner.name) : t('card.unknown')}
          {avgRating > 0 && <> · <Stars rating={avgRating} /></>}
        </p>
        <p className="project-card-description project-card-description-clamp2">
          {l10n(project.description) ? escapeHTML(l10n(project.description)) : ''}
        </p>
        <SkillTags skills={project.tech} limit={4} />
        <dl className="project-card-meta">
          <div className="project-card-meta-item">
            <dt>{t('card.cupos')}</dt>
            <dd className={slotsFull ? 'is-full' : ''}>
              {accepted}/{project.slots}{slotsFull ? ` · ${t('card.slotsFull')}` : ''}
            </dd>
          </div>
          <div className="project-card-meta-item">
            <dt>{t('card.deadline')}</dt>
            <dd>{formatDeadline(lang, project.deadline)}</dd>
          </div>
          <div className="project-card-meta-item">
            <dt>{t('card.ratingReq')}</dt>
            <dd><span className="min-rating-stars">{'★'.repeat(project.minRating || 1)}</span></dd>
          </div>
        </dl>
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
