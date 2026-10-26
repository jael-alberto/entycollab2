import { useApp } from '../context/AppContext.jsx';

/**
 * Contenido legal estático (Privacidad + Términos).
 * Se reutiliza en el modal de Auth/Footer y como página completa.
 *
 * PARA EXPONERLA COMO RUTA (no lo hace el Agente E para no tocar Routes):
 * en src/App.jsx, dentro de <Routes>, junto a /login y /register, añadir:
 *   <Route path="/legal" element={<Legal />} />
 * (y `import Legal from './pages/Legal.jsx';` arriba del todo).
 * Los enlaces de AuthLayout/Footer apuntan a /legal/privacidad y
 * /legal/terminos: con la ruta anterior, usa <Legal initialSection="privacy" />
 * o <Legal initialSection="terms" /> en dos rutas hijas según convenga.
 */
export function LegalContent({ section }) {
  const { t } = useApp();
  const showPrivacy = !section || section === 'privacy';
  const showTerms = !section || section === 'terms';
  return (
    <div className="legal-content">
      {showPrivacy && (
        <section aria-labelledby="legal-privacy-title">
          <h3 id="legal-privacy-title">{t('legal.privacyTitle')}</h3>
          <p>{t('legal.privacyBody1')}</p>
          <p>{t('legal.privacyBody2')}</p>
        </section>
      )}
      {showTerms && (
        <section aria-labelledby="legal-terms-title">
          <h3 id="legal-terms-title">{t('legal.termsTitle')}</h3>
          <p>{t('legal.termsBody1')}</p>
          <p>{t('legal.termsBody2')}</p>
        </section>
      )}
    </div>
  );
}

export default function Legal({ initialSection } = {}) {
  const { t } = useApp();
  return (
    <main className="legal-page" id="main-content" tabIndex={-1}>
      <h1>{t('legal.title')}</h1>
      <p className="legal-updated">{t('legal.updated')}</p>
      <LegalContent section={initialSection} />
    </main>
  );
}
