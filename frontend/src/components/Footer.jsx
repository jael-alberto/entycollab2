import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Modal } from '../components/common.jsx';
import { LegalContent } from '../pages/Legal.jsx';

export default function Footer() {
  const { t } = useApp();
  const [legal, setLegal] = useState(null);

  const openLegal = (section) => (e) => {
    e.preventDefault();
    setLegal(section);
  };

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h2>ENTYCOLLAB</h2>
          <p>{t('footer.desc')}</p>
        </div>
        <div className="footer-contact">
          <h3>{t('footer.contact')}</h3>
          <a href="mailto:info@entycollab.com">info@entycollab.com</a>
          <a href="https://github.com/entycollab" target="_blank" rel="noreferrer">github.com/entycollab</a>
        </div>
        <nav className="footer-legal" aria-label={`${t('footer.privacy')} · ${t('footer.terms')}`}>
          <a href="/legal/privacidad" onClick={openLegal('privacy')}>{t('footer.privacy')}</a>
          <span aria-hidden="true"> · </span>
          <a href="/legal/terminos" onClick={openLegal('terms')}>{t('footer.terms')}</a>
        </nav>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 ENTYCOLLAB. <span>{t('footer.rights')}</span></p>
      </div>
      <Modal open={!!legal} onClose={() => setLegal(null)} title={legal === 'terms' ? t('auth.terms') : t('auth.privacy')}>
        <LegalContent section={legal} />
      </Modal>
    </footer>
  );
}
