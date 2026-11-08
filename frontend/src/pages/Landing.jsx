import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { Icon } from '../components/common.jsx';

// Portada con respaldo de marca: si el archivo de imagen no existe (assets
// demo no incluidos), se dibuja un panel grafito con retícula en lugar de
// dejar el icono de imagen rota del navegador.
function Cover({ src, alt, label, variant }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`tcl-cover-fallback${variant ? ` tcl-cover-fallback--${variant}` : ''}`} role="img" aria-label={alt}>
        <b>{label}</b>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

// Proyectos destacados de demostración. Cifras y cupos son de muestra,
// no provienen de una fuente real (la landing es una vista demo).
const games = [
  { id: 'aetheria', title: 'Chronicles of Aetheria', image: '/img/games/aetheria.jpg', cat: 'code', genre: 'ARPG Fantasía Oscura', engine: 'Unreal Engine 5', stage: 'Reclutando', roles: ['Gameplay Programmer (C++)', '3D Environment Artist', 'VFX Niagara'], tech: ['Unreal 5', 'C++', 'Niagara'], summary: 'Action RPG cooperativo en tercera persona con combate souls-lite y calabozos procedurales.' },
  { id: 'neon', title: 'Neon Drifter: Override', image: '/img/games/neon-drifter.jpg', cat: 'design', genre: 'Cyberpunk Roguelite', engine: 'Godot 4', stage: 'Reclutando', roles: ['Pixel Artist 2D', 'Level Designer', 'Audio FMOD'], tech: ['Godot 4', 'C#', 'FMOD'], summary: 'Roguelite de acción frenética con hackeo táctico y tiempo bala.' },
  { id: 'voxelforge', title: 'VoxelForge: Worlds', image: '/img/games/voxelforge.jpg', cat: 'code', genre: 'Motor Voxel', engine: 'C++20 + Vulkan', stage: 'Reclutando', roles: ['Graphics Programmer', 'Netcode Engineer', 'Physics'], tech: ['C++20', 'Vulkan', 'Rust'], summary: 'Motor voxel open source con destrucción total y renderizado por GPU.' },
  { id: 'valhalla', title: 'Echoes of Valhalla', image: '/img/games/valhalla.jpg', cat: 'art', genre: 'Aventura Nórdica', engine: 'Unity 6', stage: 'Reclutando', roles: ['Narrative Writer', 'Shader Specialist', 'Foley'], tech: ['Unity 6', 'C#', 'Wwise'], summary: 'Aventura de navegación nórdica, supervivencia oceánica y mitología viva.' },
];

const filters = [
  { value: 'all', label: 'Todos', icon: null },
  { value: 'code', label: 'Programación', icon: 'code' },
  { value: 'art', label: 'Arte y diseño', icon: 'palette' },
  { value: 'design', label: 'Game design', icon: 'gamepad' },
  { value: 'music', label: 'Música y sonido', icon: 'music' },
];

const steps = [
  { id: 'descubre', n: '01', icon: 'compass', title: 'Descubre', heading: 'Encuentra esa idea que te hace clic.', body: 'Explora proyectos por tipo de juego, tecnología y cupos. No tienes que tener un juego propio para empezar.', tags: ['RPG', 'Godot', '3 cupos disponibles'] },
  { id: 'postulate', n: '02', icon: 'send', title: 'Postúlate', heading: 'Envía tu postulación en minutos.', body: 'Elige un rol abierto, adjunta tu portafolio y cuéntales qué aportas. Sin cartas de presentación eternas.', tags: ['Rol', 'Portafolio', 'Respuesta rápida'] },
  { id: 'colabora', n: '03', icon: 'users', title: 'Colabora', heading: 'Trabaja con tu equipo en un espacio compartido.', body: 'Cada proyecto tiene su propio espacio: tareas, archivos y comunicación en un solo lugar.', tags: ['Espacio', 'Tareas', 'Chat'] },
  { id: 'crece', n: '04', icon: 'star', title: 'Crece', heading: 'Construye tu reputación.', body: 'Tu trabajo aceptado queda registrado y alimenta tu perfil de colaborador.', tags: ['Perfil', 'Reseñas', 'Historial'] },
];

export default function Landing() {
  const { user, selectGroup } = useApp();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [step, setStep] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const destination = user ? '/dashboard' : '/register';

  // Clear any persisted selected-group state when landing page loads
  useEffect(() => {
    selectGroup(null);
  }, [selectGroup]);
  const exploreTarget = user ? '/proyectos' : '#explorar';

  const visibleGames = useMemo(() => games.filter(game => {
    const term = query.trim().toLowerCase();
    const matchesFilter = filter === 'all' || game.cat === filter;
    return matchesFilter && (!term || [game.title, game.genre, game.engine, game.summary, ...game.tech].join(' ').toLowerCase().includes(term));
  }), [filter, query]);

  const scrollToShowcase = event => {
    event.preventDefault();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('explorar')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  const active = steps[step];

  return <div className="tcl">
    <header className={`tcl-nav${menuOpen ? ' is-open' : ''}`}>
      <a href="#inicio" className="tcl-brand" aria-label="ENTYTEC COLLAB, inicio" onClick={() => setMenuOpen(false)}>
        <img className="tcl-brand-logo" src="/img/collab-logo.png" alt="" />
      </a>
      <nav className="tcl-nav-links" id="tcl-nav-links" aria-label="Secciones">
        <a href="#explorar" onClick={() => setMenuOpen(false)}>Proyectos</a>
        <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
        <a href="#comunidad" onClick={() => setMenuOpen(false)}>Comunidad</a>
        <div className="tcl-mobile-auth">
          <Link to="/login" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
          <Link to="/register" className="is-primary tcl-mobile-register" onClick={() => setMenuOpen(false)}>Crear cuenta</Link>
        </div>
      </nav>
      <div className="tcl-nav-actions">
        <button
          type="button"
          className="tcl-theme"
          onClick={toggleTheme}
          aria-label={theme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-pressed={theme}
        >
          <Icon name={theme ? 'sun' : 'moon'} size={17} />
        </button>
        <Link to="/login" className="tcl-login">Iniciar sesión</Link>
        <Link to="/register" className="tcl-btn tcl-btn-primary tcl-nav-cta">Crear cuenta <Icon name="arrow-up-right" size={15} /></Link>
        <button
          type="button"
          className="tcl-burger"
          onClick={() => setMenuOpen(open => !open)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="tcl-nav-links"
        >
          <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
        </button>
      </div>
    </header>

    <main>
      <section className="tcl-hero" id="inicio">
        <div className="tcl-container tcl-hero-grid">
          <div className="tcl-hero-copy">
            <p className="tcl-eyebrow"><span className="tcl-eyebrow-square" aria-hidden="true" />PARA QUIENES NO SÓLO JUEGAN, CREAN.</p>
            <h1>Las buenas ideas necesitan <em>un equipo.</em></h1>
            <p className="tcl-hero-sub">Ese mundo que imaginas no tiene que quedarse en tu cabeza. Encuentra proyectos, conecta con talento y <b>crea videojuegos en compañía.</b></p>
            <div className="tcl-hero-ctas">
              <Link to={destination} className="tcl-btn tcl-btn-primary">Encuentra tu equipo <Icon name="arrow-up-right" size={16} /></Link>
              <a href="#explorar" onClick={scrollToShowcase} className="tcl-ghost">Primero, quiero explorar <Icon name="arrow-right" size={16} /></a>
            </div>
          </div>
          <div className="tcl-hero-art" aria-hidden="true">
            <div className="tcl-hero-back">
              <span>SELECT YOUR NEXT ADVENTURE_</span>
            </div>
            <div className="tcl-hero-card">
              <div className="tcl-browser-bar"><i /><i /><i /><span>PROYECTO_01</span></div>
              <Cover src="/img/games/aetheria.jpg" alt="" label="Aetheria" variant="hero" />
              <div className="tcl-hero-overlay">
                <span className="tcl-pill-recruit"><i />Reclutando</span>
                <div className="tcl-hero-title">Ecos del bosque</div>
                <div className="tcl-hero-tags"><span>RPG</span><span>Godot</span><span>Pixel art</span></div>
                <div className="tcl-hero-cardnav"><span>←</span><b>01 / 03</b><span>→</span></div>
              </div>
            </div>
            <div className="tcl-hero-avatars">
              <span className="tcl-avatar-stack"><i>CM</i><i>CT</i></span>
              <div><small>ESTE MUNDO TIENE UN LUGAR PARA TI</small><b>3 cupos disponibles</b><em>Conoce al equipo <Icon name="arrow-up-right" size={12} /></em></div>
            </div>
          </div>
        </div>
      </section>

      <div className="tcl-marquee" aria-hidden="true">
        <div className="tcl-marquee-track">
          {['DEJA DE IMAGINARLO A SOLAS.', 'EMPIEZA A CREARLO EN EQUIPO.', 'MAKE. PLAY. REPEAT.'].flatMap((text, i) => [
            <span key={`a${i}`} className="tcl-marquee-item">{text}</span>,
            <span key={`p${i}`} className="tcl-marquee-plus">+</span>,
            <span key={`b${i}`} className="tcl-marquee-item">{text}</span>,
            <span key={`q${i}`} className="tcl-marquee-plus">+</span>,
          ])}
        </div>
      </div>

      <section className="tcl-projects" id="explorar">
        <div className="tcl-container">
          <div className="tcl-projects-head">
            <div>
              <p className="tcl-eyebrow"><span className="tcl-eyebrow-square" aria-hidden="true" />ENCUENTRA TU PRÓXIMA AVENTURA</p>
              <h2>Hay un mundo esperando <em>tu talento.</em></h2>
            </div>
            <div className="tcl-projects-aside">
              <p>RPG, mundos cozy o aventuras cyberpunk. Explora proyectos demo y encuentra tu punto de partida.</p>
              <Link to={user ? '/proyectos' : '/register'} className="tcl-link-arrow">Ver todos los proyectos <Icon name="arrow-up-right" size={15} /></Link>
            </div>
          </div>
          <div className="tcl-projects-tools">
            <div className="tcl-pills" role="group" aria-label="Filtrar por disciplina">
              {filters.map(f => (
                <button key={f.value} type="button" className={`tcl-pill${filter === f.value ? ' is-active' : ''}`} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
                  {f.icon && <Icon name={f.icon} size={14} />}{f.label}{filter === f.value && f.value !== 'all' && <Icon name="check" size={13} />}
                </button>
              ))}
            </div>
            <label className="tcl-search"><Icon name="search" size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filtrar por rol, motor o título..." aria-label="Filtrar proyectos destacados" /></label>
          </div>
          <div className="tcl-projects-meta">
            <span>Explorando desde <b>{filters.find(f => f.value === filter).label.toLowerCase()}</b></span>
            <span>Selección ilustrativa · datos demo</span>
          </div>
          <div className="tcl-games">
            {visibleGames.map(game => <article className="tcl-game" key={game.id}>
              <div className="tcl-game-art">
                <Cover src={game.image} alt={`Portada de ${game.title}`} label={game.cat} />
                <span className="tcl-game-arrow" aria-hidden="true"><Icon name="arrow-up-right" size={17} /></span>
              </div>
              <div className="tcl-game-body">
                <div className="tcl-game-head"><h3>{game.title}</h3><span className={`tcl-game-stage s-${game.cat}`}><i />{game.stage}</span></div>
                <p className="tcl-game-summary">{game.summary}</p>
                <div className="tcl-game-tags">{game.tech.map(t => <span key={t}>{t}</span>)}</div>
                <div className="tcl-game-foot">
                  <span>{game.genre}</span>
                  <Link to={destination} className="tcl-link-arrow">Ver proyecto <Icon name="arrow-up-right" size={15} /></Link>
                </div>
              </div>
            </article>)}
          </div>
          {visibleGames.length === 0 && <div className="tcl-empty">No hay proyectos para ese filtro. Prueba con otra disciplina o limpia la búsqueda.</div>}
        </div>
      </section>

      <section className="tcl-how" id="como-funciona">
        <div className="tcl-container tcl-how-grid">
          <div className="tcl-how-left">
            <p className="tcl-eyebrow"><span className="tcl-eyebrow-square" aria-hidden="true" />DE LA IDEA AL EQUIPO</p>
            <h2>No es magia.<br /><em>Es colaboración.</em></h2>
            <div className="tcl-steps">
              {steps.map((s, i) => <button key={s.id} type="button" className={`tcl-step${i === step ? ' is-active' : ''}`} onClick={() => setStep(i)} aria-pressed={i === step}>
                <small>{s.n}</small><Icon name={s.icon} size={18} /><span>{s.title}</span><b aria-hidden="true">›</b>
              </button>)}
            </div>
          </div>
          <div className="tcl-how-right">
            <p className="tcl-how-aside">No tienes que hacerlo todo. Sólo dar el primer paso. Elige una etapa y descubre cómo funciona.</p>
            <div className="tcl-step-card">
              <div className="tcl-step-card-pattern"><span>{active.n}</span><i className="tcl-step-card-leaf"><Icon name="leaf" size={26} /></i><em>+</em></div>
              <p className="tcl-step-card-level">LEVEL_{active.n} / {active.title.toUpperCase()}</p>
              <h3>{active.heading}</h3>
              <p className="tcl-step-card-body">{active.body}</p>
              <div className="tcl-step-card-tags">{active.tags.map(t => <span key={t}>{t}</span>)}</div>
              <Link to={user ? '/proyectos' : '/register'} className="tcl-link-arrow">Explorar proyectos <Icon name="arrow-up-right" size={15} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="tcl-cta" id="comunidad">
        <div className="tcl-container tcl-cta-inner">
          <span className="tcl-cta-tile"><Icon name="gamepad" size={30} /></span>
          <div className="tcl-cta-copy">
            <p className="tcl-eyebrow tcl-eyebrow-dark">NO MÁS “ALGÚN DÍA”.</p>
            <h2>El próximo juego<br /><em>puede empezar contigo.</em></h2>
            <p>Trae tu talento. Encuentra a tu equipo. Construyan algo suyo.</p>
            <div className="tcl-cta-btns">
              <Link to={destination} className="tcl-btn tcl-btn-light">Crear cuenta <Icon name="arrow-up-right" size={16} /></Link>
              <Link to="/login" className="tcl-ghost tcl-ghost-dark">Ya tengo una cuenta <Icon name="arrow-right" size={16} /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer className="tcl-footer">
      <div className="tcl-container">
        <div className="tcl-footer-top">
          <a href="#inicio" className="tcl-brand" aria-label="ENTYTEC COLLAB, inicio">
            <img className="tcl-brand-logo" src="/img/collab-logo.png" alt="" />
            <small className="tcl-brand-tag">HECHO PARA CREAR, JUNTOS.</small>
          </a>
          <nav className="tcl-footer-links" aria-label="Sitio">
            <a href="#explorar">Proyectos</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#comunidad">Comunidad</a>
            <Link to="/register" className="tcl-link-arrow">Crear cuenta <Icon name="arrow-up-right" size={15} /></Link>
          </nav>
        </div>
        <p className="tcl-footer-blurb">Para las personas detrás del próximo juego.</p>
        <div className="tcl-footer-bottom">
          <span>© 2026 EntyTec Video Game Studios</span>
          <span>VISTA DEMO · DATOS FICTICIOS · SIN AUTENTICACIÓN REAL</span>
        </div>
      </div>
    </footer>
  </div>;
}
