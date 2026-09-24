import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Avatar, Stars, SkillTags } from './common.jsx';
import { getUserAvgRating, escapeHTML, userCategories, getCategoryLabel } from '../lib/helpers.js';

export default function PersonCard({ person, me }) {
  const { ratings, lang, t, l10n } = useApp();
  const { openUserDetail, openInvite } = useModals();

  const rating = getUserAvgRating(person.id, ratings);
  const isSelf = person.id === me.id;
  const bio = l10n(person.bio);
  const categories = userCategories(person);

  return (
    <article className="person-card">
      <div className="person-card-header">
        <Avatar user={person} />
        <div>
          <h3 className="person-name">
            {escapeHTML(person.name)}{' '}
            {isSelf
              ? <span className="person-badge self">{t('person.you')}</span>
              : <span className="person-badge available">{t('person.available')}</span>}
          </h3>
          <div className="person-username">@{escapeHTML(person.username)}</div>
          <div className="person-rating">
            {rating > 0 ? <Stars rating={rating} /> : t('person.noRatings')}
          </div>
        </div>
      </div>
      <p className="person-bio">{bio ? escapeHTML(bio) : t('person.noBio')}</p>
      {categories.length > 0 && (
        <div className="person-categories">
          {categories.map(c => <span key={c} className="person-cat-chip">{escapeHTML(getCategoryLabel(lang, c))}</span>)}
        </div>
      )}
      <div className="person-skills"><SkillTags skills={person.skills} /></div>
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