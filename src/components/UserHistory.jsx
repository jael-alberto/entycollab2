import { useApp } from '../context/AppContext.jsx';
import { userHistoryItems, escapeHTML } from '../lib/helpers.js';

// Historial de proyectos de un usuario (estilo userHistoryHTML del vanilla)
export default function UserHistory({ user }) {
  const { user: me, projects, applications, lang, t, l10n, openFeatured } = useApp();

  const items = userHistoryItems(user, projects, applications, lang);
  const featured = Array.isArray(user.featuredProjectIds) ? user.featuredProjectIds : [];
  const featuredSet = new Set(featured);
  const isSelf = me && user.id === me.id;

  items.sort((a, b) => (featuredSet.has(b.p.id) ? 1 : 0) - (featuredSet.has(a.p.id) ? 1 : 0));

  if (items.length === 0) {
    return <div className="empty-state"><p>{t('history.noHistory')}</p></div>;
  }

  return (
    <>
      {isSelf && (
        <button className="btn btn-ghost btn-sm" onClick={openFeatured} style={{ marginBottom: '0.75rem' }}>
          {t('history.chooseFeatured')}
        </button>
      )}
      {items.map(it => {
        const isFeat = featuredSet.has(it.p.id);
        return (
          <div className={'history-item' + (isFeat ? ' featured' : '')} key={it.p.id}>
            <div>
              <span className="history-project-name">{escapeHTML(l10n(it.p.title))}</span>
              {isFeat && <span className="history-featured-badge">{t('history.featured')}</span>}
              <span className="history-role"> · {it.role} · {it.statusText}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}