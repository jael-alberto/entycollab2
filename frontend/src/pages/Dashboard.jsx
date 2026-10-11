import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import PersonCard from '../components/PersonCard.jsx';
import { Avatar, GroupAvatar, EmptyState, Icon } from '../components/common.jsx';
import { scoreProject, escapeHTML } from '../lib/helpers.js';

const availableUsers = (users) => users.filter(u => u.available === true);
const projectsOfGroup = (projects, groupId) => projects.filter(p => p.groupId === groupId);

export default function Dashboard() {
  const { user, projects, applications, users, ratings, groups, t, selectGroup, activeGroup } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [groupSearch, setGroupSearch] = useState('');
  const [view, setView] = useState('welcome');

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
    setView('global');
  };

  const explore = () => {
    selectGroup(null);
    navigate('/grupos');
  };

  const myProjectsCount = projects.filter(p => p.ownerId === user.id).length;
  const collabsCount = applications.filter(a => a.userId === user.id && a.status === 'accepted').length;

  return (
    <div className="dashboard-layout">
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

      <main className="dashboard-main">
        {view === 'global' ? (
          <GlobalView
            user={user}
            projects={projects}
            applications={applications}
            users={users}
            ratings={ratings}
            t={t}
            onBack={() => setView('welcome')}
            onExplore={explore}
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

function GlobalView({ user, projects, applications, users, ratings, t, onBack, onExplore }) {
  const featured = useMemo(
    () => [...projects]
      .filter(p => !p.groupId && p.status === 'open')
      .sort((a, b) => scoreProject(b, projects, applications, users, ratings) - scoreProject(a, projects, applications, users, ratings))
      .slice(0, 6),
    [projects, applications, users, ratings]
  );

  const globalPeople = useMemo(
    () => availableUsers(users)
      .filter(u => u.id !== user.id)
      .sort((a, b) => (b.skills?.length || 0) - (a.skills?.length || 0))
      .slice(0, 6),
    [users, user.id]
  );

  return (
    <>
      <div className="dash-repo-head">
        <button className="repo-back" onClick={onBack}>
          <Icon name="arrow-left" size={16} />
          {t('dash.backHome')}
        </button>
        <div className="dash-repo-title">
          <span className="dash-globe-badge"><Icon name="globe" size={22} /></span>
          <div>
            <h1>{t('dash.global')}</h1>
            <p>{t('dash.globalDesc')}</p>
          </div>
        </div>
      </div>

      <section className="dash-section">
        <header className="dash-section-head">
          <h2>{t('dash.publicProjects')}<span className="dash-count">{featured.length}</span></h2>
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
          <h2>{t('dash.availablePeople')}<span className="dash-count">{globalPeople.length}</span></h2>
          <button className="btn btn-outline btn-sm" onClick={onExplore}>{t('dash.viewAll')}</button>
        </header>
        {globalPeople.length === 0 ? (
          <EmptyState title={t('empty.globalPeople')} sub={t('empty.peopleSub')} icon={null} />
        ) : (
          <div className="people-grid">
            {globalPeople.map(u => (
              <PersonCard key={u.id} person={u} me={user} options={null} showCompleted={false} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}