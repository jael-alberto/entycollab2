import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, StatusPill, ProjectBanner, Stars, SkillTags } from '../components/common.jsx';
import {
  getUserAvgRating, getCategoryLabel, getStatusLabel, escapeHTML
} from '../lib/helpers.js';

export default function ProjectDetailModal() {
  const { user, users, projects, applications, ratings, lang, t, l10n, changeProjectStatus, handleApplication } = useApp();
  const { showToast } = useToast();
  const { detailProjectId, closeDetail, openRate } = useModals();

  const project = projects.find(p => p.id === detailProjectId);
  if (!project) return null;

  const owner = users.find(u => u.id === project.ownerId);
  const apps = applications.filter(a => a.projectId === project.id);
  const isOwner = project.ownerId === user.id;
  const accepted = apps.filter(a => a.status === 'accepted');

  const onStatusChange = (newStatus) => {
    const res = changeProjectStatus(project.id, newStatus);
    if (res === 'noParticipants') {
      showToast(t('toast.noParticipants'), 'error');
      return;
    }
    showToast(t('toast.projectUpdated', { status: getStatusLabel(lang, newStatus) }), 'success');
    closeDetail();
  };

  const onApplication = (appId, newStatus) => {
    const name = handleApplication(appId, newStatus, project.id);
    if (name === 'slotsFull') {
      showToast(t('invite.slotsFull'), 'error');
      return;
    }
    if (name) {
      showToast(newStatus === 'accepted' ? t('toast.acceptedUser', { name }) : t('toast.rejectedUser', { name }), newStatus === 'accepted' ? 'success' : 'info');
    }
  };

  let ownerActions = null;
  if (isOwner && project.status === 'open') {
    ownerActions = (
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-success btn-sm" onClick={() => onStatusChange('in-progress')}>{t('detail.start')}</button>
        <button className="btn btn-danger btn-sm" onClick={() => onStatusChange('closed')}>{t('detail.close')}</button>
      </div>
    );
  } else if (isOwner && project.status === 'in-progress') {
    ownerActions = (
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-warning btn-sm" onClick={() => onStatusChange('completed')}>{t('detail.markCompleted')}</button>
      </div>
    );
  } else if (isOwner && project.status === 'completed') {
    ownerActions = (
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-warning btn-sm" onClick={() => openRate(project.id)}>{t('detail.rateParticipants')}</button>
      </div>
    );
  }

  let applicantsHTML = null;
  if (isOwner && apps.length > 0) {
    applicantsHTML = (
      <div className="detail-applicants">
        <h3>{t('detail.applicants')} ({apps.length})</h3>
        {apps.map(a => {
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
                {a.status === 'pending' ? (
                  <>
                    <button className="btn btn-success btn-sm" onClick={() => onApplication(a.id, 'accepted')}>{t('detail.accept')}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onApplication(a.id, 'rejected')}>{t('detail.reject')}</button>
                  </>
                ) : (
                  <span className={`project-status ${a.status === 'accepted' ? 'status-in-progress' : 'status-closed'}`} style={{ fontSize: '0.75rem' }}>
                    {a.status === 'accepted' ? t('detail.accepted') : t('detail.rejected')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  let participantsHTML = null;
  if (accepted.length > 0) {
    participantsHTML = (
      <div className="detail-applicants" style={{ marginTop: '1rem' }}>
        <h3>{t('detail.acceptedTitle')} ({accepted.length})</h3>
        {accepted.map(a => {
          const participant = users.find(u => u.id === a.userId);
          if (!participant) return null;
          const rating = ratings.find(r => r.projectId === project.id && r.ratedUserId === participant.id);
          return (
            <div className="applicant-row" key={a.id}>
              <div className="applicant-info">
                <span className="applicant-name">{escapeHTML(participant.name)}</span>
                <span className="applicant-skills">
                  {participant.skills.map(s => escapeHTML(s)).join(', ')}
                  {rating ? (
                    <> · {t('detail.rated')}: {'★'.repeat(rating.stars)}{'☆'.repeat(5 - rating.stars)}</>
                  ) : (isOwner && project.status === 'completed' ? <> · {t('detail.unrated')}</> : '')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Modal open onClose={closeDetail} size="modal-large">
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
      {participantsHTML}
    </Modal>
  );
}