import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, Avatar, Stars, SkillTags, ProfileLinks, TalentRow } from '../components/common.jsx';
import UserHistory from '../components/UserHistory.jsx';
import {
  completedProjectsCount,
  disciplineLabel,
  favoriteGenreLabel,
  gameTypeLabel,
  userDisciplines,
  userFavoriteGenres,
  userGameTypes,
  userLanguages
} from '../lib/talent.js';
import { getUserAvgRating, escapeHTML, userCategories, getCategoryLabel } from '../lib/helpers.js';

export default function UserDetailModal() {
  const { users, ratings, projects, applications, lang, t, l10n } = useApp();
  const { userDetailId, closeUserDetail, openInvite } = useModals();
  const { user: me } = useApp();

  const u = users.find(x => x.id === userDetailId);
  if (!u) return null;

  const rating = getUserAvgRating(u.id, ratings);
  const bio = l10n(u.bio);
  const isSelf = me && me.id === u.id;
  const categories = userCategories(u);
  const completed = completedProjectsCount(u.id, projects, applications);

  return (
    <Modal open onClose={closeUserDetail} size="modal-large" title={t('userDetail.title')}>
      <div className="profile-layout">
        <div className="profile-info">
          <Avatar user={u} cls="profile-avatar" />
          <h3>{escapeHTML(u.name)}</h3>
          <p className="profile-username">@{escapeHTML(u.username)}</p>
          <div className="profile-rating-display">
            {rating > 0 ? <Stars rating={rating} /> : t('person.noRatings')}
          </div>
          <p className="profile-bio">{bio ? escapeHTML(bio) : t('person.noBio')}</p>

          <ul className="person-stats">
            <li><strong>{completed}</strong> {t('profile.completedProjects')}</li>
          </ul>

          <TalentRow label={t('settings.gameTypesLabel')} values={userGameTypes(u).map(v => gameTypeLabel(lang, v))} />
          <TalentRow label={t('filters.disciplines')} values={userDisciplines(u).map(v => disciplineLabel(lang, v))} />
          <TalentRow label={t('settings.favoriteGenresLabel')} values={userFavoriteGenres(u).map(v => favoriteGenreLabel(lang, v))} />

          {categories.length > 0 && (
            <div className="person-categories">
              {categories.map(c => <span key={c} className="person-cat-chip">{escapeHTML(getCategoryLabel(lang, c))}</span>)}
            </div>
          )}

          <TalentRow label={t('settings.languagesLabel')} values={userLanguages(u)} />

          <div className="profile-skills">
            {userLanguages(u).length === 0 && <SkillTags skills={u.skills} limit={999} />}
          </div>
          <ProfileLinks user={u} />
        </div>
        <div className="profile-history">
          <h3>{t('profile.history')}</h3>
          <UserHistory user={u} />
        </div>
      </div>
      {!isSelf && (
        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: '1rem' }}
          onClick={() => { closeUserDetail(); openInvite(u.id); }}
        >
          {t('person.inviteProject')}
        </button>
      )}
    </Modal>
  );
}
