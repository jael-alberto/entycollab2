import { useEffect } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useApp, AppProvider } from './context/AppContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ModalProvider } from './context/ModalManager.jsx';
import { LoggedHeader, PublicHeader } from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import People from './pages/People.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Landing from './pages/Landing.jsx';
import Groups from './pages/Groups.jsx';

function RequireAuth({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user } = useApp();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  const { user, lang } = useApp();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const logged = !!user;

  const { pathname } = useLocation();
  const isAuthPage = ['/login', '/register'].includes(pathname);
  const isLandingPage = pathname === '/';

  return (
    <>
      <ScrollToTop />
      {!isAuthPage && !isLandingPage && (logged ? <LoggedHeader /> : <PublicHeader />)}
      <main className={isAuthPage ? 'auth-main' : isLandingPage ? 'landing-main' : 'content-wrapper'}>
        <Routes>
          <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
          <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/proyectos/*" element={<RequireAuth><Projects /></RequireAuth>} />
          <Route path="/personas" element={<RequireAuth><People /></RequireAuth>} />
          <Route path="/grupos/:groupId?" element={<RequireAuth><Groups /></RequireAuth>} />
          <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/ajustes" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to={logged ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </main>
      {!isAuthPage && !isLandingPage && <Footer />}
    </>
  );
}

function AppRoot() {
  return (
    <ToastProvider>
      <AppProvider>
        <ModalProvider>
          <App />
        </ModalProvider>
      </AppProvider>
    </ToastProvider>
  );
}

export default AppRoot;
