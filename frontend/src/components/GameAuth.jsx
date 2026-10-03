import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ALL_LANGUAGES, DISCIPLINES, FAVORITE_GENRES, GAME_TYPES, disciplineLabel, favoriteGenreLabel, gameTypeLabel } from '../lib/talent.js';

function ChoiceGrid({ items, selected, onChange, label }) {
  return <div className="game-auth-choice-grid" aria-label={label}>{items.map(item => <button type="button" key={item.value || item} className={selected.includes(item.value || item) ? 'selected' : ''} aria-pressed={selected.includes(item.value || item)} onClick={() => onChange(item.value || item)}><i>{selected.includes(item.value || item) ? '✓' : ''}</i>{item.icon && <span>{item.icon}</span>}{item.label || item}</button>)}</div>;
}

export default function GameAuth({ initialMode }) {
  const { login, register } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gameTypes, setGameTypes] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const isRegister = initialMode === 'register';
  const toggle = (setter, selected, value) => setter(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
  const social = () => showToast('La conexión con proveedores sociales estará disponible próximamente.', 'info');

  const continueAccount = event => {
    event.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim() || password.length < 6) return setError('Completa todos los campos. La contraseña debe tener al menos 6 caracteres.');
    setError(''); setStep(2);
  };
  const continueExperience = () => {
    if (!gameTypes.length || !languages.length) return setError('Elige al menos un tipo de juego y un lenguaje.');
    setError(''); setStep(3);
  };
  const submitRegister = () => {
    if (!favoriteGenres.length || !disciplines.length) return setError('Elige al menos un género favorito y una habilidad para aportar.');
    const result = register({ name: name.trim(), username: username.replace(/^@/, '').trim(), email: email.trim().toLowerCase(), password, skills: [...new Set([...languages, ...disciplines.map(value => disciplineLabel('es', value))])], bio: '', gameTypes, favoriteGenres, disciplines, languages });
    if (result === 'email') return setError('Ya existe una cuenta con ese correo.');
    if (result === 'username') return setError('Ese nombre de usuario ya está en uso.');
    showToast(`¡Bienvenido a EntyCollab, @${username.replace(/^@/, '')}!`, 'success');
    navigate('/perfil');
  };
  const submitLogin = event => {
    event.preventDefault();
    const user = login(loginIdentifier.trim(), loginPassword);
    if (!user) return setError('Usuario, correo o contraseña incorrectos.');
    showToast(`¡Sesión iniciada! Bienvenido, @${user.username}.`, 'success');
    navigate('/dashboard');
  };

  return <div className="game-auth-page">
    <header className="game-auth-header"><div className="game-auth-header-inner"><Link className="game-auth-back" to="/">← Volver al inicio</Link><Link className="game-auth-logo" to="/"><span>🎮</span> ENTYTEC<b>OLLAB</b></Link><div className="game-auth-tabs"><Link className={!isRegister ? 'active' : ''} to="/login">Iniciar sesión</Link><Link className={isRegister ? 'active register' : ''} to="/register">Registrarse</Link></div></div></header>
    <main className="game-auth-main">{isRegister ? <section className="game-auth-register"><div className="game-auth-title"><h1>Crear cuenta</h1><p>Únete a la comunidad de desarrolladores de videojuegos.</p></div><div className="game-auth-progress"><div><span>Paso {step} de 3</span><span>{step === 1 ? 'Tu cuenta' : step === 2 ? 'Tu experiencia' : 'Tus preferencias'}</span></div><ol><li className={step >= 1 ? 'active' : ''}/><li className={step >= 2 ? 'active' : ''}/><li className={step >= 3 ? 'active' : ''}/></ol></div>{error && <p className="game-auth-error">{error}</p>}{step === 1 && <form onSubmit={continueAccount} className="game-auth-form"><div className="game-auth-row"><label>Nombre<input value={name} onChange={event => setName(event.target.value)} placeholder="Tu nombre" /></label><label>Usuario<input value={username} onChange={event => setUsername(event.target.value)} placeholder="@usuario" /></label></div><label>Correo electrónico<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@email.com" /></label><label>Contraseña<span className="game-auth-password"><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar' : 'Ver'}</button></span></label><button className="game-auth-primary" type="submit">Continuar →</button></form>}{step === 2 && <div className="game-auth-step"><section><h2>🎮 Tipo de juegos en los que deseas trabajar</h2><p>Selecciona todas las áreas que te interesen.</p><ChoiceGrid label="Tipos de juegos" items={GAME_TYPES.map(item => ({ ...item, label: gameTypeLabel('es', item.value) }))} selected={gameTypes} onChange={value => toggle(setGameTypes, gameTypes, value)} /></section><section><h2>⌘ Lenguajes de programación que dominas</h2><p>Selecciona uno o varios lenguajes.</p><ChoiceGrid label="Lenguajes" items={ALL_LANGUAGES} selected={languages} onChange={value => toggle(setLanguages, languages, value)} /></section><div className="game-auth-next"><button onClick={() => { setError(''); setStep(1); }}>← Atrás</button><button className="game-auth-primary" onClick={continueExperience}>Continuar →</button></div></div>}{step === 3 && <div className="game-auth-step"><section><h2>🎮 Tus juegos favoritos</h2><p>Esto nos ayuda a recomendarte proyectos afines.</p><ChoiceGrid label="Géneros favoritos" items={FAVORITE_GENRES.map(item => ({ ...item, label: favoriteGenreLabel('es', item.value) }))} selected={favoriteGenres} onChange={value => toggle(setFavoriteGenres, favoriteGenres, value)} /></section><section><h2>✦ Habilidades de la persona</h2><p>Elige las habilidades que quieres aportar a un equipo.</p><ChoiceGrid label="Habilidades" items={DISCIPLINES.map(item => ({ ...item, label: disciplineLabel('es', item.value) }))} selected={disciplines} onChange={value => toggle(setDisciplines, disciplines, value)} /></section><div className="game-auth-next"><button onClick={() => { setError(''); setStep(2); }}>← Atrás</button><button className="game-auth-primary" onClick={submitRegister}>Crear mi cuenta</button></div></div>}<p className="game-auth-switch">¿Ya tienes una cuenta? <Link to="/login">Iniciar sesión</Link></p></section> : <section className="game-auth-login"><div className="game-auth-login-icon">🎮</div><h1>Inicia sesión en ENTYTECOLLAB</h1><div className="game-auth-login-card"><form onSubmit={submitLogin} className="game-auth-form"><label>Usuario o correo electrónico<input value={loginIdentifier} onChange={event => setLoginIdentifier(event.target.value)} placeholder="carlos_dev o carlos@ejemplo.com" /></label><label>Contraseña<span className="game-auth-password"><input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={event => setLoginPassword(event.target.value)} placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar' : 'Ver'}</button></span></label>{error && <p className="game-auth-error">{error}</p>}<button className="game-auth-primary" type="submit">Iniciar sesión</button></form><div className="game-auth-or"><span>o continúa con</span></div><div className="game-auth-socials"><button type="button" onClick={social}>◉ GitHub</button><button type="button" onClick={social}>G Continuar con Google</button></div></div><div className="game-auth-new">¿Nuevo en ENTYTECOLLAB? <Link to="/register">Crear una cuenta</Link></div></section>}</main>
  </div>;
}
