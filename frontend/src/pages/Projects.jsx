import { useMemo, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { EmptyState } from '../components/common.jsx';
import { availableCategoriesList } from '../lib/filters.js';
import { getStatusLabel, escapeHTML } from '../lib/helpers.js';
import { l10nValue } from '../lib/i18n.js';

const PAGE_SIZE = 12;

// Píldoras de estado con el vocabulario del producto.
const STATUS_TABS = [
  { value: 'all', labelKey: 'proj.filterAll' },
  { value: 'open', labelKey: 'proj.filterRecruiting' },
  { value: 'in-progress', labelKey: 'proj.filterDeveloping' },
  { value: 'completed', labelKey: 'proj.filterFinished' }
];

const SORTS = [
  { value: 'recent', labelKey: 'proj.sortRecent' },
  { value: 'deadline', labelKey: 'proj.sortDeadline' },
  { value: 'rating', labelKey: 'proj.sortRating' }
];

export default function Projects() {
  return (
    <Routes>
      <Route path="" element={<NewProjects />} />
      <Route path="mis-proyectos" element={<MyProjects />} />
      <Route path="postulaciones" element={<MyApplications />} />
    </Routes>
  );
}

// ==========================================================================
// /proyectos — Nuevos proyectos (con filtros) + proyectos en los que participo
// ==========================================================================
function NewProjects() {
  const { user, projects, applications, lang, t, selectedCategories, setSelectedCategories, selectedTechFilters, setSelectedTechFilters, activeGroup, isActiveGroupAdmin, ratings } = useApp();
  const { openCreate, openCategoryFilter, openTechFilter } = useModals();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);

  const enrolled = useMemo(() => {
    const accepted = applications.filter(a => a.userId === user.id && a.status === 'accepted');
    return accepted
      .map(a => projects.find(p => p.id === a.projectId))
      .filter(Boolean)
      .filter(p => activeGroup ? p.groupId === activeGroup.id : !p.groupId)
      .filter(p => p.status !== 'closed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [applications, projects, user.id, activeGroup]);

  const filtered = useMemo(() => {
    const myApps = applications.filter(a => a.userId === user.id);
    const appliedIds = new Set(myApps.map(a => a.projectId));

    let out = projects.filter(p =>
      p.status === 'open' &&
      p.ownerId !== user.id &&
      !appliedIds.has(p.id) &&
      (activeGroup ? p.groupId === activeGroup.id : !p.groupId)
    );

    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(p =>
        l10nValue(lang, p.title).toLowerCase().includes(q) ||
        l10nValue(lang, p.description).toLowerCase().includes(q) ||
        (p.tech || []).some(tt => tt.toLowerCase().includes(q))
      );
    }
    if (selectedCategories.length > 0) {
      out = out.filter(p => selectedCategories.includes(p.category));
    }
    if (selectedTechFilters.length > 0) {
      out = out.filter(p => (p.tech || []).some(tt => selectedTechFilters.includes(tt)));
    }
    if (status !== 'all') {
      out = out.filter(p => p.status === status);
    }
    const sorted = [...out];
    if (sort === 'deadline') {
      sorted.sort((a, b) => {
        if (!a.deadline && !b.deadline) return new Date(b.createdAt) - new Date(a.createdAt);
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    } else if (sort === 'rating') {
      sorted.sort((a, b) => {
        const ra = avgOwner(a);
        const rb = avgOwner(b);
        return rb - ra || new Date(b.createdAt) - new Date(a.createdAt);
      });
    } else {
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return sorted;

    function avgOwner(p) {
      const list = ratings.filter(r => r.ratedUserId === p.ownerId);
      if (list.length === 0) return 0;
      return list.reduce((s, r) => s + r.stars, 0) / list.length;
    }
  }, [projects, applications, user, search, selectedCategories, selectedTechFilters, lang, activeGroup, status, sort, ratings]);

  // Vuelve a la primera página cada vez que cambia algún filtro
  // (ajuste en fase de render, sin efecto en cascada).
  const filterSig = JSON.stringify([search, status, sort, selectedCategories, selectedTechFilters, activeGroup?.id]);
  const [prevSig, setPrevSig] = useState(filterSig);
  if (prevSig !== filterSig) {
    setPrevSig(filterSig);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters = search.trim() !== '' || status !== 'all' || selectedCategories.length > 0 || selectedTechFilters.length > 0;

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setSort('recent');
    setSelectedCategories([]);
    setSelectedTechFilters([]);
    setPage(1);
  };

  const catLabel = useMemo(() => {
    if (selectedCategories.length === 0) return t('filter.allCat');
    if (selectedCategories.length === 1) {
      const opt = availableCategoriesList(projects, lang).find(o => o.value === selectedCategories[0]);
      return opt ? opt.label : selectedCategories[0];
    }
    return t('filter.catsCount', { n: selectedCategories.length });
  }, [selectedCategories, projects, lang, t]);

  const techLabel = useMemo(() => {
    if (selectedTechFilters.length === 0) return t('filter.allTech');
    if (selectedTechFilters.length === 1) return selectedTechFilters[0];
    return t('filter.techsCount', { n: selectedTechFilters.length });
  }, [selectedTechFilters, t]);

  return (
    <>
      <div className="section-block">
        <div className="section-header-row">
          <h2 className="section-title">{t('proj.mine')}</h2>
        </div>
        {enrolled.length === 0 ? (
          <EmptyState icon="users" title={t('empty.enrolled')} sub={t('empty.enrolledSub')} />
        ) : (
          <div className="projects-grid projects-grid-dense">
            {enrolled.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
          </div>
        )}
      </div>

      <div className="section-block">
        <div className="section-header-row">
          <div><h2 className="section-title">{activeGroup ? `Proyectos de ${activeGroup.name}` : t('proj.new')}</h2>{activeGroup && <p className="form-hint">Solo los administradores del grupo pueden crear proyectos aquí.</p>}</div>
          {(!activeGroup || isActiveGroupAdmin) && <button className="btn btn-primary" onClick={openCreate}>{t('proj.newBtn')}</button>}
        </div>

        <div className="proj-toolbar" role="search">
          <label className="proj-search">
            <span className="proj-search-icon" aria-hidden="true">⌕</span>
            <input type="text" placeholder={t('proj.searchPh')} value={search} onChange={e => setSearch(e.target.value)} aria-label={t('proj.searchPh')} />
            {search && <button type="button" className="proj-search-clear" onClick={() => setSearch('')} aria-label="×">×</button>}
          </label>
          <div className="group-filter-pills proj-status-pills" role="tablist" aria-label={t('proj.new')}>
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={status === tab.value}
                className={`group-filter-pill${status === tab.value ? ' active' : ''}`}
                onClick={() => setStatus(tab.value)}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
          <label className="proj-sort">
            <span>{t('proj.sortLabel')}</span>
            <select value={sort} onChange={e => setSort(e.target.value)} aria-label={t('proj.sortLabel')}>
              {SORTS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
            </select>
          </label>
        </div>

        <div className="filters-bar">
          <div className="form-group form-group-inline">
            <button type="button" className="filters-toggle-btn" onClick={openCategoryFilter}>{catLabel}</button>
          </div>
          <div className="form-group form-group-inline">
            <button type="button" className="filters-toggle-btn" onClick={openTechFilter}>{techLabel}</button>
          </div>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>{t('proj.clearFilters')}</button>
          )}
          <span className="proj-count" aria-live="polite">{t('proj.results', { n: filtered.length })}</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title={t('empty.projects')}
            sub={t('empty.projectsSub')}
            action={hasFilters
              ? <button className="btn btn-outline btn-sm" onClick={clearFilters}>{t('proj.clearFilters')}</button>
              : ((!activeGroup || isActiveGroupAdmin) && <button className="btn btn-primary btn-sm" onClick={openCreate}>{t('proj.publish')}</button>)}
          />
        ) : (
          <>
            <div className="projects-grid projects-grid-dense">
              {paged.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
            </div>
            {totalPages > 1 && (
              <nav className="proj-pagination" aria-label={t('proj.sortLabel')}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  ←
                </button>
                <span className="proj-page-label">{t('proj.pageOf', { page: safePage, total: totalPages })}</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  →
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ==========================================================================
// /proyectos/mis-proyectos
// ==========================================================================
function MyProjects() {
  const { user, projects, t, activeGroup, isActiveGroupAdmin } = useApp();
  const { openCreate } = useModals();

  const mine = useMemo(() => {
    return projects
      .filter(p => p.ownerId === user.id && (activeGroup ? p.groupId === activeGroup.id : !p.groupId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [projects, user.id, activeGroup]);

  return (
    <div className="section-block">
      <div className="section-header-row">
        <h2 className="section-title">{activeGroup ? `Mis proyectos · ${activeGroup.name}` : t('myProjects.title')}</h2>
        {(!activeGroup || isActiveGroupAdmin) && <button className="btn btn-primary" onClick={openCreate}>{t('proj.newBtn')}</button>}
      </div>
      {mine.length === 0 ? (
        <EmptyState
          icon="folder"
          title={t('empty.myProjects')}
          sub={t('empty.myProjectsSub')}
          action={(!activeGroup || isActiveGroupAdmin) && <button className="btn btn-primary btn-sm" onClick={openCreate}>{t('proj.publish')}</button>}
        />
      ) : (
        <div className="projects-grid projects-grid-dense">
          {mine.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// /proyectos/postulaciones
// ==========================================================================
function MyApplications() {
  const { user, users, projects, applications, groups, lang, t, l10n, respondInvite, activeGroup, selectGroup } = useApp();
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const myGroups = useMemo(
    () => groups.filter(g => g.members?.some(m => m.userId === user.id)),
    [groups, user.id]
  );

  const apps = useMemo(() => {
    return applications
      .filter(a => a.userId === user.id)
      .filter(a => {
        const project = projects.find(p => p.id === a.projectId);
        if (!project) return false;
        return activeGroup ? project.groupId === activeGroup.id : !project.groupId;
      });
  }, [applications, projects, user.id, activeGroup]);

  const handleInvite = (appId, action) => {
    const res = respondInvite(appId, action);
    if (res === 'slotsFull') {
      showToast(t('invite.slotsFull'), 'error');
      return;
    }
    setRefreshKey(k => k + 1);
    showToast(
      action === 'accepted' ? t('myApps.joined') : t('myApps.inviteRejected'),
      action === 'accepted' ? 'success' : 'info'
    );
  };

  return (
    <div className="section-block">
      <div className="section-header-row">
        <h2 className="section-title">
          {activeGroup ? `${t('myApps.group')}: ${activeGroup.name}` : t('dash.global')}
        </h2>
        <div className="group-filter-pills" role="tablist" aria-label={t('myApps.title')}>
          <button
            type="button"
            className={`group-filter-pill${!activeGroup ? ' active' : ''}`}
            role="tab"
            aria-selected={!activeGroup}
            onClick={() => selectGroup(null)}
          >
            {t('dash.global')}
          </button>
          {myGroups.map(g => (
            <button
              key={g.id}
              type="button"
              className={`group-filter-pill${activeGroup?.id === g.id ? ' active' : ''}`}
              role="tab"
              aria-selected={activeGroup?.id === g.id}
              onClick={() => selectGroup(g.id)}
            >
              {escapeHTML(g.name)}
            </button>
          ))}
        </div>
      </div>
      {apps.length === 0 ? (
        <EmptyState icon="inbox" title={t('empty.myApps')} sub={t('empty.myAppsSub')} />
      ) : (
        <div className="projects-grid projects-grid-dense" key={refreshKey}>
          {apps.map(a => {
            const project = projects.find(p => p.id === a.projectId);
            if (!project) return null;

            if (a.invitedBy) {
              const owner = users.find(u => u.id === a.invitedBy);
              const status = project.status;
              const pending = a.status === 'pending';
              return (
                <div className="invite-row" key={a.id} style={{ gridColumn: '1 / -1' }}>
                  <div className="invite-info">
                    <span className="invite-project-title">{escapeHTML(l10n(project.title))}</span>
                    <span className="invite-from">
                      {owner
                        ? t('myApps.inviteFrom', { name: escapeHTML(owner.name), username: escapeHTML(owner.username) })
                        : t('myApps.inviteFromUser')}
                    </span>
                    {a.message && <span className="invite-message">&quot;{escapeHTML(a.message)}&quot;</span>}
                    <span className="invite-status-line">
                      <span className={`project-status status-${status}`}>{getStatusLabel(lang, status)}</span>
                      {a.status === 'accepted'
                        ? <span className="project-status status-in-progress">{t('myApps.accepted')}</span>
                        : a.status === 'rejected'
                          ? <span className="project-status status-closed">{t('myApps.rejected')}</span>
                          : <span className="project-status status-open">{t('myApps.pending')}</span>}
                    </span>
                  </div>
                  {pending && (
                    <div className="invite-actions">
                      <button className="btn btn-success btn-sm" onClick={() => handleInvite(a.id, 'accepted')}>{t('myApps.acceptInvite')}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleInvite(a.id, 'rejected')}>{t('myApps.decline')}</button>
                    </div>
                  )}
                </div>
              );
            }

            const fakeUser = { id: user.id };
            return <ProjectCard key={a.id} project={project} currentUser={fakeUser} />;
          })}
        </div>
      )}
    </div>
  );
}
