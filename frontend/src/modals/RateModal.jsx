import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, EmptyState } from '../components/common.jsx';
import { escapeHTML, starLabel } from '../lib/helpers.js';

export default function RateModal() {
  const { user, users, applications, ratings, lang, t, saveRatings } = useApp();
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

  if (!user) return null;

  const setStars = (userId, stars) => {
    setSelected(prev => ({ ...prev, [userId]: stars }));
  };

  const save = () => {
    const saved = saveRatings(rateProjectId, selected);
    showToast(saved ? t('toast.ratingsSaved') : t('toast.noRatingsAssigned'), saved ? 'success' : 'info');
    closeRate();
  };

  return (
    <Modal open onClose={closeRate} title={t('rate.title')} subtitle={t('rate.subtitle')}>
      {apps.length === 0 ? (
        <EmptyState title={t('rate.noParticipants')} icon={null} />
      ) : (
        apps.map(a => {
          const participant = users.find(u => u.id === a.userId);
          if (!participant) return null;
          return (
            <div className="rate-participant" key={a.id}>
              <div>
                <span className="rate-participant-name">{escapeHTML(participant.name)}</span>
                <div className="applicant-skills" style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                  {participant.skills.map(s => escapeHTML(s)).join(', ')}
                </div>
              </div>
              <div className="star-rating">
                {[5, 4, 3, 2, 1].map(s => (
                  <span key={s} style={{ display: 'contents' }}>
                    <input
                      type="radio"
                      id={`star-${a.userId}-${s}`}
                      name={`rating-${a.userId}`}
                      value={s}
                      checked={selected[a.userId] === s}
                      onChange={() => setStars(a.userId, s)}
                    />
                    <label htmlFor={`star-${a.userId}-${s}`} title={starLabel(lang, s)}>★</label>
                  </span>
                ))}
              </div>
            </div>
          );
        })
      )}
      {apps.length > 0 && (
        <button className="btn btn-primary btn-full" onClick={save} style={{ marginTop: '1rem' }}>{t('rate.saveBtn')}</button>
      )}
    </Modal>
  );
}