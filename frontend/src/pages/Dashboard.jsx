import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import PersonCard from '../components/PersonCard.jsx';
import PeopleDirectory from '../components/PeopleDirectory.jsx';
import { Avatar, EmptyState, Icon } from '../components/common.jsx';
import { scoreProject, escapeHTML, getUserAvgRating } from '../lib/helpers.js';
import { completedProjectsCount } from '../lib/talent.js';
import { l10nValue } from '../lib/i18n.js';

const availableUsers = (users) => users.filter(u => u.available === true);

export default function Dashboard() {
  const { user, projects, applications, users, ratings, groups, lang, t, l10n, selectGroup, activeGroup } = useApp();
  const { openCreate } = useModals();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'global' ? 'global' : 'welcome';

  // Clear any persisted selected-group state when dashboard loads
  useEffect(() => {
    selectGroup(null);
  }, [selectGroup]);

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

  const filteredMine = useMemo(() => myGroups.filter(matchGroup), [myGroups, groupSearch, matchGroup]);
  const filteredOther = useMemo(() => otherGroups.filter(matchGroup), [otherGroups, groupSearch, matchGroup]);

  const openGroup = (groupId) => {
    // Solo se activa como grupo de trabajo si el usuario es miembro; los
    // grupos públicos de los que no forma parte se abren en modo vista previa.
    const group = groups.find(g => g.id === groupId);
    if (group?.members?.some(m => m.userId === user.id)) selectGroup(groupId);
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

  const exploreProjects = () => {
    navigate('/proyectos');
  };

  return (
    <div className="dashboard-layout">
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
                <p className="dash-hero-eyebrow">{t('dash.eyebrow')}</p>
                <h1>{t('dash.heroTitle', { name: user.name.split(' ')[0] })}</h1>
                <p className="dash-hero-lead">{t('dash.heroLead')}</p>
              </div>
              <button type="button" className="btn btn-primary dash-hero-cta" onClick={openCreate}>
                <Icon name="plus" size={16} />
                {t('dash.publishCta')}
              </button>
            </section>
            <MyActivity
              user={user}
              projects={projects}
              applications={applications}
              users={users}
              ratings={ratings}
              activeGroup={activeGroup}
              t={t}
              l10n={l10n}
              onCreate={openCreate}
              onExplore={exploreProjects}
            />
          </>
        )}
      </main>
    </div>
  );
}

// ==========================================================================
// Mi actividad: KPIs reales del store + secciones con EmptyState y CTA.
// Sin cifras decorativas: todo sale de projects / applications / ratings.
// ==========================================================================
function MyActivity({ user, projects, applications, users, ratings, activeGroup, t, l10n, onCreate, onExplore }) {
  const scopeGroupId = activeGroup?.id || null;

  const myProjects = useMemo(
    () => projects
      .filter(p => p.ownerId === user.id && (scopeGroupId ? p.groupId === scopeGroupId : !p.groupId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [projects, user.id, scopeGroupId]
  );
  const myProjectIds = useMemo(() => new Set(myProjects.map(p => p.id)), [myProjects]);

  const sentApps = useMemo(
    () => applications.filter(a => {
      if (a.userId !== user.id) return false;
      const p = projects.find(pp => pp.id === a.projectId);
      return p && (scopeGroupId ? p.groupId === scopeGroupId : !p.groupId);
    }).sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0)),
    [applications, projects, user.id, scopeGroupId]
  );
  const pendingSent = useMemo(() => sentApps.filter(a => a.status === 'pending'), [sentApps]);

  const receivedPending = useMemo(
    () => applications.filter(a => a.status === 'pending' && myProjectIds.has(a.projectId)),
    [applications, myProjectIds]
  );

  // Proyectos propios en curso (los que cuentan como "en desarrollo").
  const inDev = useMemo(
    () => myProjects.filter(p => p.status === 'in-progress'),
    [myProjects]
  );

  // Actividad reciente: los movimientos mas recientes de la cuenta.
  const recentActivity = useMemo(() => {
    const items = [];
    sentApps.slice(0, 3).forEach(a => {
      const p = projects.find(pp => pp.id === a.projectId);
      if (!p) return;
      const when = a.appliedAt ? new Date(a.appliedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : null;
      items.push({
        id: `app-${a.id}`,
        text: `${t('dash.activityApplied')} ${l10n(p.title)}${when ? ` · ${when}` : ''}`
      });
    });
    receivedPending.slice(0, 2).forEach(a => {
      const p = projects.find(pp => pp.id === a.projectId);
      if (!p) return;
      items.push({
        id: `rec-${a.id}`,
        text: `${t('dash.activityReceived')} ${l10n(p.title)}`
      });
    });
    return items.slice(0, 4);
  }, [sentApps, receivedPending, projects, t, l10n]);

  const sentProjects = useMemo(
    () => sentApps
      .map(a => projects.find(p => p.id === a.projectId))
      .filter(Boolean)
      .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
      .slice(0, 3),
    [sentApps, projects]
  );

  const avgRating = getUserAvgRating(user.id, ratings);
  const completed = completedProjectsCount(user.id, projects, applications);

  return (
    <>
      <section className="dash-kpis" aria-label={t('dash.summarySub')}>
        <div className="dash-kpi">
          <span className="dash-kpi-label">{t('dash.kpiMyProjects')}</span>
          <span className="dash-kpi-value">{myProjects.length}</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-label">{t('dash.kpiInDev')}</span>
          <span className="dash-kpi-value">{inDev.length}</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-label">{t('dash.kpiPendingApps')}</span>
          <span className="dash-kpi-value">{pendingSent.length}</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-label">{t('dash.kpiRating')}</span>
          <span className="dash-kpi-value">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
        </div>
      </section>
      <div className="dash-body-grid">
        <div className="dash-body-main">
          <section className="dash-section">
            <header className="dash-section-head">
              <h2>{t('dash.myProjectsSec')}<span className="dash-count">{myProjects.length}</span></h2>
              <Link className="btn btn-outline btn-sm" to="/proyectos/mis-proyectos">{t('dash.viewAll')}</Link>
            </header>
            {myProjects.length === 0 ? (
              <EmptyState
                icon="folder"
                title={t('empty.myProjects')}
                sub={t('empty.myProjectsSub')}
                action={<button className="btn btn-primary btn-sm" onClick={onCreate}>{t('dash.publishCta')}</button>}
              />
            ) : (
              <div className="projects-grid projects-grid-dense">
                {myProjects.slice(0, 3).map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
              </div>
            )}
          </section>

          <section className="dash-section">
            <header className="dash-section-head">
              <h2>{t('dash.sentSec')}<span className="dash-count">{sentApps.length}</span></h2>
              <Link className="btn btn-outline btn-sm" to="/proyectos/postulaciones">{t('dash.viewAll')}</Link>
            </header>
            {sentApps.length === 0 ? (
              <EmptyState
                icon="inbox"
                title={t('empty.myApps')}
                sub={t('empty.myAppsSub')}
                action={<button className="btn btn-outline btn-sm" onClick={onExplore}>{t('dash.exploreProjects')}</button>}
              />
            ) : (
              <div className="projects-grid projects-grid-dense">
                {sentProjects.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
              </div>
            )}
          </section>
        </div>

        <aside className="dash-body-side" aria-label={t('dash.sideTitle')}>
          <section className="dash-side-card">
            <h3 className="dash-side-title">{t('dash.profileTitle')}</h3>
            <div className="dash-profile">
              <Avatar user={user} cls="person-avatar person-avatar-card" />
              <div className="dash-profile-id">
                <strong>{escapeHTML(user.name)}</strong>
                <span>@{escapeHTML(user.username)}</span>
              </div>
            </div>
            {/* Rol y valoracion en una sola linea de chips: antes eran dos
                lineas mas y la valoracion repetia la KPI de arriba. */}
            <div className="dash-profile-chips">
              <span className="meta-chip">{user.role || t('profile.roleProgrammer')}</span>
              <span className="meta-chip">
                <Icon name="star" size={13} />
                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
              </span>
            </div>
            <div className="dash-profile-stats">
              <span><b>{completed}</b> {t('profile.statCompleted')}</span>
              <span><b>{(user.skills || []).length}</b> {t('profile.statTech')}</span>
            </div>
            <label className="dash-available">
              <input type="checkbox" checked={user.available === true} readOnly />
              <span>{t('profile.availableToggle')}</span>
            </label>
            <Link className="btn btn-outline btn-block" to="/perfil">{t('person.viewMyProfile')}</Link>
          </section>

          <section className="dash-side-card">
            <h3 className="dash-side-title">{t('dash.activityTitle')}</h3>
            {recentActivity.length === 0 ? (
              <p className="dash-side-empty">{t('dash.activityEmpty')}</p>
            ) : (
              <ul className="dash-activity">
                {recentActivity.map(item => (
                  <li key={item.id}>
                    <span className="dash-activity-dot" aria-hidden="true" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dash-side-card dash-side-community">
            <h3 className="dash-side-title">{t('dash.communityTitle')}</h3>
            <p>{t('dash.communityLead')}</p>
            <Link className="btn btn-ghost btn-sm" to="/grupos">
              {t('dash.communityCta')} <span aria-hidden="true">↗</span>
            </Link>
          </section>
        </aside>
      </div>
    </>
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
              <div className="projects-grid projects-grid-dense">
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
                icon="folder"
                title={t('empty.globalProjects')}
                sub={publicProjects.length === 0 ? t('empty.dashboardSub') : t('empty.projectsSub')}
              />
            ) : (
              <div className="projects-grid projects-grid-dense">
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
