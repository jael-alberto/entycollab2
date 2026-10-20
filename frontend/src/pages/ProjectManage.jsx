import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import ProjectDetailView from '../components/ProjectDetailView.jsx';
import { EmptyState } from '../components/common.jsx';

// ==========================================================================
// /proyectos/:projectId/gestionar
// Página de gestión de un proyecto: la misma vista del detalle, pero como
// página, con toda la información y las acciones del dueño a la vista.
// ==========================================================================
export default function ProjectManage() {
  const { projectId } = useParams();
  const { projects, t } = useApp();
  const navigate = useNavigate();

  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return (
      <div className="section-block">
        <div className="manage-head">
          <button className="manage-back" onClick={() => navigate('/proyectos/mis-proyectos')}>← {t('manage.back')}</button>
        </div>
        <EmptyState icon="folder" title={t('manage.notFound')} sub={t('manage.notFoundSub')} />
      </div>
    );
  }

  return (
    <div className="section-block manage-page">
      <div className="manage-head">
        <button className="manage-back" onClick={() => navigate('/proyectos/mis-proyectos')}>← {t('manage.back')}</button>
        <h2 className="section-title">{t('manage.title')}</h2>
      </div>
      <ProjectDetailView project={project} />
    </div>
  );
}
