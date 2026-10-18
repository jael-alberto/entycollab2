import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Avatar, EmptyState, Icon, Stars } from './common.jsx';
import { TalentFacets } from './PeopleSidebar.jsx';
import { completedProjectsCount } from '../lib/talent.js';
import { escapeHTML, getUserAvgRating, getUserRatingCount } from '../lib/helpers.js';
import {
  activeFilterCount,
  emptyFilters,
  facetCounts,
  filterPeople,
  revealedOptions
} from '../lib/talentSearch.js';

const ROLE_LABEL = {
  owner: 'group.roleOwner',
  admin: 'group.roleAdmin',
  member: 'group.roleMember'
};

const ROLE_BADGE = {
  owner: 'role-owner',
  admin: 'role-admin',
  member: 'role-member'
};

const ROLE_FILTERS = ['all', 'owner', 'admin', 'member'];

const MAX_TAGS = 6;

function normalizeRole(role) {
  return ROLE_BADGE[role] ? role : 'member';
}

// Pestaña "Personas" de un grupo: barra lateral con búsqueda, filtro por rol y
// las mismas facetas de talento que el buscador de personas (layout Upwork).
export default function GroupPeopleInGroup({
  group,
  users,
  groupMembers,
  isOwner,
  isAdmin,
  currentUser,
  t,
  onRoleChange,
  onRemoveMember
}) {
  const { ratings, projects, applications, lang, l10n } = useApp();
  const { openUserDetail } = useModals();
  const [filters, setFilters] = useState(emptyFilters);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');

  const members = useMemo(() => (
    (groupMembers || [])
      .map(member => ({ ...member, role: normalizeRole(member.role), person: users.find(u => u.id === member.userId) }))
      .filter(m => m.person)
  ), [groupMembers, users]);

  const memberByUser = useMemo(() => new Map(members.map(m => [m.person.id, m])), [members]);

  const ctx = useMemo(() => ({ projects, applications, ratings }), [projects, applications, ratings]);

  // Personas que pasan búsqueda y filtros de talento (todavía sin filtrar rol).
  const talentMatched = useMemo(
    () => filterPeople(members.map(m => m.person), filters, search, lang, ctx),
    [members, filters, search, lang, ctx]
  );

  const matchedIds = useMemo(() => new Set(talentMatched.map(u => u.id)), [talentMatched]);

  const roleCounts = useMemo(() => {
    const out = { all: 0, owner: 0, admin: 0, member: 0 };
    members.forEach(m => {
      if (matchedIds.has(m.person.id)) {
        out.all += 1;
        out[m.role] = (out[m.role] || 0) + 1;
      }
    });
    return out;
  }, [members, matchedIds]);

  const results = useMemo(() => (
    members
      .filter(m => role === 'all' || m.role === role)
      .map(m => m.person)
      .filter(p => matchedIds.has(p.id))
  ), [members, role, matchedIds]);

  // El conteo de cada faceta se calcula sobre los miembros del rol activo.
  const rolePool = useMemo(() => (
    members.filter(m => role === 'all' || m.role === role).map(m => m.person)
  ), [members, role]);

  const counts = useMemo(
    () => facetCounts(rolePool, filters, search, lang, ctx),
    [rolePool, filters, search, lang, ctx]
  );

  const optionsByUser = useMemo(() => {
    const out = new Map();
    results.forEach(u => out.set(u.id, revealedOptions(u, filters, search, lang)));
    return out;
  }, [results, filters, search, lang]);

  const activeCount = activeFilterCount(filters);
  const hasAnyFilter = activeCount > 0 || search.trim() !== '' || role !== 'all';

  const resetAll = () => {
    setFilters(emptyFilters());
    setSearch('');
    setRole('all');
  };

  const resultsLabel = results.length === 1
    ? t('people.resultsOne')
    : t('people.results', { n: results.length });

  return (
    <div className="people-layout group-people-layout">
      <aside className="people-sidebar group-people-sidebar">
        <div className="people-sidebar-head">
          <h3 className="people-sidebar-title">{t('group.members')}</h3>
          <span className="group-people-count">{members.length}</span>
        </div>

        <label className="group-people-search">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('people.searchPh')}
            aria-label={t('people.searchPh')}
          />
          {search && (
            <button type="button" className="group-people-search-clear" onClick={() => setSearch('')} aria-label={t('people.clearSearch')}>
              &times;
            </button>
          )}
        </label>

        <section className="facet">
          <div className="facet-head group-people-role-head">
            <span className="facet-title">{t('group.filterRole')}</span>
          </div>
          <div className="facet-body">
            <div className="group-people-options">
              {ROLE_FILTERS.map(r => (
                <button
                  type="button"
                  key={r}
                  className={`group-people-option ${role === r ? 'active' : ''}`}
                  onClick={() => setRole(r)}
                >
                  <span className="group-people-option-label">
                    {r === 'all' ? t('group.allRoles') : t(ROLE_LABEL[r])}
                  </span>
                  <span className="group-people-option-count">{roleCounts[r] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <TalentFacets filters={filters} counts={counts} onChange={setFilters} />

        {hasAnyFilter && (
          <button type="button" className="btn btn-ghost btn-sm people-sidebar-reset" onClick={resetAll}>
            {t('people.clearAll')}
          </button>
        )}

        <p className="people-sidebar-total">{t('people.showing', { n: results.length, total: members.length })}</p>
      </aside>

      <div className="people-results">
        <div className="group-people-results-head">
          <span className="group-people-results-count">{resultsLabel}</span>
          <span className="group-people-results-group">
            <Icon name="lock" size={13} />
            {group?.name}
          </span>
        </div>

        {results.length === 0 ? (
          <EmptyState icon="users" title={t('group.noMembers')} />
        ) : (
          <div className="group-people-grid">
            {results.map(person => {
              const member = memberByUser.get(person.id);
              const isSelf = person.id === currentUser.id;
              const rating = getUserAvgRating(person.id, ratings);
              const ratingCount = getUserRatingCount(person.id, ratings);
              const completed = completedProjectsCount(person.id, projects, applications);
              const canManageRoles = isOwner && member.role !== 'owner';
              const canKick = isAdmin && member.role !== 'owner' && !isSelf;
              const bio = l10n(person.bio);
              const tags = optionsByUser.get(person.id) || [];
              const shownTags = tags.slice(0, MAX_TAGS);
              const restTags = tags.length - shownTags.length;

              return (
                <article className="person-card group-person-card" key={person.id}>
                  <div className="person-card-head">
                    <Avatar user={person} cls="person-avatar person-avatar-card" />
                    <div className="person-card-id">
                      <h3 className="person-name">{escapeHTML(person.name)}</h3>
                      <div className="person-username">
                        @{escapeHTML(person.username)}
                        {isSelf && <span className="group-person-you"> · {t('person.you')}</span>}
                      </div>
                    </div>
                    <span className={`member-role ${ROLE_BADGE[member.role]}`}>{t(ROLE_LABEL[member.role])}</span>
                  </div>

                  <div className="person-card-metrics">
                    <span className="person-metric">
                      <span className="person-metric-label">{t('profile.statRating')}</span>
                      {rating > 0
                        ? <Stars rating={rating} />
                        : <span className="person-metric-empty">{t('person.noRatings')}</span>}
                      {ratingCount > 0 && <span className="person-metric-count">({ratingCount})</span>}
                    </span>
                    <span className="person-metric">
                      <span className="person-metric-value">{completed}</span>
                      <span className="person-metric-label">{t('card.projectsDone')}</span>
                    </span>
                  </div>

                  {bio && <p className="person-bio">{escapeHTML(bio)}</p>}

                  {shownTags.length > 0 && (
                    <div className="person-tags">
                      {shownTags.map(o => (
                        <span key={`${o.key}:${o.value}`} className="person-chip">
                          {escapeHTML(o.text)}
                        </span>
                      ))}
                      {restTags > 0 && <span className="person-chip is-more">{t('card.more', { n: restTags })}</span>}
                    </div>
                  )}

                  <div className="group-person-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openUserDetail(person.id)}>
                      {isSelf ? t('person.viewMyProfile') : t('person.viewProfile')}
                    </button>
                    {canManageRoles && (
                      <select
                        className="group-person-role-select"
                        value={member.role}
                        onChange={e => onRoleChange(member.userId, e.target.value)}
                        aria-label={t('group.memberRole')}
                      >
                        <option value="member">{t('group.roleMember')}</option>
                        <option value="admin">{t('group.roleAdmin')}</option>
                      </select>
                    )}
                    {canKick && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm group-person-remove"
                        onClick={() => onRemoveMember(member.userId, person.name)}
                      >
                        {t('group.removeMember')}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
