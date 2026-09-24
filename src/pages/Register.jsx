import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Register() {
  const { t, register } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const res = register({
      name: name.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      bio: bio.trim()
    });
    if (res === 'email') {
      showToast(t('toast.accountExists'), 'error');
      return;
    }
    if (res === 'username') {
      showToast(t('toast.usernameTaken'), 'error');
      return;
    }
    showToast(t('toast.accountCreated'), 'success');
    navigate('/dashboard');
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">{t('register.title')}</h2>
      <p className="auth-subtitle">{t('register.subtitle')}</p>
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reg-name">{t('register.name')}</label>
            <input type="text" id="reg-name" required value={name} onChange={e => setName(e.target.value)} placeholder={t('register.namePh')} />
          </div>
          <div className="form-group">
            <label htmlFor="reg-username">{t('register.username')}</label>
            <input type="text" id="reg-username" required value={username} onChange={e => setUsername(e.target.value)} placeholder={t('register.usernamePh')} pattern="^[a-zA-Z0-9_]+$" />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="reg-email">{t('login.email')}</label>
          <input type="email" id="reg-email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
        </div>
        <div className="form-group">
          <label htmlFor="reg-password">{t('login.password')}</label>
          <input type="password" id="reg-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder={t('register.passwordPh')} minLength="6" />
        </div>
        <div className="form-group">
          <label htmlFor="reg-skills">{t('register.skills')}</label>
          <input type="text" id="reg-skills" value={skills} onChange={e => setSkills(e.target.value)} placeholder="JavaScript, Python, React, Node.js" required />
        </div>
        <div className="form-group">
          <label htmlFor="reg-bio">{t('register.bio')}</label>
          <textarea id="reg-bio" rows="3" value={bio} onChange={e => setBio(e.target.value)} placeholder={t('register.bioPh')} required></textarea>
        </div>
        <button type="submit" className="btn btn-primary btn-full">{t('register.submit')}</button>
      </form>
      <p className="auth-switch">
        <span>{t('register.switch')}</span> <Link to="/login">{t('register.switchLink')}</Link>
      </p>
    </div>
  );
}