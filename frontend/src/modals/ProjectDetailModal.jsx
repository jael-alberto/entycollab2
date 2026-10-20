import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, StatusPill, ProjectBanner, Stars, SkillTags } from '../components/common.jsx';
import { formatDeadline } from '../components/ProjectCard.jsx';
import PeekRating from '../components/PeekRating.jsx';
import {
  getUserAvgRating, getCategoryLabel, escapeHTML
} from '../lib/helpers.js';

function statusLabelKey(status) {
  if (status === 'open') return 'status.recruiting';
  if (status === 'in-progress') return 'status.developing';
  if (status === 'completed') return 'status.finished';
  return 'status.closed';
}

export default function ProjectDetailModal() {
  const { user, users, projects, applications, ratings, lang, t, l10n, changeProjectStatus, handleApplication, activeGroup, isActiveGroupAdmin } = useApp();
  const { showToast } = useToast();
  const { detailProjectId, closeDetail, openRate, openApply } = useModals();
  const [rolesByApplication, setRolesByApplication] = useState({});
  const navigate = useNavigate();

  const project = projects.find(p => p.id === detailProjectId);
  if (!project) return null;

  const owner = users.find(u => u.id === project.ownerId);
  const apps = applications.filter(a => a.projectId === project.id);
  const isOwner = project.ownerId === user.id || (project.groupId && activeGroup?.id === project.groupId && isActiveGroupAdmin);
  const accepted = apps.filter(a => a.status === 'accepted');
  const myApp = apps.find(a => a.userId === user.id);
  const slotsFull = accepted.length >= project.slots;
  const ownerRating = owner ? getUserAvgRating(owner.id, ratings) : 0;

  const onStatusChange = (newStatus) => {
    const res = changeProjectStatus(project.id, newStatus);
    if (res === 'noParticipants') {
      showToast(t('toast.noParticipants'), 'error');
      return;
    }
    showToast(t('toast.projectUpdated', { status: t(statusLabelKey(newStatus)) }), 'success');
    closeDetail();
  };

  const onApplication = (appId, newStatus) => {
    const name = handleApplication(appId, newStatus, project.id, rolesByApplication[appId] || 'Colaborador');
    if (name === 'slotsFull') {
      showToast(t('invite.slotsFull'), 'error');
      return;
    }
    if (name) {
      showToast(newStatus === 'accepted' ? t('toast.acceptedUser', { name }) : t('toast.rejectedUser', { name }), newStatus === 'accepted' ? 'success' : 'info');
    }
  };

  // La postulación pide pitch (140-500) en el modal dedicado (Agente E).
  const onApply = () => openApply(project.id);

  const goManage = () => {
    closeDetail();
    navigate(`/proyectos/${project.id}/gestionar`);
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

  // CTA principal del sidebar: Gestionar (dueño) o Postularse / estado.
  let sidebarCta;
  if (isOwner) {
    sidebarCta = <button className="btn btn-primary btn-full" onClick={goManage}>{t('detail.manageBtn')}</button>;
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
                    {(project.roles || []).length > 0 && <select className="project-role-select" value={rolesByApplication[a.id] || ''} onChange={e => setRolesByApplication(prev => ({ ...prev, [a.id]: e.target.value }))}><option value="">Asignar rol…</option>{project.roles.map(role => <option key={role} value={role}>{role}</option>)}</select>}
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
                  {a.projectRole && <><strong>{a.projectRole}</strong> · </>}
                  {participant.skills.map(s => escapeHTML(s)).join(', ')}
                  {rating ? (
                    <> · {t('detail.rated')}: <PeekRating value={rating.stars} readOnly size={16} lift={4} magnify={1.05} riseDuration={250} /></>
                  ) : (isOwner && project.status === 'completed' ? <> · {t('detail.unrated')}</> : '')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Layer 1: se abre desde el historial del perfil de usuario y desde las
  // tarjetas, así que tiene que quedar por encima de esos modales.
  return (
    <Modal open onClose={closeDetail} size="modal-large modal-xlarge" layer={1} label={String(l10n(project.title))}>
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

            {(project.roles || []).length > 0 && <div className="detail-section"><h3>Roles buscados</h3><SkillTags skills={project.roles} limit={999} /></div>}

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
            {participantsHTML}
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
    </Modal>
  );
}
