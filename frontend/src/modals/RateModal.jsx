import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { EmptyState, Field, Modal, Spinner, StarInput } from '../components/common.jsx';
import { escapeHTML } from '../lib/helpers.js';
import { starsKey } from '../lib/validation.js';

export default function RateModal() {
  const { user, users, applications, ratings, t, saveRatings } = useApp();
  const { showToast } = useToast();
  const { rateProjectId, closeRate } = useModals();

  const apps = applications.filter(a => a.projectId === rateProjectId && a.status === 'accepted');
  const [selected, setSelected] = useState(() => {
    const map = {};
    apps.forEach(a => {
      const existing = ratings.find(r => r.projectId === rateProjectId && r.ratedUserId === a.userId);
      map[a.userId] = existing ? existing.stars : 0;
    });
    return map;
  });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const setStars = (userId, stars) => {
    setSelected(prev => ({ ...prev, [userId]: stars }));
    if (formError) setFormError('');
  };

  const save = () => {
    const key = starsKey(selected);
    if (key) {
      setFormError(t(key));
      return;
    }
    setLoading(true);
    const saved = saveRatings(rateProjectId, selected);
    setLoading(false);
    showToast(saved ? t('toast.ratingsSaved') : t('toast.noRatingsAssigned'), saved ? 'success' : 'info');
    closeRate();
  };

  return (
    // Layer 2: la valoración se abre desde el detalle de proyecto (layer 1).
    <Modal open onClose={closeRate} title={t('rate.title')} subtitle={t('rate.subtitle')} layer={2}>
      {apps.length === 0 ? (
        <EmptyState title={t('rate.noParticipants')} icon={null} />
      ) : (
        <>
          <p className="form-hint">{t('rate.hint')}</p>
          {apps.map(a => {
            const participant = users.find(u => u.id === a.userId);
            if (!participant) return null;
            const current = selected[a.userId] || 0;
            return (
              <div className="rate-participant" key={a.id}>
                <div>
                  <span className="rate-participant-name">{escapeHTML(participant.name)}</span>
                  <div className="applicant-skills" style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                    {participant.skills.map(s => escapeHTML(s)).join(', ')}
                  </div>
                </div>
                <Field
                  label={escapeHTML(participant.name)}
                  htmlFor={`rate-${a.userId}`}
                  hint={current > 0 ? (current === 1 ? t('star.one') : t('star.many', { n: current })) : t('rate.unrated')}
                >
                  <StarInput value={current} onChange={(stars) => setStars(a.userId, stars)} label={`${t('rate.title')}: ${participant.name}`} />
                </Field>
              </div>
            );
          })}
        </>
      )}
      {formError && <p className="field-error" role="alert">{formError}</p>}
      {apps.length > 0 && (
        <button className="btn btn-primary btn-full" onClick={save} disabled={loading} aria-busy={loading} style={{ marginTop: '1rem' }}>
          {loading && <Spinner />}
          {loading ? t('rate.saving') : t('rate.saveBtn')}
        </button>
      )}
    </Modal>
  );
}
