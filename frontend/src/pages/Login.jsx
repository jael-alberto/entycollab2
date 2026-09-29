import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

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
    <div className="auth-card">
      <h2 className="auth-title">{t('login.title')}</h2>
      <p className="auth-subtitle">{t('login.subtitle')}</p>
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="login-email">{t('login.email')}</label>
          <input type="email" id="login-email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">{t('login.password')}</label>
          <input type="password" id="login-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button type="submit" className="btn btn-primary btn-full">{t('login.submit')}</button>
      </form>
      <p className="auth-switch">
        <span>{t('login.switch')}</span> <Link to="/register">{t('login.switchLink')}</Link>
      </p>
    </div>
  );
}