import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { ProjectBanner, StatusPill, Stars } from './common.jsx';
import { getUserAvgRating, getStatusLabel, escapeHTML } from '../lib/helpers.js';

export default function ProjectCard({ project, currentUser }) {
  const { users, applications, ratings, lang, t, l10n, applyToProject } = useApp();
  const { showToast } = useToast();
  const { openDetail } = useModals();

  const owner = users.find(u => u.id === project.ownerId);
  const apps = applications.filter(a => a.projectId === project.id);
  const accepted = apps.filter(a => a.status === 'accepted').length;
  const slotsFull = accepted >= project.slots;
  const hasApplied = apps.find(a => a.userId === currentUser.id);
  const isOwner = project.ownerId === currentUser.id;
  const avgRating = owner ? getUserAvgRating(owner.id, ratings) : 0;

  const onApply = () => {
    const res = applyToProject(project.id);
    if (res === 'alreadyApplied') {
      showToast(t('toast.alreadyApplied'), 'error');
    } else if (res === 'minRating') {
      const userRating = getUserAvgRating(currentUser.id, ratings);
      showToast(t('toast.minRating', { stars: project.minRating, user: userRating.toFixed(1) }), 'error');
    } else if (res === 'ok') {
      showToast(t('toast.applicationSent'), 'success');
    }
  };

  let actions;
  if (isOwner) {
    const label = project.status === 'open' || project.status === 'completed' ? t('card.viewDetail') : t('card.manage');
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
        <button className="btn btn-primary btn-sm" onClick={onApply}>{t('card.apply')}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => openDetail(project.id)}>{t('card.view')}</button>
      </>
    );
  } else {
    actions = <button className="btn btn-ghost btn-sm" onClick={() => openDetail(project.id)}>{t('card.viewDetail')}</button>;
  }

  return (
    <article className="project-card">
      <ProjectBanner project={project} />
      <div className="project-card-header">
        <h3 className="project-card-title">{escapeHTML(l10n(project.title))}</h3>
        <StatusPill status={project.status} label={getStatusLabel(lang, project.status)} />
      </div>
      <p className="project-card-owner">
        {t('card.by')} {owner ? escapeHTML(owner.name) : t('card.unknown')}
        {avgRating > 0 && <> · <Stars rating={avgRating} /></>}
      </p>
      <p className="project-card-description">{l10n(project.description) ? escapeHTML(l10n(project.description)) : ''}</p>
      <div className="project-card-tech">
        {project.tech.map(tag => <span key={tag} className="tech-tag">{escapeHTML(tag)}</span>)}
      </div>
      <div className="project-min-rating">
        <span className="min-rating-label">{t('card.minRating')}</span>
        <span className="min-rating-stars">{'★'.repeat(project.minRating || 1)}</span>
      </div>
      <div className="project-card-footer">
        <span className={'project-slots' + (slotsFull ? ' slots-full' : '')}>
          <strong>{accepted}/{project.slots}</strong> {t('card.slots')}
        </span>
        <div className="project-actions">{actions}</div>
      </div>
    </article>
  );
}