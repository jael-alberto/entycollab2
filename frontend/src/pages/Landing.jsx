import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { Icon } from '../components/common.jsx';

// Proyectos destacados de muestra para la landing.
// Son ejemplos de demostración: no muestran cifras de stars/forks ni
// métricas de comunidad porque no provienen de una fuente real.
const games = [
  { id: 'aetheria', title: 'Chronicles of Aetheria', image: '/img/games/aetheria.jpg', genre: 'ARPG Fantasía Oscura', engine: 'Unreal Engine 5', stage: 'Pre-Alpha', roles: ['Gameplay Programmer (C++)', '3D Environment Artist', 'VFX Niagara Shaders'], tech: ['Unreal Engine 5', 'C++', 'Niagara VFX', 'Wwise'], summary: 'Action RPG cooperativo en tercera persona con combate souls-lite y calabozos procedurales.' },
  { id: 'neon', title: 'Neon Drifter: Override', image: '/img/games/neon-drifter.jpg', genre: 'Cyberpunk Roguelite', engine: 'Godot 4', stage: 'Alpha', roles: ['Pixel Artist & Animador 2D', 'Level Designer Procedural', 'Sistemas de Audio FMOD'], tech: ['Godot 4', 'C#', 'GLSL Shaders', 'FMOD'], summary: 'Roguelite de acción frenética cyberpunk con hackeo táctico y tiempo bala.' },
  { id: 'voxel', title: 'VoxelForge: Worlds', image: '/img/games/voxelforge.jpg', genre: 'Sandbox & Engine Voxel', engine: 'Motor propio (C++20 & Vulkan)', stage: 'Producción activa', roles: ['Graphics Programmer (Vulkan)', 'Netcode Engineer', 'Physics Simulation Specialist'], tech: ['C++20', 'Rust', 'Vulkan API', 'GLSL'], summary: 'Motor voxel open source con destrucción total, fluidos y renderizado acelerado por GPU.' },
  { id: 'valhalla', title: 'Echoes of Valhalla', image: '/img/games/valhalla.jpg', genre: 'Aventura Nórdica', engine: 'Unity 6', stage: 'Beta', roles: ['Narrative Writer', 'Unity Shader Specialist', 'Sonidista Foley'], tech: ['Unity 6', 'C#', 'Shader Graph', 'Wwise'], summary: 'Aventura de navegación nórdica, supervivencia oceánica y mitología viva.' }
];

const filters = [['all', 'Todos'], ['rpg', 'Action RPG'], ['rogue', 'Roguelite & Arcade'], ['engine', 'Motores & Voxel']];

export default function Landing() {
  const { user } = useApp();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const destination = user ? '/dashboard' : '/register';
  const exploreTarget = user ? '/proyectos' : '#explorar';

  const visibleGames = useMemo(() => games.filter(game => {
    const term = query.trim().toLowerCase();
    const matchesFilter = filter === 'all' || (filter === 'rpg' && game.genre.toLowerCase().includes('rpg')) || (filter === 'rogue' && game.genre.toLowerCase().includes('rogue')) || (filter === 'engine' && game.id === 'voxel');
    return matchesFilter && (!term || [game.title, game.genre, game.engine, game.summary, ...game.roles, ...game.tech].join(' ').toLowerCase().includes(term));
  }), [filter, query]);

  const scrollToShowcase = event => {
    event.preventDefault();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('explorar')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  return <div className="studio-home">
    <header className="studio-nav"><a href="#inicio" className="studio-brand"><span className="studio-brand-icon"><Icon name="gamepad" size={18} /></span><span>ENTYTEC<span>OLLAB</span></span></a><nav aria-label="Secciones"><a href="#explorar">Explorar proyectos</a><a href="#caracteristicas">Cómo colaborar</a><a href="#comunidad">Comunidad</a><a href="https://github.com/entycollab" target="_blank" rel="noreferrer">GitHub ↗</a></nav><div className="studio-nav-actions">{user ? <><Link to="/perfil">{user.name}</Link><Link className="studio-primary small" to="/dashboard">Ir a mi panel</Link></> : <><Link to="/login">Iniciar sesión</Link><Link className="studio-primary small" to="/register">Crear cuenta</Link></>}</div></header>
    <main>
      <section className="studio-hero b2-hero" id="inicio"><div className="studio-container b2-hero-inner"><h1>Construye videojuegos en equipo</h1><p>Publica tu proyecto, encuentra colaboradores o postúlate a juegos en desarrollo.</p><form className="b2-search" role="search" onSubmit={scrollToShowcase}><label className="b2-visually-hidden" htmlFor="landing-search">Buscar proyectos por título, motor, rol o tecnología</label><span aria-hidden="true">⌕</span><input id="landing-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por título, motor, rol o tecnología…" autoComplete="off" /><button className="studio-primary small" type="submit">Buscar</button></form><div className="studio-actions b2-actions"><Link className="studio-primary" to={destination}>{user ? 'Ir a mi panel' : 'Crear cuenta gratis'} <b aria-hidden="true">→</b></Link><Link className="studio-secondary" to={exploreTarget}>Explorar proyectos</Link></div></div></section>
      <section className="studio-showcase" id="explorar"><div className="studio-container"><div className="studio-section-head"><div><span className="studio-pill muted">Proyectos destacados</span><h2>Videojuegos que buscan colaboradores</h2><p>Proyectos de muestra con roles abiertos.</p></div><p className="b2-count" role="status">{visibleGames.length} de {games.length} proyectos</p></div><div className="studio-tools"><div className="studio-filter-tabs" role="group" aria-label="Filtrar por género">{filters.map(([value, label]) => <button key={value} type="button" className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><label className="studio-search"><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filtrar por rol, motor o título..." aria-label="Filtrar proyectos destacados" /></label></div><div className="studio-games">{visibleGames.map(game => <article className="studio-game" key={game.id}><div className="studio-game-art b2-cover"><img src={game.image} alt={`Portada de ${game.title}`} loading="lazy" /><div className="studio-art-shade" /><div className="studio-game-badges"><span>{game.genre}</span><span>{game.engine}</span></div><div className="studio-game-stage"><span>{game.stage}</span></div></div><div className="studio-game-copy"><div className="studio-game-title"><h3>{game.title}</h3></div><p>{game.summary}</p><div className="studio-roles"><b>Roles buscando colaboradores:</b><div>{game.roles.map(role => <span key={role}>{role}</span>)}</div></div><div className="studio-tech">{game.tech.map(tech => <span key={tech}>#{tech}</span>)}</div><div className="studio-game-bottom"><span className="b2-stage">{game.stage}</span><div><Link className="studio-view" to={destination}>Ver proyecto</Link><Link className="studio-apply" to={destination}>Postularme</Link></div></div></div></article>)}</div>{visibleGames.length === 0 && <div className="studio-empty"><p>No se encontraron proyectos con ese criterio.</p><button type="button" onClick={() => { setFilter('all'); setQuery(''); }}>Restablecer filtros</button></div>}</div></section>
      <section className="studio-flow" id="caracteristicas"><div className="studio-container"><span className="studio-pill muted">Cómo colaborar</span><h2>Tres pasos, sin fricción</h2><p>Explora, postúlate y colabora.</p><div className="studio-steps"><article><small>01</small><h3>Explora el proyecto</h3><p>Filtra por género, motor y estado.</p></article><article><small>02</small><h3>Postúlate a un rol</h3><p>Elige un rol abierto y envía tu postulación.</p></article><article><small>03</small><h3>Colabora</h3><p>Tu trabajo aceptado queda registrado.</p></article></div><div className="studio-community" id="comunidad"><div><span>COMUNIDAD GAMEDEV ENTYTEC</span><h3>Postúlate a un videojuego real</h3><p>Crea tu cuenta y únete a una producción activa.</p></div><Link className="studio-primary" to={destination}>{user ? 'Ir a mi panel →' : 'Crear cuenta gratis →'}</Link></div></div></section>
    </main>
    <footer className="studio-footer b2-footer"><div className="studio-container"><div><a href="#inicio" className="studio-brand"><span className="studio-brand-icon"><Icon name="gamepad" size={18} /></span><span>ENTY<span>COLLAB</span></span></a><p>Plataforma para organizar proyectos de videojuegos y colaborar en equipo.</p></div><div><b>Producto</b><Link to="/proyectos">Explorar</Link><Link to="/proyectos/mis-proyectos">Publicar</Link><Link to="/personas">Personas</Link></div><div><b>Legal</b><Link to="/legal/privacidad">Privacidad</Link><Link to="/legal/terminos">Términos</Link></div><div><b>Recursos</b><a href="https://github.com/entycollab" target="_blank" rel="noreferrer">GitHub</a><a href="mailto:info@entycollab.com">info@entycollab.com</a></div></div><p className="studio-copyright">© {new Date().getFullYear()} ENTYTECOLLAB. Desarrollado con tecnología libre.</p></footer>
  </div>;
}
