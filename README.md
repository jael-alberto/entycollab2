# ENTYCOLLAB

Plataforma donde los desarrolladores encuentran proyectos, colaboran y construyen juntos.

## Descripción

ENTYCOLLAB es una aplicación web (SPA) que permite:

- Buscar proyectos publicados por la comunidad y postularse a ellos.
- Publicar proyectos propios, indicando categoría, tecnologías requeridas, cupos, calificación mínima y fecha límite.
- Colaborar: invitar a personas, aceptar/rechazar postulantes, iniciar el proyecto y calificar a los participantes al finalizar.
- Perfiles de desarrolladores con disponibilidad, historial de proyectos y calificaciones.
- Buscar personas por tipo de juego, lenguaje, juego favorito, habilidad, proyectos completados y valoración.

## Estado actual del proyecto

- **Datos locales:** toda la información se guarda en el `localStorage` del navegador mediante una capa de datos (`src/lib/store.js`) con datos de demostración sembrados al primer arranque (`bootstrap()`). Cada navegador tiene su propia copia.
- **Categorías de proyectos:** Desarrollo Web, Desarrollo Móvil y Videojuegos y Entretenimiento (más categorías personalizadas escritas por el usuario).
- **Tecnologías por categoría:** para crear un proyecto o filtrarlo, primero se elige la categoría y luego se listan solo las tecnologías relacionadas a esa categoría. Lo mismo aplica para los perfiles.
- **Buscador de personas:** la página `/personas` es un buscador facetado al estilo Upwork. Un buscador superior (nombre, usuario, bio, habilidades y etiquetas) más un sidebar con seis facetas: tipo de juego, lenguaje, juego favorito, habilidad, proyectos completados y valoración por estrellas. Cada opción muestra cuántas personas devolvería y las seleccionadas se pueden quitar como chips; el orden es por relevancia, proyectos completados, valoración o nombre.
- **Perfil de talento:** cada persona declara tipo de juego, lenguajes, juegos favoritos y habilidad. La valoración con estrellas viene de las reseñas recibidas, no se edita a mano, y hay una opción "sin valoraciones" para que alguien recién llegado todavía aparezca en el buscador. Los proyectos completados se calculan del historial (propio o como participante aceptado). El perfil se edita en Ajustes → Perfil de talento, y los lenguajes disponibles dependen de los tipos de juego elegidos.
- **Ruta futura:** conectar el frontend a una base de datos en la nube (Supabase) manteniendo el despliegue en Vercel.

## Stack

| Herramienta | Versión | Uso |
|---|---|---|
| React | 19 | UI |
| Vite | 8 | Build/dev server |
| React Router | 7 | Enrutamiento del lado del cliente |
| Oxlint | 1.81 | Linting |

## Estructura del proyecto

```
entycollab2/
├─ frontend/                # App Vite (React 19 + Router). Raíz del proyecto web
│  ├─ public/               # Assets estáticos (imágenes, favicon)
│  ├─ src/
│  │  ├─ components/        # Componentes reutilizables (Header, ProjectCard, PeopleSidebar, ...)
│  │  ├─ context/           # Estado global: AppContext, ModalManager, ToastContext
│  │  ├─ lib/               # Capa de datos, i18n, helpers
│  │  │  ├─ store.js        # LocalStorage, seeds y migraciones (fuente actual)
│  │  │  ├─ supabaseClient.js # Único punto de conexión a Supabase (Fase 1: sin conexión)
│  │  │  ├─ api/            # Capa API, un repository por entidad (Fase 1: stubs)
│  │  │  │  ├─ client.js     # Errores centralizados (SupabaseNotConfiguredError)
│  │  │  │  ├─ profiles.js   # Perfiles (futura tabla `profiles`)
│  │  │  │  ├─ projects.js   # Proyectos (futura tabla `projects`)
│  │  │  │  ├─ applications.js # Postulaciones/invitaciones (futura `applications`)
│  │  │  │  ├─ ratings.js    # Calificaciones (futura tabla `ratings`)
│  │  │  │  └─ storage.js    # Subida de avatar/imagen (futuros buckets)
│  │  │  ├─ i18n.js         # Diccionario ES/EN
│  │  │  ├─ helpers.js      # Categorías, tecnologías por categoría, utilidades
│  │  │  ├─ filters.js      # Listas disponibles para filtros
│  │  │  ├─ talent.js       # Taxonomías del perfil de talento (tipos de juego, géneros, habilidades)
│  │  │  └─ talentSearch.js # Búsqueda facetada de personas (filtros, conteos, orden)
│  │  ├─ modals/            # Modales (crear proyecto, detalle, perfil de talento, filtros)
│  │  ├─ pages/             # Vistas (Dashboard, Projects, People, Profile, ...)
│  │  └─ styles.css         # Estilos globales
│  ├─ .env.example          # Nombres de variables Supabase (sin valores)
│  ├─ vercel.json           # Rewrites a index.html (despliegue)
│  ├─ vite.config.js
│  ├─ package.json
│  └─ index.html
├─ backend/                 # Código servidor futuro (hoy vacío; el backend es Supabase)
├─ database/                # Base de datos: migraciones versionadas y seeds (Fase 1: vacíos)
│  └─ supabase/
│     ├─ migrations/
│     │  ├─ 0001_init.sql   # Esquema: profiles, projects, applications, ratings (TODO)
│     │  └─ 0002_storage.sql # Buckets avatars y project-images + políticas (TODO)
│     └─ seed.sql           # Datos demo para Supabase (TODO, una vez por entorno)
├─ docs/
│  └─ BACKEND_PLAN.md       # Plan del backend por fases
└─ README.md
```

## Requisitos previos

- Node.js 18 o superior
- npm (incluido con Node.js)

## Instalación y ejecución

```bash
# 1. Entrar al frontend (la app Vite vive en frontend/)
cd frontend

# 2. Instalar dependencias
npm install

# 3. Servidor de desarrollo
npm run dev
```

Abre la URL que muestra la consola (por defecto `http://localhost:5173`).

### Cuentas de demostración

Al primer arranque se siembran datos demo. Puedes entrar con cualquiera de estas cuentas:

| Correo | Contraseña | Perfil |
|---|---|---|
| maria@demo.com | 123456 | Creadora de proyectos web |
| carlos@demo.com | 123456 | Backend |
| ana@demo.com | 123456 | Frontend |
| andres@demo.com | 123456 | Videojuegos (Unity) |
| camila@demo.com | 123456 | Videojuegos (Godot) |

También puedes crear una cuenta nueva desde la página de registro.

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Previsualizar el build |
| `npm run lint` | Analizar el código con Oxlint |

## Despliegue en Vercel

1. Importa el repositorio en [Vercel](https://vercel.com).
2. Establece el **Root Directory** en `frontend` (Vercel detecta Vite automáticamente).
3. Para que las rutas internas (`/proyectos`, `/personas`, `/perfil`, ...) funcionen al recargar, el `vercel.json` ya está en `frontend/` con:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

4. Despliega. Cada `push` a la rama principal actualizara la URL de producción; cada PR genera una URL de vista previa independiente.

> Nota: los datos demo viven en el `localStorage` de cada navegador, por lo que cada visitante ve su propia copia. Para compartir los mismos datos entre usuarios, conecta una base de datos en la nube (ver siguiente sección).

## Conexión futura a base de datos (Supabase)

Cuando el proyecto se conecte a Supabase (u otra BD en la nube):

1. Crear el proyecto en Supabase y las tablas `users`, `projects`, `applications`, `ratings` (con los campos del modelo actual).
2. Instalar `@supabase/supabase-js`.
3. Reemplazar la capa `frontend/src/lib/store.js` y la autenticación de `frontend/src/context/AppContext.jsx` por llamadas a la API de Supabase (auth + queries).
4. Guardar las credenciales como variables de entorno en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5. Desactivar los seeds locales en `bootstrap()` y sembrar los datos de ejemplo una sola vez en Supabase.

## Arquitectura del stack

```
UI (frontend/src: pages/, components/, modals/)
  → Estado global (frontend/src/context/AppContext.jsx)
    → Capa API (frontend/src/lib/api/*.js · repository por entidad)
      → Supabase (Postgres + Auth + Storage)
localStorage: solo sesión y preferencias (tema, idioma, usuario actual)
```

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | React 19 + Vite + React Router | Vistas, componentes, modales, estilos |
| Estado | React Context (`AppContext`, `ModalManager`, `ToastContext`) | Sesión, datos, UI global |
| Capa API | `src/lib/api/` (profiles, projects, applications, ratings, storage) | Único acceso a datos; hoy stubs (Fase 1), mañana Supabase |
| Backend | Supabase (sin servidor propio) | Postgres + Auth + Storage |
| Base de datos | Postgres en Supabase | Tablas `profiles`, `projects`, `applications`, `ratings` |
| Migraciones | `supabase/migrations/*.sql` (forward-only, versionadas) | Evolución del esquema |
| Despliegue | Vercel | Frontend; `vercel.json` reescribe rutas al `index.html` |

> Fase 1: estructura solamente. La fuente de verdad sigue siendo `localStorage` (`src/lib/store.js`) hasta la Fase 2.

## Roadmap

- [ ] Conexión a Supabase (auth + datos en la nube)
- [ ] Subida de imágenes de proyectos a Supabase Storage
- [ ] Otras mejoras de UI/UX detectadas con el cliente
