import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { EmptyState } from '../components/common.jsx';

const pillars = [
  { icon: '🧭', title: 'Explora proyectos reales', text: 'Conoce la idea, las herramientas y los roles que cada equipo necesita antes de sumarte.' },
  { icon: '🤝', title: 'Colabora con tu equipo', text: 'Encuentra personas con intereses complementarios y construye videojuegos en comunidad.' },
  { icon: '🚀', title: 'Comparte lo que creas', text: 'Haz visible tu trabajo, tus habilidades y tu experiencia dentro de la comunidad.' }
];

export default function Landing() {
  const { projects, user } = useApp();
  const featured = [...projects].filter(project => project.status === 'open').slice(0, 3);

  return <div className="landing-page">
    <header className="landing-nav">
      <a className="landing-brand" href="#inicio"><img src="/img/logo-pg.png" alt="" /> <span>ENTY<span>COLLAB</span></span></a>
      <nav aria-label="Navegación de inicio">
        <a href="#explorar">Explorar proyectos</a><a href="#comunidad">Comunidad</a>
      </nav>
      <div className="landing-actions">{user ? <><Link to="/perfil" className="landing-signin">Mi perfil</Link><Link to="/dashboard" className="landing-cta">Ir al panel →</Link></> : <><Link to="/login" className="landing-signin">Iniciar sesión</Link><Link to="/register" className="landing-cta">Crear cuenta</Link></>}</div>
    </header>
    <main>
      <section className="landing-hero" id="inicio">
        <div className="landing-hero-content">
          <span className="landing-eyebrow"><i /> ESTUDIO DE DESARROLLO DE VIDEOJUEGOS ENTYTEC</span>
          <h1>Videojuegos que se crean <em>en equipo.</em></h1>
          <p>Un espacio para reunir a programadores, artistas, diseñadores y creadores que quieren construir videojuegos de forma colaborativa y abierta.</p>
          <div className="landing-hero-actions">{user ? <Link to="/dashboard" className="landing-cta">Descubrir proyectos <span>→</span></Link> : <><Link to="/register" className="landing-cta">Únete a EntyCollab <span>→</span></Link><Link to="/login" className="landing-secondary">Ya tengo una cuenta</Link></>}</div>
          <div className="landing-proof"><span><b>✦</b> Comunidad creativa</span><span><b>⌘</b> Proyectos colaborativos</span><span><b>◉</b> Código abierto</span></div>
        </div>
        <div className="landing-hero-art" aria-hidden="true"><div className="landing-orbit orbit-one"/><div className="landing-orbit orbit-two"/><div className="landing-game-card"><span className="game-card-label">ENTYTEC · PROYECTO ABIERTO</span><div className="game-card-art"><span>✦</span><span>◈</span><span>✧</span></div><strong>Imagina. Construye. Juega.</strong><small>Un equipo puede empezar contigo.</small><div className="game-card-people"><i>🎨</i><i>💻</i><i>🎧</i><span>+ comunidad</span></div></div></div>
      </section>
      <section className="landing-projects" id="explorar"><div className="landing-section-heading"><div><span className="landing-eyebrow">HECHOS EN COMUNIDAD</span><h2>Proyectos para descubrir</h2></div><Link to={user ? '/proyectos' : '/register'}>Explorar la comunidad <span>→</span></Link></div>
        {featured.length ? <div className="landing-project-grid">{featured.map((project, index) => <article className={`landing-project-card project-tone-${index + 1}`} key={project.id}><div className="landing-project-art"><span>{['◈', '✦', '⌘'][index]}</span><small>{project.category || 'PROYECTO'}</small></div><div className="landing-project-copy"><span className="project-status"><i /> {project.status === 'open' ? 'Buscando colaboradores' : 'En desarrollo'}</span><h3>{project.title}</h3><p>{project.description}</p><div className="landing-tags">{(project.tech || []).slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div><Link to={user ? '/proyectos' : '/register'}>Conocer el proyecto <span>↗</span></Link></div></article>)}</div> : <EmptyState icon="🎮" title="Pronto habrá nuevos proyectos" sub="Crea tu cuenta para conocer a la comunidad." />}
      </section>
      <section className="landing-community" id="comunidad"><span className="landing-eyebrow">ASÍ COLABORAMOS</span><h2>De una idea a un juego, <em>juntos.</em></h2><p>Encuentra proyectos que te inspiren, aporta lo que sabes y aprende junto a otros creadores.</p><div className="landing-pillars">{pillars.map((pillar, index) => <article key={pillar.title}><span className="pillar-number">0{index + 1}</span><span className="pillar-icon">{pillar.icon}</span><h3>{pillar.title}</h3><p>{pillar.text}</p></article>)}</div><div className="landing-callout"><div><span className="landing-eyebrow">TU PRÓXIMA IDEA EMPIEZA AQUÍ</span><h3>¿Listo para crear algo que valga la pena jugar?</h3></div><Link to={user ? '/proyectos' : '/register'} className="landing-cta">{user ? 'Ver proyectos' : 'Crear mi perfil'} <span>→</span></Link></div></section>
    </main>
    <footer className="landing-footer"><a className="landing-brand" href="#inicio"><img src="/img/logo-pg.png" alt="" /><span>ENTY<span>COLLAB</span></span></a><span>Creando videojuegos, en comunidad.</span><a href="#inicio">Volver arriba ↑</a></footer>
  </div>;
}
