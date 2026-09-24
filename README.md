# ENTYCOLLAB

Plataforma donde los desarrolladores encuentran proyectos, colaboran y construyen juntos.

## Descripción

ENTYCOLLAB es una aplicación web (SPA) que permite:

- Buscar proyectos publicados por la comunidad y postularse a ellos.
- Publicar proyectos propios, indicando categoría, tecnologías requeridas, cupos, calificación mínima y fecha límite.
- Colaborar: invitar a personas, aceptar/rechazar postulantes, iniciar el proyecto y calificar a los participantes al finalizar.
- Perfiles de desarrolladores con disponibilidad, historial de proyectos y calificaciones.

## Estado actual del proyecto

- **Datos locales:** toda la información se guarda en el `localStorage` del navegador mediante una capa de datos (`src/lib/store.js`) con datos de demostración sembrados al primer arranque (`bootstrap()`). Cada navegador tiene su propia copia.
- **Categorías de proyectos:** Desarrollo Web, Desarrollo Móvil y Videojuegos y Entretenimiento (más categorías personalizadas escritas por el usuario).
- **Tecnologías por categoría:** para crear un proyecto o filtrarlo, primero se elige la categoría y luego se listan solo las tecnologías relacionadas a esa categoría. Lo mismo aplica para los perfiles y el filtro de personas.
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
entycollab-react/
├─ public/                  # Assets estáticos (imágenes, favicon)
├─ src/
│  ├─ components/           # Componentes reutilizables (Header, ProjectCard, ...)
│  ├─ context/              # Estado global: AppContext, ModalManager, ToastContext
│  ├─ lib/                  # Capa de datos, i18n, helpers
│  │  ├─ store.js           # LocalStorage, seeds y migraciones
│  │  ├─ i18n.js            # Diccionario ES/EN
│  │  ├─ helpers.js         # Categorías, tecnologías por categoría, utilidades
│  │  └─ filters.js         # Listas disponibles para filtros
│  ├─ modals/               # Modales (crear proyecto, detalle, filtros, ...)
│  ├─ pages/                # Vistas (Dashboard, Projects, People, Profile, ...)
│  └─ styles.css            # Estilos globales
└─ index.html
```

## Requisitos previos

- Node.js 18 o superior
- npm (incluido con Node.js)

## Instalación y ejecución

```bash
# 1. Entrar al proyecto
cd entycollab-react

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
2. Establece el **Root Directory** en `entycollab-react` (Vercel detecta Vite automáticamente).
3. Para que las rutas internas (`/proyectos`, `/personas`, `/perfil`, ...) funcionen al recargar, crea un `vercel.json` en `entycollab-react/` con:

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
3. Reemplazar la capa `src/lib/store.js` y la autenticación de `src/context/AppContext.jsx` por llamadas a la API de Supabase (auth + queries).
4. Guardar las credenciales como variables de entorno en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5. Desactivar los seeds locales en `bootstrap()` y sembrar los datos de ejemplo una sola vez en Supabase.

## Roadmap

- [ ] Conexión a Supabase (auth + datos en la nube)
- [ ] Subida de imágenes de proyectos a Supabase Storage
- [ ] Otras mejoras de UI/UX detectadas con el cliente