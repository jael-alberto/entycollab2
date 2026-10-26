import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { EmptyState, Field, Modal, Spinner } from '../components/common.jsx';
import { escapeHTML } from '../lib/helpers.js';
import { MESSAGE_MAX, messageKey, requiredKey } from '../lib/validation.js';

export default function InviteModal() {
  const { user, users, projects, t, l10n, sendInvite } = useApp();
  const { showToast } = useToast();
  const { invitePersonId, closeInvite, openCreate } = useModals();

  const person = users.find(u => u.id === invitePersonId);
  const myOpenProjects = projects.filter(p => p.ownerId === user.id && p.status === 'open');
  const [projectId, setProjectId] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (!person) return null;
  if (myOpenProjects.length === 0) {
    return (
      <Modal open onClose={closeInvite} title={t('invite.title')}>
        <EmptyState
          title={t('invite.noOpenProjects')}
          icon={null}
          actionLabel={t('proj.newBtn')}
          onAction={() => { closeInvite(); openCreate(); }}
        />
      </Modal>
    );
  }

  const tErr = (key) => (key ? t(key) : '');

  const submit = (e) => {
    e.preventDefault();
    const found = {
      projectId: tErr(requiredKey(projectId)),
      message: tErr(messageKey(message, MESSAGE_MAX)),
    };
    Object.keys(found).forEach(k => { if (!found[k]) delete found[k]; });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    const res = sendInvite(projectId, person.id, message.trim());
    setLoading(false);
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
      <form onSubmit={submit} noValidate>
        <Field label={t('invite.selectProject')} htmlFor="invite-project" error={errors.projectId} required>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">{t('createProject.select')}</option>
            {myOpenProjects.map(p => (
              <option key={p.id} value={p.id}>{escapeHTML(l10n(p.title))}</option>
            ))}
          </select>
        </Field>
        <Field
          label={`${t('invite.message')} (${t('form.optional')})`}
          htmlFor="invite-message"
          hint={`${t('invite.messageHint')} (${message.length}/${MESSAGE_MAX})`}
          error={errors.message}
        >
          <textarea rows="3" value={message} maxLength={MESSAGE_MAX + 50} onChange={e => setMessage(e.target.value)} placeholder={t('invite.messagePh')}></textarea>
        </Field>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading} aria-busy={loading}>
          {loading && <Spinner />}
          {loading ? t('invite.sending') : t('invite.submit')}
        </button>
      </form>
    </Modal>
  );
}
