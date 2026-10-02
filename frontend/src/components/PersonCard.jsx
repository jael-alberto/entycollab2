import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Avatar, Stars } from './common.jsx';
import { completedProjectsCount } from '../lib/talent.js';
import { getUserAvgRating, getUserRatingCount, escapeHTML } from '../lib/helpers.js';

// Cuántas etiquetas mostrar como máximo. El resto va en "+N" con la lista
// completa en el title.
const MAX_TAGS = 6;

// Las etiquetas que la tarjeta muestra dependen de lo que se está filtrando:
// sin filtros ni búsqueda solo aparecen la valoración y la bio. Cada chip es
// una opción concreta (tipo de juego, lenguaje, género, habilidad), sin el
// nombre de la faceta. El contador de proyectos tampoco aparece por defecto:
// solo cuando se está filtrando por historial o buscando.
export default function PersonCard({ person, me, options, showCompleted }) {
  const { ratings, projects, applications, t, l10n } = useApp();
  const { openUserDetail, openInvite } = useModals();

  const rating = getUserAvgRating(person.id, ratings);
  const ratingCount = getUserRatingCount(person.id, ratings);
  const isSelf = person.id === me.id;
  const bio = l10n(person.bio);
  const completed = completedProjectsCount(person.id, projects, applications);

  const tags = options || [];
  const shown = tags.slice(0, MAX_TAGS);
  const rest = tags.length - shown.length;
  const allTitles = tags.map(o => o.text).join(', ');

  return (
    <article className="person-card">
      <div className="person-card-head">
        <Avatar user={person} cls="person-avatar person-avatar-card" />
        <div className="person-card-id">
          <h3 className="person-name">{escapeHTML(person.name)}</h3>
          <div className="person-username">@{escapeHTML(person.username)}</div>
        </div>
        <span className={'person-badge ' + (isSelf ? 'self' : 'available')}>
          {isSelf ? t('person.you') : t('person.available')}
        </span>
      </div>

      {/* Lo único siempre visible: la valoración. El historial solo cuando se
          está filtrando por esa faceta o hay una búsqueda activa. */}
      <div className="person-card-metrics">
        <span className="person-metric">
          <span className="person-metric-label">{t('profile.statRating')}</span>
          {rating > 0
            ? <Stars rating={rating} />
            : <span className="person-metric-empty">{t('person.noRatings')}</span>}
          {ratingCount > 0 && <span className="person-metric-count">({ratingCount})</span>}
        </span>
        {showCompleted && (
          <span className="person-metric">
            <span className="person-metric-value">{completed}</span>
            <span className="person-metric-label">{t('card.projectsDone')}</span>
          </span>
        )}
      </div>

      {bio && <p className="person-bio">{escapeHTML(bio)}</p>}

      {shown.length > 0 && (
        <div className="person-tags">
          {shown.map(o => (
            <span key={`${o.key}:${o.value}`} className="person-chip" title={allTitles}>
              {o.icon && <span className="person-chip-icon" aria-hidden="true">{o.icon}</span>}
              {escapeHTML(o.text)}
            </span>
          ))}
          {rest > 0 && (
            <span className="person-chip is-more" title={allTitles}>{t('card.more', { n: rest })}</span>
          )}
        </div>
      )}

      <div className="person-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => openUserDetail(person.id)}>
          {isSelf ? t('person.viewMyProfile') : t('person.viewProfile')}
        </button>
        {!isSelf && (
          <button className="btn btn-primary btn-sm" onClick={() => openInvite(person.id)}>
            {t('person.inviteProject')}
          </button>
        )}
      </div>
    </article>
  );
}