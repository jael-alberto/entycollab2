import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import PeopleDirectory from '../components/PeopleDirectory.jsx';
import { Icon } from '../components/common.jsx';

export default function People() {
  const { t } = useApp();
  const navigate = useNavigate();

  return (
    <div className="people-page">
      <header className="people-hero">
        <div className="people-hero-copy">
          <p className="people-eyebrow">{t('people.eyebrow')}</p>
          <h1 className="people-title">{t('people.title')}</h1>
          <p className="people-lead">{t('people.lead')}</p>
        </div>
        <button
          type="button"
          className="btn btn-outline people-hero-action"
          onClick={() => navigate('/perfil')}
        >
          <Icon name="users" size={16} />
          {t('people.myProfile')}
        </button>
      </header>

      <PeopleDirectory />
    </div>
  );
}
