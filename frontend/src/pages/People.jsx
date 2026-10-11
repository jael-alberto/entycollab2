import { useApp } from '../context/AppContext.jsx';
import PeopleDirectory from '../components/PeopleDirectory.jsx';

export default function People() {
  const { t } = useApp();

  return (
    <div className="section-block people-page">
      <div className="section-header-row">
        <h2 className="section-title">{t('nav.people')}</h2>
      </div>
      <p className="section-subtitle">{t('people.subtitle')}</p>

      <PeopleDirectory />
    </div>
  );
}
