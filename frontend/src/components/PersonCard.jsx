import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Avatar, Icon } from './common.jsx';
import {
  completedProjectsCount,
  userDisciplines,
  userLanguages
} from '../lib/talent.js';
import { getUserAvgRating, escapeHTML } from '../lib/helpers.js';

// Cuántas habilidades se muestran. El resto va en "+N" con la lista en el title.
const MAX_SKILLS = 3;
const MAX_MATCH_TAGS = 3;

// Rol principal de la tarjeta. Se deriva de la primera disciplina del
// usuario; si no tiene, no se muestra.
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

export default function PersonCard({ person, me, options }) {
  const { ratings, projects, applications, lang, t, l10n } = useApp();
  const { openUserDetail, openInvite } = useModals();

  const rating = getUserAvgRating(person.id, ratings);
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

  const bio = person.bio ? l10n(person.bio) : '';
  const nameId = `person-name-${person.id}`;

  return (
    <article className="person-card person-card--talent" aria-labelledby={nameId}>
      <div className="person-card-top">
        <Avatar user={person} cls="person-avatar person-avatar-card" />
        <button
          type="button"
          className="person-card-open"
          onClick={() => openUserDetail(person.id)}
          aria-label={`${isSelf ? t('person.viewMyProfile') : t('person.viewProfile')}: ${person.name}`}
        >
          <span aria-hidden="true">↗</span>
        </button>
      </div>

      <h3 className="person-name" id={nameId}>{escapeHTML(person.name)}</h3>
      <div className="person-username">@{escapeHTML(person.username)}</div>

      {role && <p className="person-role">{escapeHTML(role)}</p>}

      {person.available === true && !isSelf && (
        <p className="person-avail">
          <span className="person-avail-dot" aria-hidden="true" />
          <span>{t('person.availableToCollab')}</span>
        </p>
      )}

      {isSelf && <span className="person-badge self">{t('person.you')}</span>}

      {bio && <p className="person-bio">{escapeHTML(bio)}</p>}

      {(shownSkills.length > 0 || shownTags.length > 0) && (
        <div className="person-skills">
          {shownSkills.map(s => (
            <span key={s} className="tech-tag">{escapeHTML(s)}</span>
          ))}
          {restSkills > 0 && (
            <span className="tech-tag skill-more-tag" title={skills.join(', ')}>
              +{restSkills}
            </span>
          )}
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

      <div className="person-card-foot">
        <div className="person-foot-stats">
          <span className="person-rating">
            <Icon name="star" size={13} />
            <b>{rating > 0 ? rating.toFixed(1) : '—'}</b>
          </span>
          <span className="person-completed">
            {completed} {t('people.completedProjects')}
          </span>
        </div>

        <div className="person-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
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
      </div>
    </article>
  );
}
