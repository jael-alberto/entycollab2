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

// Fila del historial: miniatura, nombre, rol y estado. Mismo orden y datos
// que antes (destacados primero); solo cambia la presentación.
function HistoryRow({ it, isFeat, t, l10n, lang, onOpen }) {
  const title = l10n(it.p.title);
  return (
    <button
      type="button"
      className={'history-item' + (isFeat ? ' featured' : '')}
      onClick={() => onOpen(it.p.id)}
      title={t('card.viewDetail')}
      aria-label={`${title} — ${it.role}, ${it.statusText}`}
    >
      <ProjectBanner project={it.p} mode="thumb" />
      <div className="history-body">
        <span className="history-project-name">{escapeHTML(title)}</span>
        {isFeat && <span className="history-featured-badge">{t('history.featured')}</span>}
        <span className="history-role">{it.role} · {it.statusText}</span>
      </div>
      <StatusPill status={it.p.status} label={getStatusLabel(lang, it.p.status)} />
    </button>
  );
}

// Separado para poder verificarlo en SSR sin montar toda la página.
export function UserHistoryList({ items, featuredSet, isSelf, lang, t, l10n, onFeatured, onOpen }) {
  // Copia ordenada (destacados primero): mismo criterio que antes, sin
  // mutar el arreglo que llega por props.
  const sorted = [...items].sort(
    (a, b) => (featuredSet.has(b.p.id) ? 1 : 0) - (featuredSet.has(a.p.id) ? 1 : 0)
  );
  // Destacados del portfolio (máx 5): los primeros marcados como principales.
  const showcase = sorted.filter(it => featuredSet.has(it.p.id)).slice(0, 5);

  if (sorted.length === 0) {
    return <div className="empty-state" role="status"><p>{t('history.noHistory')}</p></div>;
  }

  return (
    <>
      {isSelf && (
        <button type="button" className="btn btn-ghost btn-sm history-featured-btn" onClick={onFeatured}>
          {t('history.chooseFeatured')}
        </button>
      )}
      {showcase.length > 0 && (
        <section className="history-showcase" aria-label={t('history.featured')}>
          <p className="history-section-label">
            {t('history.featured')} · {featuredSet.size}/5
          </p>
          <div className="history-list history-showcase-grid">
            {showcase.map(it => (
              <HistoryRow
                key={it.p.id}
                it={it}
                isFeat
                t={t}
                l10n={l10n}
                lang={lang}
                onOpen={onOpen}
              />
            ))}
          </div>
        </section>
      )}
      <div className="history-list" role="list" aria-label={t('profile.history')}>
        {sorted.map(it => (
          <HistoryRow
            key={it.p.id}
            it={it}
            isFeat={featuredSet.has(it.p.id)}
            t={t}
            l10n={l10n}
            lang={lang}
            onOpen={onOpen}
          />
        ))}
      </div>
    </>
  );
}
