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
  const [view, setView] = useState('welcome');

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

  const handleGlobalClick = () => {
    selectGroup(null);
    setView('global');
  };

  const handleExploreClick = () => {
    selectGroup(null);
    navigate('/grupos');
  };

  if (view === 'global') {
    const featured = useMemo(() => {
      return [...projects]
        .filter(p => !p.groupId)
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

    return (
      <div>
        <div className="dashboard-header-with-back">
          <button className="btn btn-ghost btn-sm" onClick={() => setView('welcome')}>
            ← {t('dash.yourGroups')}
          </button>
          <div>
            <h2 className="section-title">{t('dash.global')}</h2>
            <p className="form-hint">{t('dash.globalDesc')}</p>
          </div>
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
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <img src="/img/logo-pg.png" alt="ENTYCOLLAB" className="sidebar-logo" />
          <h2>{t('dash.yourGroups')}</h2>
        </div>

        <div className="sidebar-search">
          <input
            type="text"
            className="group-search-input"
            placeholder={t('dash.searchGroups')}
            value={groupSearch}
            onChange={e => setGroupSearch(e.target.value)}
          />
        </div>

        <div className="sidebar-section">
          <button
            className={`sidebar-item global-item ${activeGroup ? '' : 'active'}`}
            onClick={handleGlobalClick}
          >
            <span className="sidebar-item-icon">🌐</span>
            <span>{t('dash.global')}</span>
          </button>
        </div>

        {myGroups.length === 0 ? (
          <div className="sidebar-empty">
            <p>{t('dash.noGroups')}</p>
            <button className="btn btn-primary btn-sm" onClick={handleExploreClick}>
              {t('dash.exploreGroups')}
            </button>
          </div>
        ) : (
          <div className="sidebar-groups">
            {filteredGroups.map(group => {
              const membership = group.members?.find(m => m.userId === user.id);
              const isActive = activeGroup?.id === group.id;
              return (
                <button
                  key={group.id}
                  className={`sidebar-item group-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleGroupClick(group.id)}
                >
                  <div className="sidebar-group-info">
                    <span className="sidebar-item-icon">👥</span>
                    <div>
                      <strong>{group.name}</strong>
                      <small>{group.members?.length || 0} miembros · {projects.filter(p => p.groupId === group.id).length} proyectos</small>
                    </div>
                  </div>
                  <span className={`sidebar-role ${membership?.role === 'owner' ? 'owner' : membership?.role === 'admin' ? 'admin' : 'member'}`}>
                    {membership?.role === 'owner' ? t('group.roleOwner') : membership?.role === 'admin' ? t('group.roleAdmin') : t('group.roleMember')}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {otherGroups.length > 0 && (
          <div className="sidebar-section">
            <h4 className="sidebar-section-title">{t('dash.exploreGroups')}</h4>
            <div className="sidebar-other-groups">
              {otherGroups.slice(0, 4).map(group => {
                const isPending = group.requests?.some(r => r.userId === user.id && r.status === 'pending');
                const isMember = group.members?.some(m => m.userId === user.id);
                return (
                  <button
                    key={group.id}
                    className="sidebar-item other-group-item"
                    disabled={isPending || isMember}
                    onClick={() => { selectGroup(group.id); navigate(`/grupos/${group.id}`); }}
                  >
                    <div className="sidebar-group-info">
                      <span className="sidebar-item-icon">👥</span>
                      <div>
                        <strong>{group.name}</strong>
                        <small>{group.members?.length || 0} miembros</small>
                      </div>
                    </div>
                    <span className="sidebar-badge">
                      {isPending ? 'Pendiente' : isMember ? 'Miembro' : t('dash.requestAccess')}
                    </span>
                  </button>
                );
              })}
              {otherGroups.length > 4 && (
                <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleExploreClick}>
                  Ver todos ({otherGroups.length})
                </button>
              )}
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleExploreClick}>
            + {t('dash.exploreGroups')}
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="welcome-content">
          <div className="welcome-hero">
            <h1>{t('dash.hello', { name: user.name.split(' ')[0] })}</h1>
            <p>{t('dash.sub')}</p>
          </div>

          <div className="welcome-stats">
            <div className="stat-card">
              <span className="stat-value">{myGroups.length}</span>
              <span className="stat-label">Grupos</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{projects.filter(p => p.ownerId === user.id).length}</span>
              <span className="stat-label">Proyectos creados</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{applications.filter(a => a.userId === user.id && a.status === 'accepted').length}</span>
              <span className="stat-label">Colaboraciones</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{availableUsers(users).length}</span>
              <span className="stat-label">Disponibles</span>
            </div>
          </div>

          <div className="welcome-recent">
            <h3>Proyectos recientes</h3>
            <p className="form-hint">Selecciona un grupo o "Global" en la barra lateral para ver proyectos y personas.</p>
          </div>
        </div>
      </main>
    </div>
  );
}