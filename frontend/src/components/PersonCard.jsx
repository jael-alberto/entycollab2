import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Avatar, Stars } from './common.jsx';
import {
  completedProjectsCount,
  userDisciplines,
  userLanguages
} from '../lib/talent.js';
import { getUserAvgRating, getUserRatingCount, escapeHTML } from '../lib/helpers.js';

// Cuántas habilidades y etiquetas coincidentes se muestran. El resto va en
// "+N" con la lista completa en el title.
const MAX_SKILLS = 3;
const MAX_MATCH_TAGS = 3;

// Rol principal de la tarjeta (badge estilo Wellfound). Se deriva de la
// primera disciplina del usuario; si no tiene, no se muestra badge.
const ROLE_SHORT = {
  es: {
    programming: 'Programador',
    modeling: 'Artista 3D',
    'pixel-art': 'Diseñador',
    animation: 'Diseñador',
    sound: 'Compositor'
  },
  en: {
    programming: 'Programmer',
    modeling: '3D Artist',
    'pixel-art': 'Designer',
    animation: 'Designer',
    sound: 'Composer'
  }
};

export function primaryRoleLabel(user, lang) {
  const disciplines = userDisciplines(user);
  if (disciplines.length === 0) return '';
  const map = ROLE_SHORT[lang] || ROLE_SHORT.es;
  return map[disciplines[0]] || disciplines[0];
}

// Tarjeta de talento (Upwork/Wellfound + ArtStation): avatar 44, nombre,
// @usuario, badge de rol principal, punto de disponibilidad, valoración
// ★ promedio (n reseñas) o "Sin valoraciones", N proyectos completados,
// habilidades máx 3 + +N y CTAs Ver perfil / Invitar.
// La lógica facetada no cambia: `options` sigue siendo lo que revela
// talentSearch.revealedOptions y `showCompleted` lo decide PeopleDirectory.
export default function PersonCard({ person, me, options, showCompleted: _showCompleted }) {
  const { ratings, projects, applications, lang, t } = useApp();
  const { openUserDetail, openInvite } = useModals();

  const rating = getUserAvgRating(person.id, ratings);
  const ratingCount = getUserRatingCount(person.id, ratings);
  const isSelf = me && person.id === me.id;
  const completed = completedProjectsCount(person.id, projects, applications);
  const role = primaryRoleLabel(person, lang);

  const languages = userLanguages(person);
  const skills = languages.length > 0 ? languages : (person.skills || []);
  const shownSkills = skills.slice(0, MAX_SKILLS);
  const restSkills = skills.slice(MAX_SKILLS);

  const tags = options || [];
  const shownTags = tags.slice(0, MAX_MATCH_TAGS);
  const restTags = tags.length - shownTags.length;
  const allTagTitles = tags.map(o => o.text).join(', ');

  const nameId = `person-name-${person.id}`;

  return (
    <article className="person-card person-card--talent" aria-labelledby={nameId}>
      <div className="person-card-head">
        <Avatar user={person} cls="person-avatar person-avatar-card" />
        <div className="person-card-id">
          <h3 className="person-name" id={nameId}>{escapeHTML(person.name)}</h3>
          <div className="person-username">@{escapeHTML(person.username)}</div>
          {role && <span className="person-role-badge">{escapeHTML(role)}</span>}
        </div>
        {person.available === true && !isSelf && (
          <span className="person-avail" title={t('person.available')}>
            <span className="person-avail-dot" aria-hidden="true" />
            <span className="person-avail-text">{t('person.available')}</span>
          </span>
        )}
        {isSelf && (
          <span className="person-badge self">{t('person.you')}</span>
        )}
      </div>

      <div className="person-card-metrics">
        <span className="person-metric person-metric-rating">
          {rating > 0 ? (
            <>
              <Stars rating={rating} />
              {ratingCount > 0 && (
                <span className="person-metric-count">({ratingCount})</span>
              )}
            </>
          ) : (
            <span className="person-metric-empty">{t('filters.noRating')}</span>
          )}
        </span>
        {/* Proyectos completados siempre visibles: es el dato que hace
            decidir junto a la valoración. `showCompleted` se conserva en la
            firma por compatibilidad. */}
        <span className="person-metric">
          <span className="person-metric-value">{completed}</span>
          <span className="person-metric-label">{t('profile.completedProjects')}</span>
        </span>
      </div>

      {shownSkills.length > 0 && (
        <div
          className="person-skills"
          aria-label={`${shownSkills.join(', ')}${restSkills.length > 0 ? `, +${restSkills.length}` : ''}`}
        >
          {shownSkills.map(s => (
            <span key={s} className="tech-tag">{escapeHTML(s)}</span>
          ))}
          {restSkills.length > 0 && (
            <span className="tech-tag skill-more-tag" title={restSkills.join(', ')}>
              +{restSkills.length}
            </span>
          )}
        </div>
      )}

      {shownTags.length > 0 && (
        <div className="person-tags">
          {shownTags.map(o => (
            <span key={`${o.key}:${o.value}`} className="person-chip" title={allTagTitles}>
              {escapeHTML(o.text)}
            </span>
          ))}
          {restTags > 0 && (
            <span className="person-chip is-more" title={allTagTitles}>{t('card.more', { n: restTags })}</span>
          )}
        </div>
      )}

      <div className="person-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => openUserDetail(person.id)}
          aria-label={`${isSelf ? t('person.viewMyProfile') : t('person.viewProfile')}: ${person.name}`}
        >
          {isSelf ? t('person.viewMyProfile') : t('person.viewProfile')}
        </button>
        {!isSelf && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => openInvite(person.id)}
            aria-label={`${t('person.inviteProject')}: ${person.name}`}
          >
            {t('person.inviteProject')}
          </button>
        )}
      </div>
    </article>
  );
}
