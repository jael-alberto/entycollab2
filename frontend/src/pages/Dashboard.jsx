import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import PersonCard from '../components/PersonCard.jsx';
import { EmptyState } from '../components/common.jsx';
import { scoreProject } from '../lib/helpers.js';

const availableUsers = (users) => users.filter(u => u.available === true);

export default function Dashboard() {
  const { user, projects, applications, users, ratings, groups, t, selectGroup, activeGroup } = useApp();
  const navigate = useNavigate();
  const [groupSearch, setGroupSearch] = useState('');

  const featured = useMemo(() => {
    return [...projects]
      .sort((a, b) => scoreProject(b, projects, applications, users, ratings) - scoreProject(a, projects, applications, users, ratings))
      .slice(0, 6);
  }, [projects, applications, users, ratings]);

  const recentProjects = useMemo(() => {
    return projects
      .filter(p => p.status === 'open' && !p.groupId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);
  }, [projects]);

  const globalPeople = useMemo(() => {
    return availableUsers(users)
      .filter(u => u.id !== user.id)
      .sort((a, b) => (b.skills?.length || 0) - (a.skills?.length || 0))
      .slice(0, 6);
  }, [users, user.id]);

  const myGroups = useMemo(() => {
    return groups.filter(g => g.members?.some(m => m.userId === user.id));
  }, [groups, user.id]);

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return myGroups;
    const q = groupSearch.toLowerCase();
    return myGroups.filter(g => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
  }, [myGroups, groupSearch]);

  const otherGroups = useMemo(() => {
    return groups.filter(g => !g.members?.some(m => m.userId === user.id));
  }, [groups, user.id]);

  const handleGroupClick = (groupId) => {
    selectGroup(groupId);
    navigate(`/grupos/${groupId}`);
  };

  const handleExploreClick = () => {
    selectGroup(null);
    navigate('/grupos');
  };

  return (
    <>
      <div className="section-block home-hero">
        <h2 className="home-hero-title">{t('dash.hello', { name: user.name.split(' ')[0] })}</h2>
        <p className="home-hero-sub">{t('dash.sub')}</p>
      </div>

      <div className="section-block">
        <div className="section-header-row">
          <h2 className="section-title">{t('dash.global')}</h2>
          <p className="form-hint" style={{ margin: 0 }}>{t('dash.globalDesc')}</p>
        </div>

        <div className="dashboard-global-section">
          <div className="dashboard-global-projects">
            <h3>{t('dash.featured')}</h3>
            {featured.length === 0 ? (
              <EmptyState icon="📦" title={t('empty.globalProjects')} sub={t('empty.dashboardSub')} />
            ) : (
              <div className="projects-grid">
                {featured.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
              </div>
            )}
          </div>

          <div className="dashboard-global-people">
            <h3>{t('nav.people')}</h3>
            {globalPeople.length === 0 ? (
              <EmptyState icon="👥" title={t('empty.globalPeople')} sub={t('empty.peopleSub')} />
            ) : (
              <div className="people-grid">
                {globalPeople.map(u => (
                  <PersonCard key={u.id} person={u} me={user} options={null} showCompleted={false} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-header-row">
          <h2 className="section-title">{t('dash.yourGroups')}</h2>
          {filteredGroups.length > 0 && (
            <input
              type="text"
              className="group-search-input"
              placeholder={t('dash.searchGroups')}
              value={groupSearch}
              onChange={e => setGroupSearch(e.target.value)}
              style={{ maxWidth: '280px' }}
            />
          )}
        </div>

        {myGroups.length === 0 ? (
          <div className="dashboard-empty-groups">
            <EmptyState icon="👥" title={t('dash.noGroups')} sub={t('dash.exploreGroups')} />
            <button className="btn btn-primary" onClick={handleExploreClick}>{t('dash.exploreGroups')}</button>
          </div>
        ) : (
          <div className="groups-grid">
            {filteredGroups.map(group => {
              const membership = group.members?.find(m => m.userId === user.id);
              const roleLabel = membership?.role === 'owner' ? t('group.roleOwner') : membership?.role === 'admin' ? t('group.roleAdmin') : t('group.roleMember');
              const roleClass = membership?.role === 'owner' ? 'role-owner' : membership?.role === 'admin' ? 'role-admin' : 'role-member';
              const projectCount = projects.filter(p => p.groupId === group.id).length;
              const memberCount = group.members?.length || 0;

              return (
                <article className="group-card dashboard-group-card" key={group.id} onClick={() => handleGroupClick(group.id)}>
                  <div className="group-card-header">
                    <div className="group-card-icon">👥</div>
                    <div className="group-card-info">
                      <h3>{group.name}</h3>
                      <p>{group.description}</p>
                    </div>
                    <span className={`group-role-badge ${roleClass}`}>{roleLabel}</span>
                  </div>
                  <div className="group-card-meta">
                    <span>{projectCount} {projectCount === 1 ? 'proyecto' : 'proyectos'}</span>
                    <span>{memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}</span>
                  </div>
                  <button className="btn btn-primary btn-sm group-enter-btn" onClick={e => { e.stopPropagation(); handleGroupClick(group.id); }}>
                    {t('dash.joinGroup')}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {otherGroups.length > 0 && (
          <div className="dashboard-other-groups">
            <h3 style={{ margin: '1.5rem 0 0.75rem', fontSize: '0.95rem', color: 'var(--color-text-dim)' }}>{t('dash.exploreGroups')}</h3>
            <div className="groups-grid">
              {otherGroups.slice(0, 4).map(group => {
                const memberCount = group.members?.length || 0;
                const projectCount = projects.filter(p => p.groupId === group.id).length;
                const isPending = group.requests?.some(r => r.userId === user.id && r.status === 'pending');
                const isMember = group.members?.some(m => m.userId === user.id);

                return (
                  <article className="group-card" key={group.id}>
                    <div className="group-card-header">
                      <div className="group-card-icon">👥</div>
                      <div className="group-card-info">
                        <h3>{group.name}</h3>
                        <p>{group.description}</p>
                      </div>
                    </div>
                    <div className="group-card-meta">
                      <span>{projectCount} {projectCount === 1 ? 'proyecto' : 'proyectos'}</span>
                      <span>{memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}</span>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm group-enter-btn"
                      disabled={isPending || isMember}
                      onClick={e => { e.stopPropagation(); selectGroup(group.id); navigate(`/grupos/${group.id}`); }}
                    >
                      {isPending ? 'Solicitud pendiente' : isMember ? 'Ya eres miembro' : t('dash.requestAccess')}
                    </button>
                  </article>
                );
              })}
              {otherGroups.length > 4 && (
                <button className="btn btn-outline group-enter-btn" style={{ gridColumn: '1 / -1' }} onClick={handleExploreClick}>
                  {t('dash.exploreGroups')} ({otherGroups.length})
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      <div className="section-block">
        <div className="section-header-row">
          <h2 className="section-title">{t('dash.recentActivity')}</h2>
          <Link to="/proyectos" className="btn btn-primary">{t('dash.viewAll')}</Link>
        </div>
        {recentProjects.length === 0 ? (
          <EmptyState icon="🕐" title={t('empty.recent')} />
        ) : (
          <div className="projects-grid">
            {recentProjects.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
          </div>
        )}
      </div>
    </>
  );
}