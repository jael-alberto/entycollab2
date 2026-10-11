import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { StatusPill, ProjectBanner, Stars, SkillTags } from './common.jsx';
import {
  getUserAvgRating, getCategoryLabel, getStatusLabel, escapeHTML,
  projectRatingProgress
} from '../lib/helpers.js';

const APP_ORDER = { pending: 0, accepted: 1, rejected: 2 };

// ==========================================================================
// Contenido de un proyecto: banner, datos, acciones del dueño, postulaciones
// y acceso al formulario de integrantes.
// Se usa en el modal de detalle (tarjetas) y en la página de gestión
// (/proyectos/:id/gestionar), que es la misma vista pero como página.
// ==========================================================================
export default function ProjectDetailView({ project, onStatusChanged }) {
  const { user, users, applications, ratings, lang, t, l10n, changeProjectStatus, handleApplication } = useApp();
  const { showToast } = useToast();
  const { openRate, openUserDetail } = useModals();

  const owner = users.find(u => u.id === project.ownerId);
  const apps = applications
    .filter(a => a.projectId === project.id)
    .sort((a, b) => APP_ORDER[a.status] - APP_ORDER[b.status]);
  const isOwner = project.ownerId === user.id;
  const accepted = apps.filter(a => a.status === 'accepted');
  // La sección "Postulaciones" es la cola de decisión: solo los pendientes.
  // Los aceptados se ven en "Integrantes" y los rechazados dejan de listarse.
  const pendingApps = apps.filter(a => a.status === 'pending');
  const progress = projectRatingProgress(project.id, accepted, ratings);
  const projectFinished = project.status === 'completed' || project.status === 'closed';

  const onStatusChange = (newStatus) => {
    const res = changeProjectStatus(project.id, newStatus);
    if (res === 'pendingRatings') {
      // Falta calificar: se avisa y se abre el modal de calificación.
      showToast(t('toast.pendingRatings'), 'error');
      openRate(project.id);
      return;
    }
    if (!res) return;
    showToast(t('toast.projectUpdated', { status: getStatusLabel(lang, newStatus) }), 'success');
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
    <>
      <ProjectBanner project={project} mode="detail" />
      <div className="detail-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2>{escapeHTML(l10n(project.title))}</h2>
          <StatusPill status={project.status} label={getStatusLabel(lang, project.status)} />
        </div>
        <span className="project-category-badge">{getCategoryLabel(lang, project.category)}</span>
        <div className="detail-meta">
          <span><strong>{t('detail.createdBy')}</strong> {owner ? escapeHTML(owner.name) : t('card.unknown')}</span>
          <span><strong>{t('detail.slots')}</strong> {accepted.length}/{project.slots}</span>
          {project.deadline && <span><strong>{t('detail.deadline')}</strong> {new Date(project.deadline).toLocaleDateString(lang)}</span>}
          {project.repo && <span><a href={escapeHTML(project.repo)} target="_blank" rel="noopener noreferrer">{t('detail.repo')}</a></span>}
        </div>
      </div>

      <div className="detail-section">
        <h3>{t('detail.description')}</h3>
        <p>{escapeHTML(l10n(project.description))}</p>
      </div>

      <div className="detail-section">
        <h3>{t('detail.techs')}</h3>
        <SkillTags skills={project.tech} limit={999} />
      </div>

      <div className="detail-section">
        <h3>{t('detail.minRatingTitle')}</h3>
        <div className="min-rating-detail">
          <span className="min-rating-stars big">{'★'.repeat(project.minRating || 1)}{'☆'.repeat(5 - (project.minRating || 1))}</span>
          <span className="min-rating-desc">{t('detail.minRatingDesc', { stars: project.minRating || 1 })}</span>
        </div>
      </div>

      {ownerActions}
      {applicantsHTML}
      {membersHTML}
    </>
  );
}
