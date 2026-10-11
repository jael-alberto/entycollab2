import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import PersonCard from '../components/PersonCard.jsx';
import PeopleDirectory from '../components/PeopleDirectory.jsx';
import { Avatar, GroupAvatar, EmptyState, Icon } from '../components/common.jsx';
import { scoreProject, escapeHTML, getUserAvgRating } from '../lib/helpers.js';
import { l10nValue } from '../lib/i18n.js';

const availableUsers = (users) => users.filter(u => u.available === true);
const projectsOfGroup = (projects, groupId) => projects.filter(p => p.groupId === groupId);

export default function Dashboard() {
  const { user, projects, applications, users, ratings, groups, lang, t, selectGroup, activeGroup } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [groupSearch, setGroupSearch] = useState('');
  const view = searchParams.get('view') === 'global' ? 'global' : 'welcome';

  const myGroups = useMemo(
    () => groups.filter(g => g.members?.some(m => m.userId === user.id)),
    [groups, user.id]
  );

  const otherGroups = useMemo(
    () => groups.filter(g => !g.members?.some(m => m.userId === user.id)),
    [groups, user.id]
  );

  const matchGroup = (g) => {
    if (!groupSearch.trim()) return true;
    const q = groupSearch.trim().toLowerCase();
    return g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q);
  };

  const filteredMine = useMemo(() => myGroups.filter(matchGroup), [myGroups, groupSearch]);
  const filteredOther = useMemo(() => otherGroups.filter(matchGroup), [otherGroups, groupSearch]);

  const openGroup = (groupId) => {
    selectGroup(groupId);
    navigate(`/grupos/${groupId}`);
  };

  const openGlobal = () => {
    selectGroup(null);
    setSearchParams({ view: 'global' });
  };

  const backHome = () => {
    selectGroup(null);
    setSearchParams({});
  };

  const explore = () => {
    selectGroup(null);
    navigate('/grupos');
  };

  const myProjectsCount = projects.filter(p => p.ownerId === user.id).length;
  const collabsCount = applications.filter(a => a.userId === user.id && a.status === 'accepted').length;

  return (
    <div className="dashboard-layout">
      {view !== 'global' && (
      <aside className="dashboard-sidebar">
        <div className="sidebar-user-block">
        </div>

        <div className="sidebar-search">
          <label className="sidebar-search-field">
            <Icon name="search" size={16} />
            <input
              type="text"
              placeholder={t('dash.searchGroups')}
              value={groupSearch}
              onChange={e => setGroupSearch(e.target.value)}
            />
          </label>
        </div>

        <nav className="sidebar-nav">
          <button className={`sidebar-nav-item ${view === 'global' && !activeGroup ? 'active' : ''}`} onClick={openGlobal}>
            <Icon name="globe" size={17} />
            <span>{t('dash.global')}</span>
          </button>

          <div className="sidebar-nav-heading">
            <span>{t('dash.yourGroups')}</span>
            <span className="sidebar-count">{myGroups.length}</span>
          </div>

          {myGroups.length === 0 ? (
            <p className="sidebar-empty-text">{t('dash.noGroups')}</p>
          ) : filteredMine.length === 0 ? (
            <p className="sidebar-empty-text">{t('dash.noMatch')}</p>
          ) : (
            filteredMine.map(group => {
              const membership = group.members?.find(m => m.userId === user.id);
              const isActive = activeGroup?.id === group.id;
              return (
                <button
                  key={group.id}
                  className={`sidebar-nav-item group-item ${isActive ? 'active' : ''}`}
                  onClick={() => openGroup(group.id)}
                >
                  <GroupAvatar group={group} size="sm" />
                  <span className="group-item-text">
                    <span className="group-item-name">{escapeHTML(group.name)}</span>
                    <span className="group-item-meta">
                      {group.members?.length || 0} {t('dash.membersShort')} · {projectsOfGroup(projects, group.id).length} {t('dash.projectsShort')}
                    </span>
                  </span>
                  <span className={`sidebar-role ${membership?.role || 'member'}`}>
                    {membership?.role === 'owner' ? t('group.roleOwner') : membership?.role === 'admin' ? t('group.roleAdmin') : t('group.roleMember')}
                  </span>
                </button>
              );
            })
          )}

          {otherGroups.length > 0 && (
            <>
              <div className="sidebar-nav-heading">
                <span>{t('dash.exploreGroups')}</span>
                <span className="sidebar-count">{otherGroups.length}</span>
              </div>
              {(filteredOther.length === 0 ? [] : filteredOther.slice(0, 5)).map(group => {
                const pending = group.requests?.some(r => r.userId === user.id && r.status === 'pending');
                return (
                  <button
                    key={group.id}
                    className="sidebar-nav-item group-item muted"
                    disabled={pending}
                    onClick={() => openGroup(group.id)}
                  >
                    <GroupAvatar group={group} size="sm" />
                    <span className="group-item-text">
                      <span className="group-item-name">{escapeHTML(group.name)}</span>
                      <span className="group-item-meta">
                        {pending ? t('dash.pending') : `${group.members?.length || 0} ${t('dash.membersShort')}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-primary btn-block" onClick={explore}>
            <Icon name="compass" size={16} />
            {t('dash.exploreGroups')}
          </button>
        </div>
      </aside>
      )}

      <main className="dashboard-main">
        {view === 'global' ? (
          <GlobalView
            user={user}
            projects={projects}
            applications={applications}
            users={users}
            ratings={ratings}
            groups={groups}
            lang={lang}
            t={t}
            onBack={backHome}
          />
        ) : (
          <>
            <section className="dash-hero">
              <div className="dash-hero-text">
                <h1>{t('dash.welcome', { name: user.name.split(' ')[0] })}</h1>
                <p>{t('dash.sub')}</p>
              </div>
              <div className="dash-hero-search">
                <Icon name="search" size={18} />
                <input
                  type="text"
                  placeholder={t('dash.searchGroups')}
                  value={groupSearch}
                  onChange={e => setGroupSearch(e.target.value)}
                />
              </div>
            </section>

            <section className="dash-stats">
              <div className="stat-card">
                <Icon name="users" size={20} />
                <span className="stat-value">{myGroups.length}</span>
                <span className="stat-label">{t('dash.statGroups')}</span>
              </div>
              <div className="stat-card">
                <Icon name="box" size={20} />
                <span className="stat-value">{myProjectsCount}</span>
                <span className="stat-label">{t('dash.statProjects')}</span>
              </div>
              <div className="stat-card">
                <Icon name="sparkles" size={20} />
                <span className="stat-value">{collabsCount}</span>
                <span className="stat-label">{t('dash.statCollabs')}</span>
              </div>
              <div className="stat-card">
                <Icon name="star" size={20} />
                <span className="stat-value">{availableUsers(users).length}</span>
                <span className="stat-label">{t('dash.statAvailable')}</span>
              </div>
            </section>

            <section className="dash-section">
              <header className="dash-section-head">
                <h2>
                  {t('dash.yourGroups')}
                  <span className="dash-count">{myGroups.length}</span>
                </h2>
                <button className="btn btn-outline btn-sm" onClick={explore}>{t('dash.viewAll')}</button>
              </header>

              {myGroups.length === 0 ? (
                <EmptyState title={t('dash.noGroups')} sub={t('dash.noGroupsSub')} icon={null} />
              ) : filteredMine.length === 0 ? (
                <EmptyState title={t('dash.noMatch')} icon={null} />
              ) : (
                <div className="dash-group-grid">
                  {filteredMine.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      projects={projects}
                      role={group.members?.find(m => m.userId === user.id)?.role}
                      t={t}
                      onClick={() => openGroup(group.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {otherGroups.length > 0 && (
              <section className="dash-section">
                <header className="dash-section-head">
                  <h2>{t('dash.discoverGroups')}<span className="dash-count">{otherGroups.length}</span></h2>
                </header>
                {filteredOther.length === 0 ? (
                  <EmptyState title={t('dash.noMatch')} icon={null} />
                ) : (
                  <div className="dash-group-grid">
                    {filteredOther.map(group => {
                      const pending = group.requests?.some(r => r.userId === user.id && r.status === 'pending');
                      return (
                        <GroupCard
                          key={group.id}
                          group={group}
                          projects={projects}
                          t={t}
                          pending={pending}
                          onClick={() => {
                            if (pending) { showToast(t('dash.pendingToast'), 'info'); return; }
                            openGroup(group.id);
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function GroupCard({ group, projects, role, pending, t, onClick }) {
  const memberCount = group.members?.length || 0;
  const projectCount = projectsOfGroup(projects, group.id).length;
  return (
    <article className="dash-group-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter') && onClick()}>
      <div className="dash-group-card-head">
        <GroupAvatar group={group} size="lg" />
        <div className="dash-group-card-title">
          <h3>{escapeHTML(group.name)}</h3>
          {role ? (
            <span className={`group-role-badge role-${role}`}>
              {role === 'owner' ? t('group.roleOwner') : role === 'admin' ? t('group.roleAdmin') : t('group.roleMember')}
            </span>
          ) : pending ? (
            <span className="group-role-badge pending">{t('dash.pending')}</span>
          ) : (
            <span className="group-role-badge private">{t('dash.private')}</span>
          )}
        </div>
      </div>
      <p className="dash-group-card-desc">{escapeHTML(group.description || '')}</p>
      <div className="dash-group-card-foot">
        <span className="dash-group-meta"><Icon name="users" size={14} />{memberCount}</span>
        <span className="dash-group-meta"><Icon name="box" size={14} />{projectCount}</span>
        <span className="dash-group-card-cta">
          {role ? t('dash.enter') : pending ? t('dash.pending') : t('dash.requestAccess')}
        </span>
      </div>
    </article>
  );
}

const STATUS_FILTERS = [
  { value: 'all', labelKey: 'dash.filterAll' },
  { value: 'open', labelKey: 'status.open' },
  { value: 'completed', labelKey: 'status.completed' }
];

function GlobalView({ user, projects, applications, users, ratings, groups, lang, t, onBack }) {
  const [tab, setTab] = useState('overview');
  const [projSearch, setProjSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');

  const publicProjects = useMemo(() => projects.filter(p => !p.groupId), [projects]);
  const openPublic = useMemo(() => publicProjects.filter(p => p.status === 'open'), [publicProjects]);
  const availablePeople = useMemo(
    () => availableUsers(users).filter(u => u.id !== user.id),
    [users, user.id]
  );
  const myGroupsCount = useMemo(
    () => groups.filter(g => g.members?.some(m => m.userId === user.id)).length,
    [groups, user.id]
  );
  const collabsCount = useMemo(
    () => applications.filter(a => a.userId === user.id && a.status === 'accepted').length,
    [applications, user.id]
  );

  // Proyectos públicos más "pesados" (owner bien valorado, equipo, etc.).
  const featured = useMemo(
    () => [...openPublic]
      .sort((a, b) => scoreProject(b, projects, applications, users, ratings) - scoreProject(a, projects, applications, users, ratings))
      .slice(0, 3),
    [openPublic, projects, applications, users, ratings]
  );

  // Personas disponibles con mejor promedio de estrellas.
  const topPeople = useMemo(
    () => [...availablePeople]
      .sort((a, b) => getUserAvgRating(b.id, ratings) - getUserAvgRating(a.id, ratings))
      .slice(0, 3),
    [availablePeople, ratings]
  );

  const filteredProjects = useMemo(() => {
    let list = publicProjects;
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    const q = projSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        l10nValue(lang, p.title).toLowerCase().includes(q) ||
        l10nValue(lang, p.description).toLowerCase().includes(q) ||
        (p.tech || []).some(tech => tech.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [publicProjects, statusFilter, projSearch, lang]);

  return (
    <>
      <header className="repo-header">
        <button className="repo-back" onClick={onBack}>
          <Icon name="arrow-left" size={16} />
          {t('dash.backHome')}
        </button>

        <div className="repo-title-row">
          <span className="dash-globe-badge"><Icon name="globe" size={22} /></span>
          <div className="repo-title-info">
            <div className="repo-name-line">
              <h1 className="repo-name">{t('dash.global')}</h1>
              <span className="repo-visibility"><Icon name="globe" size={13} />{t('dash.public')}</span>
            </div>
            <p className="repo-desc">{t('dash.globalDesc')}</p>
          </div>
        </div>

        <div className="repo-meta">
          <span className="repo-meta-item"><Icon name="box" size={15} />{publicProjects.length} {t('dash.statPublicProjects')}</span>
          <span className="repo-meta-item"><Icon name="star" size={15} />{openPublic.length} {t('dash.statOpenProjects')}</span>
          <span className="repo-meta-item"><Icon name="users" size={15} />{availablePeople.length} {t('dash.statAvailablePeople')}</span>
        </div>
      </header>

      <nav className="repo-tabs" role="tablist" aria-label={t('dash.global')}>
        <button
          type="button"
          className={`repo-tab ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
          role="tab"
          aria-selected={tab === 'overview'}
        >
          <Icon name="home" size={16} />
          {t('group.overview')}
        </button>
        <button
          type="button"
          className={`repo-tab ${tab === 'projects' ? 'active' : ''}`}
          onClick={() => setTab('projects')}
          role="tab"
          aria-selected={tab === 'projects'}
        >
          <Icon name="box" size={16} />
          {t('group.projects')}
          <span className="repo-tab-count">{publicProjects.length}</span>
        </button>
        <button
          type="button"
          className={`repo-tab ${tab === 'people' ? 'active' : ''}`}
          onClick={() => setTab('people')}
          role="tab"
          aria-selected={tab === 'people'}
        >
          <Icon name="users" size={16} />
          {t('group.people')}
          <span className="repo-tab-count">{availablePeople.length}</span>
        </button>
      </nav>

      {tab === 'overview' && (
        <div className="group-tab-content">
          <div className="group-kpi-grid">
            <div className="group-kpi-card" onClick={() => setTab('projects')} style={{ cursor: 'pointer' }}>
              <span className="group-kpi-value">{publicProjects.length}</span>
              <span className="group-kpi-label">{t('dash.publicProjects')}</span>
              <small style={{ color: 'var(--color-success)', fontWeight: 600 }}>{openPublic.length} {t('dash.statOpenProjects')}</small>
            </div>
            <div className="group-kpi-card" onClick={() => setTab('people')} style={{ cursor: 'pointer' }}>
              <span className="group-kpi-value">{availablePeople.length}</span>
              <span className="group-kpi-label">{t('dash.availablePeople')}</span>
              <small style={{ color: 'var(--color-text-dim)' }}>{t('dash.summarySub')}</small>
            </div>
            <div className="group-kpi-card">
              <span className="group-kpi-value">{myGroupsCount}</span>
              <span className="group-kpi-label">{t('dash.statGroups')}</span>
              <small style={{ color: 'var(--color-text-dim)' }}>{t('dash.yourGroups')}</small>
            </div>
            <div className="group-kpi-card">
              <span className="group-kpi-value">{collabsCount}</span>
              <span className="group-kpi-label">{t('dash.statCollabs')}</span>
              <small style={{ color: 'var(--color-text-dim)' }}>{t('dash.statGroups')}</small>
            </div>
          </div>

          <section className="dash-section">
            <header className="dash-section-head">
              <h2>{t('dash.publicProjects')}<span className="dash-count">{featured.length}</span></h2>
              <button className="btn btn-outline btn-sm" onClick={() => setTab('projects')}>{t('dash.seeProjects')}</button>
            </header>
            {featured.length === 0 ? (
              <EmptyState title={t('empty.globalProjects')} sub={t('empty.dashboardSub')} icon={null} />
            ) : (
              <div className="projects-grid">
                {featured.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
              </div>
            )}
          </section>

          <section className="dash-section">
            <header className="dash-section-head">
              <h2>{t('dash.availablePeople')}<span className="dash-count">{availablePeople.length}</span></h2>
              <button className="btn btn-outline btn-sm" onClick={() => setTab('people')}>{t('dash.seePeople')}</button>
            </header>
            {topPeople.length === 0 ? (
              <EmptyState title={t('empty.globalPeople')} sub={t('empty.peopleSub')} icon={null} />
            ) : (
              <div className="people-grid">
                {topPeople.map(u => (
                  <PersonCard key={u.id} person={u} me={user} options={null} showCompleted={false} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'projects' && (
        <div className="group-tab-content">
          <div className="group-panel">
            <div className="group-projects-toolbar">
              <div>
                <h3 style={{ margin: 0 }}>{t('dash.publicProjects')}</h3>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-dim)', fontSize: '0.88rem' }}>
                  {filteredProjects.length} {t('dash.projectsShort')}.
                </p>
              </div>
              <div className="group-filter-pills">
                {STATUS_FILTERS.map(opt => (
                  <button
                    type="button"
                    key={opt.value}
                    className={`group-filter-pill ${statusFilter === opt.value ? 'active' : ''}`}
                    onClick={() => setStatusFilter(opt.value)}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                className="group-search-input"
                placeholder={t('proj.searchPh')}
                value={projSearch}
                onChange={e => setProjSearch(e.target.value)}
              />
            </div>

            {filteredProjects.length === 0 ? (
              <EmptyState
                icon="📁"
                title={t('empty.globalProjects')}
                sub={publicProjects.length === 0 ? t('empty.dashboardSub') : t('empty.projectsSub')}
              />
            ) : (
              <div className="projects-grid">
                {filteredProjects.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'people' && (
        <div className="group-tab-content">
          <PeopleDirectory />
        </div>
      )}
    </>
  );
}