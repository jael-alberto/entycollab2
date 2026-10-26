# ENTYCOLLAB — Frontend

Documento descriptivo del **frontend** de ENTYCOLLAB: qué es, qué hace, cómo funciona su lógica,
cuál es su propósito y cómo está estructurado. No cubre backend ni base de datos en la nube
(futura: Supabase); la fuente de verdad actual es el `localStorage` del navegador.

---

## 1. Qué es este proyecto

ENTYCOLLAB es la aplicación web oficial de **EntyTec Video Game Studios** para
la **organización y colaboración en proyectos de desarrollo de videojuegos**.

Es una **MPA por rutas** construida como SPA con React: cada ruta (`/`, `/dashboard`,
`/proyectos/*`, `/personas`, `/perfil`, `/grupos/:groupId?`, `/ajustes`, `/login`, `/register`)
es una superficie con objetivo propio y enlace compartible, no una landing promocional.
La herramienta sirve al flujo completo: **descubrir → postularse → colaborar → calificar**.

Stack del frontend:

| Pieza | Versión | Uso |
|---|---|---|
| React | 19 | UI, componentes, páginas |
| Vite | 8 | Dev server y build (`dist/`) |
| React Router | 7 | Enrutamiento (`BrowserRouter`, rutas en `src/App.jsx`) |
| Oxlint | 1.81 | Lint (`npm run lint`) |
| CSS propio | — | `src/styles/tokens.css` + `src/styles.css` + `src/components/ui/ui.css` (sin Tailwind) |

---

## 2. Qué hace (funcionalidades)

1. **Explorar proyectos** publicados por la comunidad y **postularse** a ellos
   (con pitch/mensaje, validando cupos disponibles y calificación mínima del postulante).
2. **Publicar proyectos propios**: categoría, tecnologías requeridas, cupos,
   calificación mínima exigida y fecha límite.
3. **Colaborar**: invitar personas a un proyecto, aceptar/rechazar postulantes,
   iniciar el proyecto, cerrarlo y **calificar a los participantes** al finalizar.
4. **Perfiles de desarrolladores**: disponibilidad, historial de proyectos
   (creados + participaciones aceptadas), calificaciones recibidas, proyectos destacados (máx. 5),
   links a GitHub y portafolio.
5. **Buscar personas** por: tipo de juego, lenguaje, juego favorito, habilidad,
   proyectos completados y valoración (buscador facetado con conteos, chips removibles y orden).
6. **Grupos**: espacios de trabajo (Global + grupos propios) con proyectos y personas por grupo,
   solicitudes de acceso e invitaciones.
7. **Cuenta y preferencias**: registro/login local (email o `@usuario` + contraseña),
   OAuth solo como UI brandeada (sin conexión real), tema claro/oscuro (claro por defecto),
   idioma ES/EN, ajustes de cuenta, habilidades y perfil de talento.

---

## 3. Propósito

Ser la **herramienta de trabajo** de la comunidad gamedev de EntyTec, no un escaparate.
Cada pantalla existe para mover al usuario a la siguiente acción del ciclo
(publicar → reclutar → desarrollar → calificar → reputación visible).
Reglas de diseño vigentes:

- Nada de bloques de marketing vacíos ni métricas decorativas sin fuente:
  todo número (cupos, rating, completados) se calcula de los datos.
- Un solo vocabulario en toda la app (glosario en `src/lib/i18n.js`):
  **Crear cuenta** (nunca Registrarse), **Postularse** (no Aplicar),
  **Cupos**, **Fecha límite**, **Calificación**, **Personas**.
- Modo **claro por defecto**; oscuro opt-in. Naranja de marca solo como acento
  funcional (CTAs y estados), con `#C2410C`/`#9A3412` para texto sobre claro (WCAG AA).

---

## 4. Lógica y funcionamiento

### 4.1 Arranque (`src/main.jsx` + `src/lib/store.js`)

1. `main.jsx` ejecuta `bootstrap()`: si el `localStorage` está vacío, siembra
   **datos demo** (usuarios, proyectos, postulaciones, calificaciones, grupos) y migraciones.
   Cada navegador tiene su propia copia; no hay backend compartido.
2. Se monta `BrowserRouter` → `App.jsx`, que envuelve todo en
   `ToastProvider` → `AppProvider` → `ModalProvider`.
3. Import order de estilos: `styles/tokens.css` → `styles.css` → `components/ui/ui.css`.

### 4.2 Estado global (`src/context/`)

- **`AppContext.jsx`**: única fuente de estado en memoria (`users`, `projects`,
  `applications`, `ratings`, `groups`, `userId`, `activeGroupId`, `lang`, `theme`,
  filtros de categoría/tecnología). Expone acciones: `login`, `logout`, `register`,
  `applyToProject(projectId, pitch?)`, `createProject`, `updateProjectStatus`,
  `acceptApplication`/`rejectApplication`, `inviteUser`, `rateParticipants`,
  `toggleTheme`, `toggleLang`, `selectGroup`, más helpers `t(key)` y `l10n(value)`.
  Tras cada mutación persiste en `localStorage` y re-sincroniza (`refresh()`).
- **`ModalManager.jsx`**: modales globales (`openDetail`, `openUserDetail`, `openInvite`, …);
  la ficha de proyecto y el perfil ajeno se abren como modal desde tarjetas y listas.
- **`ToastContext.jsx`**: notificaciones (`success/error/info`, `role="status"`/`alert`).

Persistencia (`STORAGE_KEYS`, prefijo `devcollab_`): `users`, `projects`, `applications`,
`ratings`, `groups`, `current_user`, `active_group`, `theme` (`light` por defecto;
`getTheme()` devuelve `false` si no hay clave), `lang`.

### 4.3 Flujos principales

- **Auth**: `Login.jsx` / `Register.jsx` + `GameAuth.jsx` (layout con pasos en registro,
  botones Google/GitHub solo visuales + toast `auth.socialSoon`). Valida credenciales
  contra usuarios sembrados/creados. Cuentas demo: `maria@demo.com`, `carlos@demo.com`,
  `ana@demo.com`, `andres@demo.com`, `camila@demo.com` (contraseña `123456`).
  `RequireAuth` protege rutas internas; `RedirectIfAuthed` evita login con sesión.
- **Descubrir → postularse**: `Projects.jsx` (toolbar con búsqueda, pills de estado
  Todos/Reclutando/En desarrollo/Finalizado, orden, paginación de 12) y `Dashboard.jsx`
  (vista `GlobalView` con tabs Overview/Proyectos/Personas) listan `ProjectCard`.
  La tarjeta muestra portada 16/9, título, dueño + ★ promedio, descripción (clamp 2 líneas),
  tags (máx. 4 + `+n`) y meta (cupos `aceptados/slots`, fecha límite, calificación mínima).
  El CTA depende del estado: dueño → Gestionar; postulado → Pendiente/Aceptado/Rechazado;
  abierto con cupo → **Postularse** (+ Ver). `applyToProject` rechaza duplicados
  (`alreadyApplied`) y rating insuficiente (`minRating`), o crea la aplicación `pending`.
- **Publicar → gestionar**: `CreateProjectModal.jsx` (validado por `src/lib/validation.js`:
  título ≥ 8, descripción ≥ 40, `slots` 1–20, `deadline` futura, ≥ 1 tecnología).
  El dueño gestiona en `ProjectManage.jsx` y en la ficha (`ProjectDetailView.jsx` /
  `ProjectDetailModal.jsx`, layout estilo Steam: columna principal + sidebar sticky):
  lista de postulantes con Aceptar/Rechazar, Iniciar/Cerrar/Marcar completado,
  y `RateModal.jsx` (`StarInput` radiogroup 1–5) al finalizar.
- **Personas → invitar**: `/personas` (`People.jsx` + `PeopleDirectory.jsx` +
  `PeopleSidebar.jsx`) filtra con `src/lib/talentSearch.js`: 6 facetas
  (tipos de juego, lenguajes —dependientes del tipo elegido—, favoritos, habilidades,
  completados por tramos, rating incluyendo "Sin valoraciones"), buscador libre,
  orden (relevancia/completados/rating/nombre) y paginación. `PersonCard` muestra
  avatar 44, nombre + `@usuario`, badge de rol principal (Programador/Artista 3D/
  Diseñador/Compositor), disponibilidad, ★ promedio o "Sin valoraciones",
  proyectos completados y CTAs Ver perfil / Invitar (`InviteModal.jsx` con mensaje).
- **Perfil y reputación**: `/perfil` propio (`Profile.jsx`: header, tabs
  Proyectos/Reseñas/Sobre mí, destacados máx. 5 vía `FeaturedModal.jsx`,
  `UserHistory.jsx` con historial creador/participante) y `UserDetailModal.jsx`
  para terceros. El rating **nunca se edita a mano**: es el promedio de `ratings`
  recibidas (`getUserAvgRating`); `completedProjectsCount` sale del historial aceptado.
- **Ajustes**: `Settings.jsx` (foto, datos de cuenta, habilidades por categoría,
  perfil de talento). `Legal.jsx` expone `LegalContent` (Privacidad/Términos) que el
  `Footer.jsx` abre en modal — no existe ruta `/legal/*` (el catch-all de `App.jsx`
  redirige), decisión intencional para no tocar rutas.
- **i18n**: `src/lib/i18n.js` (diccionario ES/EN + `t()` con interpolación
  `{name} {n} {stars}` y `l10nValue()` para contenido bilingüe `{es,en}` o string).

### 4.4 Diseño y accesibilidad

- `src/styles/tokens.css`: tokens semánticos light-first (bg, surface, text, border,
  brand, success/warning/danger/info, hover/active/disabled/loading/selected),
  escala tipográfica Inter (display 40/32/24/18, body 15/13, caption 12, mono 12),
  espaciado base 4, radios 6/10/14/20, sombras sutiles, `focus-ring` 2px,
  bloque `:root.dark` opt-in y ratios de contraste documentados en comentarios.
- `src/components/ui/` (`Button`, `Badge`, `StatusPill`, `Skeleton`, `EmptyState`
  con prop `action`, barrel `index.js`): primitivas accesibles sin romper la API
  de `common.jsx` (Modal con focus-trap/`Esc`/`aria-modal`, `Avatar`, `Stars`,
  `EmptyState`, `ProjectBanner`).
- Toda acción async deshabilita su botón (`aria-busy` + spinner); formularios con
  `Field` (label + hint + error `role="alert"`); skip-link; iconos con `aria-label`;
  `prefers-reduced-motion` desactiva animaciones.

---

## 5. Estructura (solo frontend)

```
frontend/
├── index.html              # Entrada Vite (monta #root)
├── package.json            # React 19, Router 7, Vite 8, Oxlint; scripts dev/build/lint/preview
├── vercel.json / netlify.toml
│                           # Rewrites a index.html (rutas profundas al recargar)
├── .env.example            # Nombres VITE_SUPABASE_* (sin valores; Fase 1 sin conexión)
├── vite.config.js / .oxlintrc.json
├── public/                 # Assets estáticos (img/, favicon)
└── src/
    ├── main.jsx            # Bootstrap seeds + providers + orden de CSS
    ├── App.jsx             # Rutas y guards (SIN cambios de rutas por decisión)
    ├── styles.css          # Estilos globales y de páginas (monolito en división progresiva)
    ├── styles/
    │   └── tokens.css      # Design tokens light-first + :root.dark + contrastes
    ├── components/
    │   ├── ui/             # Primitivas nuevas: Button, Badge, StatusPill, Skeleton,
    │   │                   # EmptyState(+action), ui.css, index.js
    │   ├── Header.jsx      # LoggedHeader (SiteNav + site-switcher Global/Grupos) y PublicHeader slim
    │   ├── Footer.jsx      # Producto/Legal(modal)/Recursos + contacto
    │   ├── ProjectCard.jsx # Tarjeta central + ProjectCardSkeleton
    │   ├── ProjectDetailView.jsx  # Ficha estilo Steam (principal + sidebar sticky)
    │   ├── PersonCard.jsx  # Tarjeta talento (+ primaryRoleLabel)
    │   ├── PeopleDirectory.jsx / PeopleSidebar.jsx / GroupPeopleInGroup.jsx
    │   ├── UserHistory.jsx # Historial + destacados (máx. 5)
    │   ├── AuthLayout.jsx / GameAuth.jsx  # Layouts y formularios de auth
    │   └── common.jsx      # Modal, Avatar, Stars, StatusPill, EmptyState, Field, Spinner…
    ├── modals/             # CreateProject, ProjectDetail, Apply (pitch), Invite,
    │                       # Rate (estrellas), UserDetail, Featured, SelectFilter, SettingsSkills
    ├── pages/
    │   ├── Landing.jsx     # Home de conversión (hero compacto + destacados reales)
    │   ├── Dashboard.jsx   # Panel (KPIs reales + GlobalView con tabs)
    │   ├── Projects.jsx    # Explorar + Mis proyectos (filtros, paginación)
    │   ├── ProjectManage.jsx  # Gestión del dueño (postulantes, estados, calificar)
    │   ├── People.jsx      # Buscador facetado de personas
    │   ├── Profile.jsx     # Mi perfil (tabs Proyectos/Reseñas/Sobre mí)
    │   ├── Groups.jsx      # Grupos y workspace por grupo
    │   ├── Settings.jsx    # Cuenta, habilidades, perfil de talento
    │   ├── Login.jsx / Register.jsx
    │   └── Legal.jsx       # Contenido Privacidad/Términos (se usa en modal, sin ruta)
    ├── context/
    │   ├── AppContext.jsx  # Estado global + acciones (ver §4.2)
    │   ├── ModalManager.jsx# Modales globales
    │   └── ToastContext.jsx# Notificaciones
    └── lib/
        ├── store.js        # localStorage + seeds bootstrap() + migraciones (fuente actual)
        ├── i18n.js         # Diccionario ES/EN + t() + l10nValue()
        ├── helpers.js      # Categorías, techs por categoría, ratings, slugs, fechas
        ├── filters.js      # Listas para filtros de proyectos
        ├── talent.js       # Taxonomías del perfil de talento
        ├── talentSearch.js # Búsqueda facetada (filtros, conteos, orden)
        ├── validation.js   # Reglas de formularios (proyecto, pitch, rating…)
        ├── supabaseClient.js + api/  # Stubs Fase 1 (profiles, projects, applications,
        │                   # ratings, storage, client): sin conexión, listos para Supabase
        └── (docs fuera de src: database/supabase/migrations, docs/BACKEND_PLAN.md)
```

### Rutas (fijas, no modificar)

| Ruta | Página | Acceso |
|---|---|---|
| `/` | `Landing.jsx` (conversión + destacados) | Pública |
| `/login`, `/register` | `Login.jsx`, `Register.jsx` | Solo sin sesión |
| `/dashboard` (`?view=global`) | `Dashboard.jsx` | Auth |
| `/proyectos/*` (`mis-proyectos`, `postulaciones`, `:id`, `:id/gestionar`) | `Projects.jsx`, `ProjectManage.jsx` | Auth |
| `/personas` | `People.jsx` | Auth |
| `/grupos/:groupId?` | `Groups.jsx` | Auth |
| `/perfil` | `Profile.jsx` | Auth |
| `/ajustes` | `Settings.jsx` | Auth |
| `*` | Redirige a `/dashboard` o `/login` | — |

## 6. Cómo correr y verificar

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run lint     # Oxlint, 0 errores (warnings preexistentes)
npm run build    # Build de producción en dist/
```

Demo local: al primer arranque se siembran usuarios (`maria@demo.com`, `carlos@demo.com`,
`ana@demo.com`, `andres@demo.com`, `camila@demo.com`, contraseña `123456`).
