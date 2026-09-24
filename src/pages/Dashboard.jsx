import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { EmptyState } from '../components/common.jsx';
import { scoreProject } from '../lib/helpers.js';

export default function Dashboard() {
  const { user, projects, applications, users, ratings, t } = useApp();

  const featured = useMemo(() => {
    return [...projects]
      .sort((a, b) => scoreProject(b, projects, applications, users, ratings) - scoreProject(a, projects, applications, users, ratings))
      .slice(0, 6);
  }, [projects, applications, users, ratings]);

  const recent = useMemo(() => {
    return projects
      .filter(p => p.status === 'open')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);
  }, [projects]);

  return (
    <>
      <div className="section-block home-hero">
        <h2 className="home-hero-title">{t('dash.hello', { name: user.name.split(' ')[0] })}</h2>
        <p className="home-hero-sub">{t('dash.sub')}</p>
      </div>

      <div className="section-block">
        <div className="section-header-row">
          <h2 className="section-title">{t('dash.featured')}</h2>
          <Link to="/proyectos" className="btn btn-primary">{t('dash.viewAll')}</Link>
        </div>
        {featured.length === 0 ? (
          <EmptyState icon="📦" title={t('empty.dashboard')} sub={t('empty.dashboardSub')} />
        ) : (
          <div className="projects-grid">
            {featured.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
          </div>
        )}
      </div>

      <div className="section-block">
        <h2 className="section-title">{t('dash.recent')}</h2>
        {recent.length === 0 ? (
          <EmptyState icon="🕐" title={t('empty.recent')} />
        ) : (
          <div className="projects-grid">
            {recent.map(p => <ProjectCard key={p.id} project={p} currentUser={user} />)}
          </div>
        )}
      </div>
    </>
  );
}