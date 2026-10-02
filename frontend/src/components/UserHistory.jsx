import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { ProjectBanner, StatusPill } from './common.jsx';
import { userHistoryItems, getStatusLabel, escapeHTML } from '../lib/helpers.js';

// Historial de proyectos de un usuario (estilo userHistoryHTML del vanilla).
// Cada fila es un botón que abre el detalle del proyecto, esté abierto,
// en curso, cerrado o completado.
export default function UserHistory({ user }) {
  const { user: me, projects, applications, lang, t, l10n } = useApp();
  const { openFeatured, openDetail } = useModals();

  const items = userHistoryItems(user, projects, applications, lang);
  const featured = Array.isArray(user.featuredProjectIds) ? user.featuredProjectIds : [];
  const featuredSet = new Set(featured);
  const isSelf = me && user.id === me.id;

  return <UserHistoryList
    items={items}
    featuredSet={featuredSet}
    isSelf={isSelf}
    lang={lang}
    t={t}
    l10n={l10n}
    onFeatured={openFeatured}
    onOpen={openDetail}
  />;
}

// Sepurado para poder verificarlo en SSR sin montar toda la página.
export function UserHistoryList({ items, featuredSet, isSelf, lang, t, l10n, onFeatured, onOpen }) {
  items.sort((a, b) => (featuredSet.has(b.p.id) ? 1 : 0) - (featuredSet.has(a.p.id) ? 1 : 0));

  if (items.length === 0) {
    return <div className="empty-state"><p>{t('history.noHistory')}</p></div>;
  }

  return (
    <>
      {isSelf && (
        <button className="btn btn-ghost btn-sm history-featured-btn" onClick={onFeatured}>
          {t('history.chooseFeatured')}
        </button>
      )}
      <div className="history-list">
        {items.map(it => {
          const isFeat = featuredSet.has(it.p.id);
          return (
            <button
              type="button"
              className={'history-item' + (isFeat ? ' featured' : '')}
              key={it.p.id}
              onClick={() => onOpen(it.p.id)}
              title={t('card.viewDetail')}
            >
              <ProjectBanner project={it.p} mode="thumb" />
              <div className="history-body">
                <span className="history-project-name">{escapeHTML(l10n(it.p.title))}</span>
                {isFeat && <span className="history-featured-badge">{t('history.featured')}</span>}
                <span className="history-role">{it.role} · {it.statusText}</span>
              </div>
              <StatusPill status={it.p.status} label={getStatusLabel(lang, it.p.status)} />
            </button>
          );
        })}
      </div>
    </>
  );
}