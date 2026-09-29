import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, EmptyState } from '../components/common.jsx';
import { escapeHTML } from '../lib/helpers.js';

export default function InviteModal() {
  const { user, users, projects, t, l10n, sendInvite } = useApp();
  const { showToast } = useToast();
  const { invitePersonId, closeInvite } = useModals();

  const person = users.find(u => u.id === invitePersonId);
  const myOpenProjects = projects.filter(p => p.ownerId === user.id && p.status === 'open');
  const [projectId, setProjectId] = useState('');
  const [message, setMessage] = useState('');

  if (!person) return null;
  if (myOpenProjects.length === 0) {
    return (
      <Modal open onClose={closeInvite} title={t('invite.title')}>
        <EmptyState title={t('invite.noOpenProjects')} icon={null} />
      </Modal>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const res = sendInvite(projectId, person.id, message.trim());
    if (res === 'already') {
      showToast(t('invite.already'), 'error');
      return;
    }
    if (res === 'slotsFull') {
      showToast(t('invite.slotsFull'), 'error');
      return;
    }
    if (res === 'ok') {
      showToast(t('invite.sent'), 'success');
      closeInvite();
    }
  };

  return (
    <Modal open onClose={closeInvite} title={t('invite.title')}>
      <p className="auth-subtitle">
        {t('invite.subtitle')} <strong>{escapeHTML(person.name)}</strong> {t('invite.subtitle2')}
      </p>
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="invite-project">{t('invite.selectProject')}</label>
          <select id="invite-project" required value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">{t('createProject.select')}</option>
            {myOpenProjects.map(p => (
              <option key={p.id} value={p.id}>{escapeHTML(l10n(p.title))}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="invite-message">{t('invite.message')}</label>
          <textarea id="invite-message" rows="3" value={message} onChange={e => setMessage(e.target.value)} placeholder={t('invite.messagePh')}></textarea>
        </div>
        <button type="submit" className="btn btn-primary btn-full">{t('invite.submit')}</button>
      </form>
    </Modal>
  );
}