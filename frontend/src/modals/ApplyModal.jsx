import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { EmptyState, ErrorState, Field, Modal, Spinner } from '../components/common.jsx';
import { escapeHTML, getUserAvgRating } from '../lib/helpers.js';
import { PITCH_MAX, PITCH_MIN, pitchKey } from '../lib/validation.js';

/**
 * Postulación a un proyecto con pitch obligatorio (140-500 caracteres).
 * Los estados previos (ya postulado, sin cupos, proyecto cerrado,
 * calificación insuficiente) se muestran como data states visibles,
 * no solo como toasts.
 */
export default function ApplyModal() {
  const { user, users, projects, applications, ratings, t, l10n, applyToProject } = useApp();
  const { showToast } = useToast();
  const { applyProjectId, closeApply } = useModals();

  const [pitch, setPitch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const project = projects.find(p => p.id === applyProjectId);
  if (!project) return null;

  const owner = users.find(u => u.id === project.ownerId);
  const apps = applications.filter(a => a.projectId === project.id);
  const accepted = apps.filter(a => a.status === 'accepted').length;
  const slotsFull = accepted >= project.slots;
  const mine = apps.find(a => a.userId === user.id);
  const userRating = getUserAvgRating(user.id, ratings);
  const meetsRating = !project.minRating || userRating >= project.minRating;
  const isOpen = project.status === 'open';

  const submit = (e) => {
    e.preventDefault();
    const key = pitchKey(pitch);
    if (key) {
      setError(t(key, { n: pitch.trim().length }));
      return;
    }
    setLoading(true);
    const res = applyToProject(project.id, pitch.trim());
    setLoading(false);
    if (res === 'alreadyApplied') {
      showToast(t('toast.alreadyApplied'), 'error');
      closeApply();
      return;
    }
    if (res === 'minRating') {
      setError(t('toast.minRating', { stars: project.minRating, user: userRating.toFixed(1) }));
      return;
    }
    if (res === 'ok') {
      showToast(t('toast.applicationSent'), 'success');
      closeApply();
    }
  };

  let body;
  if (project.ownerId === user.id) {
    body = <ErrorState title={t('apply.closed')} onRetry={closeApply} retryLabel={t('common.close')} />;
  } else if (!isOpen) {
    body = <ErrorState title={t('apply.closed')} onRetry={closeApply} retryLabel={t('common.close')} />;
  } else if (mine && mine.status === 'pending') {
    body = <EmptyState title={t('card.pending')} sub={t('toast.alreadyApplied')} icon="send" />;
  } else if (mine && mine.status === 'accepted') {
    body = <EmptyState title={t('myApps.accepted')} icon="check" />;
  } else if (slotsFull) {
    body = <ErrorState title={t('invite.slotsFull')} onRetry={closeApply} retryLabel={t('common.close')} />;
  } else if (!meetsRating) {
    body = <ErrorState title={t('toast.minRating', { stars: project.minRating, user: userRating.toFixed(1) })} onRetry={closeApply} retryLabel={t('common.close')} />;
  } else {
    body = (
      <form onSubmit={submit} noValidate>
        <Field
          label={t('apply.pitchLabel')}
          htmlFor="apply-pitch"
          hint={`${t('apply.pitchHint')} (${pitch.length}/${PITCH_MAX}, mín. ${PITCH_MIN})`}
          error={error}
          required
        >
          <textarea
            id="apply-pitch"
            rows="5"
            value={pitch}
            onChange={e => { setPitch(e.target.value); if (error) setError(''); }}
            placeholder={t('apply.pitchHint')}
          />
        </Field>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading} aria-busy={loading}>
          {loading && <Spinner />}
          {loading ? t('apply.sending') : t('apply.submit')}
        </button>
      </form>
    );
  }

  return (
    <Modal open onClose={closeApply} title={t('apply.title')} subtitle={`${escapeHTML(l10n(project.title))} · ${owner ? escapeHTML(owner.name) : t('card.unknown')}`}>
      <p className="form-hint">{t('apply.subtitle')}</p>
      {body}
    </Modal>
  );
}
