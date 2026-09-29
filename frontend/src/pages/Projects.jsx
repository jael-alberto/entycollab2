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
  const { user, projects, applications, lang, t, selectedCategories, selectedTechFilters } = useApp();
  const { openCreate, openCategoryFilter, openTechFilter } = useModals();
  const [search, setSearch] = useState('');

  const enrolled = useMemo(() => {
    const accepted = applications.filter(a => a.userId === user.id && a.status === 'accepted');
    return accepted
      .map(a => projects.find(p => p.id === a.projectId))
      .filter(Boolean)
      .filter(p => p.status !== 'closed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [applications, projects, user.id]);

  const list = useMemo(() => {
    const myApps = applications.filter(a => a.userId === user.id);
    const appliedIds = new Set(myApps.map(a => a.projectId));

    let out = projects.filter(p =>
      p.status === 'open' &&
      p.ownerId !== user.id &&
      !appliedIds.has(p.id)
    );

    const q = search.toLowerCase();
    if (q) {
      out = out.filter(p =>
        l10nValue(lang, p.title).toLowerCase().includes(q) ||
        l10nValue(lang, p.description).toLowerCase().includes(q) ||
        p.tech.some(tt => tt.toLowerCase().includes(q))
      );
    }
    if (selectedCategories.length > 0) {
      out = out.filter(p => selectedCategories.includes(p.category));
    }
    if (selectedTechFilters.length > 0) {
      out = out.filter(p => (p.tech || []).some(tt => selectedTechFilters.includes(tt)));
    }
    return [...out].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [projects, applications, user, search, selectedCategories, selectedTechFilters]);

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
          <EmptyState icon="🤝" title={t('empty.enrolled')} sub={t('empty.enrolledSub')} />
        ) : (
          <div className="projects-grid">
            {enrolled.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
          </div>
        )}
      </div>

      <div className="section-block">
        <div className="section-header-row">
          <h2 className="section-title">{t('proj.new')}</h2>
          <button className="btn btn-primary" onClick={openCreate}>{t('proj.newBtn')}</button>
        </div>

        <div className="filters-bar">
          <div className="form-group form-group-inline">
            <input type="text" placeholder={t('proj.searchPh')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="form-group form-group-inline">
            <button type="button" className="filters-toggle-btn" onClick={openCategoryFilter}>{catLabel}</button>
          </div>
          <div className="form-group form-group-inline">
            <button type="button" className="filters-toggle-btn" onClick={openTechFilter}>{techLabel}</button>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState icon="🔍" title={t('empty.projects')} sub={t('empty.projectsSub')} />
        ) : (
          <div className="projects-grid">
            {list.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
          </div>
        )}
      </div>
    </>
  );
}

// ==========================================================================
// /proyectos/mis-proyectos
// ==========================================================================
function MyProjects() {
  const { user, projects, t } = useApp();
  const { openCreate } = useModals();

  const mine = useMemo(() => {
    return projects
      .filter(p => p.ownerId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [projects, user.id]);

  return (
    <div className="section-block">
      <div className="section-header-row">
        <h2 className="section-title">{t('myProjects.title')}</h2>
        <button className="btn btn-primary" onClick={openCreate}>{t('proj.newBtn')}</button>
      </div>
      {mine.length === 0 ? (
        <EmptyState icon="📂" title={t('empty.myProjects')} sub={t('empty.myProjectsSub')} />
      ) : (
        <div className="projects-grid">
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
  const { user, users, projects, applications, lang, t, l10n, respondInvite } = useApp();
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const apps = useMemo(() => applications.filter(a => a.userId === user.id), [applications, user.id]);

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
      <h2 className="section-title">{t('myApps.title')}</h2>
      {apps.length === 0 ? (
        <EmptyState icon="📋" title={t('empty.myApps')} sub={t('empty.myAppsSub')} />
      ) : (
        <div className="projects-grid" key={refreshKey}>
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