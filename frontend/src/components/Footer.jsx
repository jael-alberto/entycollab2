import { useApp } from '../context/AppContext.jsx';

export default function Footer() {
  const { t } = useApp();
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h2>ENTYCOLLAB</h2>
          <p>{t('footer.desc')}</p>
        </div>
        <div className="footer-contact">
          <h3>{t('footer.contact')}</h3>
          <p>info@entycollab.com</p>
          <p>github.com/entycollab</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 ENTYCOLLAB. <span>{t('footer.rights')}</span></p>
      </div>
    </footer>
  );
}