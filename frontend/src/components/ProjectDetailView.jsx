import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { StatusPill, ProjectBanner, Stars, SkillTags } from './common.jsx';
import { formatDeadline } from './ProjectCard.jsx';
import {
  getUserAvgRating, getCategoryLabel, escapeHTML
} from '../lib/helpers.js';

const APP_ORDER = { pending: 0, accepted: 1, rejected: 2 };

function statusLabelKey(status) {
  if (status === 'open') return 'status.recruiting';
  if (status === 'in-progress') return 'status.developing';
  if (status === 'completed') return 'status.finished';
  return 'status.closed';
}

// Progreso de calificación calculado localmente: aceptados ya calificados
// en este proyecto frente al total de aceptados.
function ratingProgress(projectId, accepted, ratings) {
  const ratedIds = new Set(
    ratings.filter(r => r.projectId === projectId).map(r => r.ratedUserId)
  );
  const rated = accepted.filter(a => ratedIds.has(a.userId)).length;
  return { rated, total: accepted.length, pending: accepted.length - rated };
}

// ==========================================================================
// Contenido de un proyecto: banner, datos, acciones del dueño, postulaciones
// y acceso al formulario de integrantes.
// Se usa en el modal de detalle (tarjetas) y en la página de gestión
// (/proyectos/:id/gestionar), que es la misma vista pero como página.
// Layout estilo Steam: columna principal + sidebar sticky con el CTA.
// ==========================================================================
export default function ProjectDetailView({ project, onStatusChanged }) {
  const { user, users, applications, ratings, lang, t, l10n, changeProjectStatus, handleApplication, applyToProject } = useApp();
  const { showToast } = useToast();
  const { openRate, openUserDetail } = useModals();
  const navigate = useNavigate();

  const owner = users.find(u => u.id === project.ownerId);
  const apps = applications
    .filter(a => a.projectId === project.id)
    .sort((a, b) => APP_ORDER[a.status] - APP_ORDER[b.status]);
  const isOwner = project.ownerId === user.id;
  const accepted = apps.filter(a => a.status === 'accepted');
  const myApp = apps.find(a => a.userId === user.id);
  const slotsFull = accepted.length >= project.slots;
  // La sección "Postulaciones" es la cola de decisión: solo los pendientes.
  // Los aceptados se ven en "Integrantes" y los rechazados dejan de listarse.
  const pendingApps = apps.filter(a => a.status === 'pending');
  const progress = ratingProgress(project.id, accepted, ratings);
  const projectFinished = project.status === 'completed' || project.status === 'closed';
  const ownerRating = owner ? getUserAvgRating(owner.id, ratings) : 0;

  const onStatusChange = (newStatus) => {
    const res = changeProjectStatus(project.id, newStatus);
    if (res === 'pendingRatings') {
      // Falta calificar: se avisa y se abre el modal de calificación.
      showToast(t('toast.pendingRatings'), 'error');
      openRate(project.id);
      return;
    }
    if (!res) return;
    showToast(t('toast.projectUpdated', { status: t(statusLabelKey(newStatus)) }), 'success');
    if (onStatusChanged) onStatusChanged(newStatus);
  };

  const onApplication = (appId, newStatus) => {
    const name = handleApplication(appId, newStatus, project.id);
    if (name === 'slotsFull') {
      showToast(t('invite.slotsFull'), 'error');
      return;
    }
    if (name === 'projectClosed') {
      showToast(t('toast.projectClosed'), 'error');
      return;
    }
    if (name) {
      showToast(newStatus === 'accepted' ? t('toast.acceptedUser', { name }) : t('toast.rejectedUser', { name }), newStatus === 'accepted' ? 'success' : 'info');
    }
  };

  const onApply = () => {
    const res = applyToProject(project.id);
    if (res === 'alreadyApplied') {
      showToast(t('toast.alreadyApplied'), 'error');
    } else if (res === 'minRating') {
      const userRating = getUserAvgRating(user.id, ratings);
      showToast(t('toast.minRating', { stars: project.minRating, user: userRating.toFixed(1) }), 'error');
    } else if (res === 'ok') {
      showToast(t('toast.applicationSent'), 'success');
    }
  };

  // CTA principal del sidebar: Gestionar (dueño) o Postularse / estado.
  let sidebarCta;
  if (isOwner) {
    sidebarCta = (
      <button className="btn btn-primary btn-full" onClick={() => navigate(`/proyectos/${project.id}/gestionar`)}>
        {t('detail.manageBtn')}
      </button>
    );
  } else if (myApp) {
    if (myApp.status === 'pending') {
      sidebarCta = <span className="project-status status-in-progress">{t('card.pending')}</span>;
    } else if (myApp.status === 'accepted') {
      sidebarCta = <span className="project-status status-in-progress">{t('myApps.accepted')}</span>;
    } else {
      sidebarCta = <span className="project-status status-closed">{t('card.rejected')}</span>;
    }
  } else if (project.status === 'open' && !slotsFull) {
    sidebarCta = <button className="btn btn-primary btn-full" onClick={onApply}>{t('card.postulate')}</button>;
  } else {
    sidebarCta = <span className="project-status status-closed">{slotsFull ? t('card.slotsFull') : t(statusLabelKey(project.status))}</span>;
  }

  let ownerActions = null;
  if (isOwner && project.status === 'open') {
    ownerActions = (
      <div className="detail-owner-actions">
        <div className="detail-owner-buttons">
          <button className="btn btn-success btn-sm" onClick={() => onStatusChange('in-progress')}>{t('detail.start')}</button>
          <button className="btn btn-danger btn-sm" onClick={() => onStatusChange('closed')}>{t('detail.close')}</button>
        </div>
        {progress.pending > 0 && (
          <p className="detail-hint">{t('detail.culminateHint')}</p>
        )}
      </div>
    );
  } else if (isOwner && project.status === 'in-progress') {
    ownerActions = (
      <div className="detail-owner-actions">
        <div className="detail-owner-buttons">
          <button className="btn btn-warning btn-sm" onClick={() => openRate(project.id)}>{t('detail.rateParticipants')}</button>
          <button className="btn btn-danger btn-sm" onClick={() => onStatusChange('completed')}>{t('detail.culminate')}</button>
        </div>
        <p className="detail-hint">
          {progress.total === 0
            ? t('detail.noMembersToRate')
            : t('detail.ratingsProgress', { rated: progress.rated, total: progress.total })}
        </p>
      </div>
    );
  } else if (isOwner && projectFinished) {
    ownerActions = <p className="detail-hint">{t('detail.finished')}</p>;
  }

  let applicantsHTML = null;
  if (isOwner) {
    applicantsHTML = (
      <div className="detail-section">
        <div className="detail-section-head">
          <h3>{t('detail.applicants')}</h3>
          {pendingApps.length > 0 && <span className="applicant-badge">{t('detail.pendingCount', { n: pendingApps.length })}</span>}
        </div>
        {pendingApps.length === 0 ? (
          <p className="detail-empty">{apps.length === 0 ? t('detail.noApplicants') : t('detail.noPendingApplicants')}</p>
        ) : (
          <div className="detail-applicants">
            {pendingApps.map(a => {
              const applicant = users.find(u => u.id === a.userId);
              if (!applicant) return null;
              const rating = getUserAvgRating(applicant.id, ratings);
              return (
                <div className="applicant-row" key={a.id}>
                  <div className="applicant-info">
                    <span className="applicant-name">{escapeHTML(applicant.name)} (@{escapeHTML(applicant.username)})</span>
                    <span className="applicant-skills">
                      {applicant.skills.map(s => escapeHTML(s)).join(', ')}
                      {rating > 0 && <> · <Stars rating={rating} /></>}
                    </span>
                  </div>
                  <div className="applicant-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openUserDetail(applicant.id, 2)}>{t('detail.viewProfile')}</button>
                    {!projectFinished && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => onApplication(a.id, 'accepted')}>{t('detail.accept')}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => onApplication(a.id, 'rejected')}>{t('detail.reject')}</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // La lista de integrantes no se muestra en el detalle: la flechita abre el
  // formulario de calificación, que es donde se ven y se califican.
  let membersHTML = null;
  if (accepted.length > 0) {
    const canRate = isOwner && !projectFinished;
    membersHTML = (
      <div className="detail-section">
        <div className="detail-section-head">
          <h3>{t('detail.acceptedTitle')}</h3>
          <span className="applicant-badge">{accepted.length}</span>
        </div>
        <button
          className="btn btn-ghost btn-full detail-members-link"
          onClick={() => openRate(project.id)}
          title={canRate ? t('detail.editRating') : t('detail.viewMembers')}
        >
          <span>{canRate ? t('detail.membersLink') : t('detail.viewMembers')}</span>
          <span aria-hidden="true">→</span>
        </button>
        {canRate && (
          <p className="detail-hint">
            {progress.total === 0
              ? t('detail.noMembersToRate')
              : t('detail.ratingsProgress', { rated: progress.rated, total: progress.total })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="steam-detail">
      <ProjectBanner project={project} mode="detail" />
      <div className="steam-detail-head">
        <div className="steam-title-row">
          <h2>{escapeHTML(l10n(project.title))}</h2>
          <StatusPill status={project.status} label={t(statusLabelKey(project.status))} />
        </div>
        <span className="project-category-badge">{getCategoryLabel(lang, project.category)}</span>
      </div>

      <div className="steam-detail-grid">
        <div className="steam-main">
          <div className="detail-section">
            <h3>{t('detail.description')}</h3>
            <p>{escapeHTML(l10n(project.description))}</p>
          </div>

          <div className="detail-section">
            <h3>{t('detail.techs')}</h3>
            <SkillTags skills={project.tech} limit={999} />
          </div>

          {project.repo && (
            <div className="detail-section">
              <h3>{t('detail.repo')}</h3>
              <p>
                <a href={escapeHTML(project.repo)} target="_blank" rel="noopener noreferrer">
                  {escapeHTML(project.repo)}
                </a>
              </p>
            </div>
          )}

          {ownerActions}
          {applicantsHTML}
          {membersHTML}
        </div>

        <aside className="steam-side" aria-label={t('detail.manageBtn')}>
          <dl className="steam-facts">
            <div className="steam-fact">
              <dt>{t('detail.stateLabel')}</dt>
              <dd><StatusPill status={project.status} label={t(statusLabelKey(project.status))} /></dd>
            </div>
            <div className="steam-fact">
              <dt>{t('detail.cuposLabel')}</dt>
              <dd>
                <strong>{accepted.length}/{project.slots}</strong>
                <span className="steam-cupos-bar" aria-hidden="true">
                  <span style={{ width: `${project.slots ? Math.min(100, Math.round((accepted.length / project.slots) * 100)) : 0}%` }} />
                </span>
              </dd>
            </div>
            <div className="steam-fact">
              <dt>{t('detail.deadlineLabel')}</dt>
              <dd>{formatDeadline(lang, project.deadline)}</dd>
            </div>
            <div className="steam-fact">
              <dt>{t('detail.minRatingTitle')}</dt>
              <dd>
                <span className="min-rating-stars">{'★'.repeat(project.minRating || 1)}{'☆'.repeat(5 - (project.minRating || 1))}</span>
              </dd>
            </div>
            <div className="steam-fact">
              <dt>{t('detail.ownerLabel')}</dt>
              <dd>
                {owner ? escapeHTML(owner.name) : t('card.unknown')}
                {ownerRating > 0 && <> · <Stars rating={ownerRating} /></>}
              </dd>
            </div>
          </dl>
          <div className="steam-cta">{sidebarCta}</div>
          <p className="min-rating-desc">{t('detail.minRatingDesc', { stars: project.minRating || 1 })}</p>
        </aside>
      </div>
    </div>
  );
}
