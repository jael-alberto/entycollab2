import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';

export default function Login() {
  const { t, login } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const user = login(email.trim().toLowerCase(), password);
    if (!user) {
      showToast(t('toast.loginError'), 'error');
      return;
    }
    showToast(t('toast.welcome', { name: user.name }), 'success');
    navigate('/dashboard');
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2 className="auth-title">{t('login.title')}</h2>
        <p className="auth-subtitle">{t('login.subtitle')}</p>

        {/* Social buttons */}
        <div className="auth-socials">
          <button type="button" className="auth-social-btn" id="login-google-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{t('auth.google')}</span>
          </button>
          <button type="button" className="auth-social-btn" id="login-apple-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.32.07 2.24.72 3.01.74.9-.13 1.77-.81 3.07-.9 1.36.07 2.38.52 3.06 1.33-2.63 1.56-2.22 5.08.71 6.03-.61 1.59-1.44 3.08-2.85 5.68zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span>{t('auth.apple')}</span>
          </button>
        </div>

        <div className="auth-divider"><span>{t('auth.or')}</span></div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="login-email">{t('login.email')}</label>
            <input type="email" id="login-email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.emailPh')} />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">{t('login.password')}</label>
            <input type="password" id="login-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder={t('auth.passwordPh')} />
          </div>
          <button type="submit" className="btn btn-primary btn-full" id="login-submit-btn">{t('login.submit')}</button>
        </form>
        <p className="auth-switch">
          <span>{t('login.switch')}</span> <Link to="/register">{t('login.switchLink')}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}