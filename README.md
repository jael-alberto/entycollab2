# ENTYCOLLAB

Plataforma donde los desarrolladores encuentran proyectos, colaboran y construyen juntos.

## Descripción

ENTYCOLLAB es una aplicación web (SPA) con backend propio que permite:

- Registrarse e iniciar sesión con Supabase Auth.
- Buscar proyectos y postularse o recibir invitaciones.
- Crear y gestionar proyectos propios o de un grupo.
- Crear grupos, solicitar acceso, aceptar miembros y administrar roles.
- Gestionar postulaciones, cupos, estados de proyecto y calificaciones.
- Buscar personas por habilidades, tecnologías, disponibilidad y valoración.
- Editar perfil, disponibilidad, proyectos destacados, avatar e imágenes de proyecto.
- Cambiar entre español e inglés y entre tema claro y oscuro.

## Estado actual

La migración a backend propio está en curso. Hoy conviven tres capas:

- **Frontend:** React 19 + Vite + React Router.
- **Backend:** Express + Prisma + PostgreSQL + Supabase Auth/Storage.
- **Datos heredados:** parte de perfiles, proyectos, postulaciones y calificaciones todavía se sincroniza desde `localStorage`/Supabase en el frontend.

Flujo actual:

```
React
  ├─ Supabase Auth (login/registro/sesión)
  ├─ Backend /api/* (grupos y endpoints nuevos)
  ├─ Supabase PostgREST (sincronización heredada)
  └─ localStorage (sesión, preferencias y fallback local)
```

### Bloqueadores conocidos para llegar al 200%

Estos puntos deben corregirse y probarse antes de considerar el proyecto terminado:

- [ ] `frontend/src/lib/supabaseSync.js` usa `select('*')` sobre `profiles`; la migración `0003` revoca la columna `email` y Supabase responde `42501 permission denied`. Usar columnas explícitas o mover la lectura al backend.
- [ ] `GET /api/groups` devuelve solo el conteo de miembros y no `members[].userId`; el frontend no puede detectar membresía con la estructura actual.
- [ ] La respuesta de `POST /api/groups` no incluye `members`; después de crear un grupo el frontend no lo reconoce como propio.
- [ ] `GroupsDirectory` llama `createGroup()` sin `await`, aunque `AppContext.createGroup` ahora es asíncrono.
- [ ] `database/supabase/seed.sql` está vacío: no hay datos demo compartidos.
- [ ] No existen pruebas automatizadas; `npm test` todavía no ejecuta nada.
- [ ] El backend no tiene configuración de despliegue; `vercel.json` solo cubre el frontend.

## Stack

| Capa | Tecnología | Uso |
|---|---|---|
| Frontend | React 19 + Vite 8 | UI |
| Routing | React Router 7 | Rutas del cliente |
| Backend | Node.js + Express 4 | API REST |
| ORM | Prisma 6 | Acceso a PostgreSQL |
| Base de datos | PostgreSQL / Supabase | Datos de la aplicación |
| Auth | Supabase Auth | Registro, login, sesiones y JWT |
| Storage | Supabase Storage | Avatares e imágenes de proyecto |
| Lint | Oxlint | Frontend y backend |
| Dev runner | concurrently | Levantar frontend y backend juntos |

## Estructura del proyecto

```
entycollab2/
├─ frontend/                    # React + Vite
│  ├─ src/
│  │  ├─ components/            # Header, cards, modales, etc.
│  │  ├─ context/               # AppContext, ToastContext, ModalManager
│  │  ├─ lib/
│  │  │  ├─ api/                # Cliente HTTP y repositorios por entidad
│  │  │  ├─ store.js            # LocalStorage, seeds y fallback
│  │  │  └─ supabaseSync.js     # Sincronización heredada con Supabase
│  │  ├─ modals/                # Modales de proyecto, aplicación, rating, etc.
│  │  ├─ pages/                 # Dashboard, Projects, People, Groups, Profile...
│  │  └─ styles.css
│  ├─ .env.example
│  └─ vercel.json
├─ backend/                     # Express + Prisma
│  ├─ prisma/schema.prisma
│  ├─ src/
│  │  ├─ config/                # env, prisma, supabase
│  │  ├─ controllers/
│  │  ├─ middleware/            # auth, validación Zod, errores
│  │  ├─ routes/
│  │  └─ utils/serializers.js
│  └─ .env.example
├─ database/
│  └─ supabase/
│     ├─ migrations/            # 0001_init, 0002_storage, 0003_security_hardening
│     └─ seed.sql
├─ docs/
├─ package.json                 # scripts raíz (dev, build, lint, setup)
└─ README.md
```

## Requisitos previos

- Node.js 18 o superior.
- npm.
- Un proyecto de Supabase con PostgreSQL, Auth y Storage.
- Opcional: Supabase CLI o acceso al SQL Editor para aplicar migraciones.

## Configuración

### 1. Instalar dependencias

```bash
npm run setup
```

Esto instala las dependencias de la raíz, `frontend/` y `backend/`.

En Windows también existe `setup.bat`, que hace lo mismo y crea los `.env` desde los `.env.example` si no existen.

### 2. Crear los archivos de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Completar como mínimo:

**`backend/.env`**

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://postgres.PROYECTO:PASSWORD@HOST:5432/postgres
SUPABASE_URL=https://PROYECTO.supabase.co
SUPABASE_SECRET_KEY=tu_secret_key
SUPABASE_PUBLISHABLE_KEY=tu_publishable_key

JWT_SECRET=un-secreto-largo-y-aleatorio
```

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

Notas:

- `DATABASE_URL` debe usar la conexión directa o el **Session pooler** de Supabase (puerto 5432).
- Si la contraseña tiene caracteres como `@`, `#` o `%`, hay que codificarla en la URL (`@` → `%40`).
- `SUPABASE_SECRET_KEY` es equivalente a `service_role`: solo backend, nunca frontend.
- `.env` está ignorado por Git; `.env.example` sí se commitea y solo debe tener placeholders.
- `SHADOW_DATABASE_URL` solo es necesario para `prisma migrate dev`.

### 3. Aplicar migraciones

En Supabase SQL Editor o con `psql`, ejecutar en orden:

1. `database/supabase/migrations/0001_init.sql`
2. `database/supabase/migrations/0002_storage.sql`
3. `database/supabase/migrations/0003_security_hardening.sql`

`database/supabase/seed.sql` está vacío actualmente. Para probar con datos compartidos hay que crear usuarios y datos manualmente o implementar el seed.

> No ejecutar `prisma migrate dev` ni `db push` contra una base compartida sin backup y sin revisar el SQL. El esquema ya está versionado en `database/supabase/migrations/`.

### 4. Generar el cliente Prisma

```bash
cd backend
npm run prisma:generate
```

### 5. Arrancar

Desde la raíz:

```bash
npm run dev
```

O por separado:

```bash
npm run dev:backend
npm run dev:frontend
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

## Scripts

| Comando | Descripción |
|---|---|
| `npm run setup` | Instala dependencias de raíz, frontend y backend |
| `npm run dev` | Levanta frontend y backend juntos |
| `npm run dev:frontend` | Solo frontend |
| `npm run dev:backend` | Solo backend con `--watch` |
| `npm run build` | Instala dependencias y compila el frontend |
| `npm run start:backend` | Backend en modo normal |
| `npm run lint` | Oxlint en frontend y backend |
| `cd backend && npm run prisma:validate` | Valida `schema.prisma` |
| `cd backend && npm run prisma:generate` | Genera Prisma Client |
| `cd backend && npm run prisma:studio` | Abre Prisma Studio |
| `cd backend && npm run prisma:db:pull` | Introspección de la base |

## API

Base URL: `http://localhost:3001/api`

Documentación detallada de endpoints: [`backend/README.md`](backend/README.md).

Rutas principales:

- `/api/auth`: registro, login, logout, refresh y usuario actual.
- `/api/profiles`: perfiles, búsqueda, disponibilidad, destacados, historial y ratings.
- `/api/projects`: CRUD, filtros, estados, proyectos de usuario y featured.
- `/api/applications`: postulaciones, invitaciones y participantes aceptados.
- `/api/ratings`: guardar/consultar calificaciones, promedio y distribución.
- `/api/groups`: grupos, miembros, solicitudes, roles y proyectos de grupo.
- `/api/storage`: avatares e imágenes de proyecto.

## Checklist de pruebas para llegar al 200%

Marcar solo cuando la prueba se haya ejecutado y el resultado sea el esperado.

### 0. Entorno, arranque y calidad base

- [ ] Node y npm cumplen la versión mínima.
- [ ] `npm run setup` termina sin errores.
- [ ] `backend/.env` y `frontend/.env` existen y cargan sus variables.
- [ ] `git status` no muestra `.env` ni secretos.
- [ ] `cd backend && npm run prisma:validate` es válido.
- [ ] `cd backend && npm run prisma:generate` genera el cliente.
- [ ] La conexión a PostgreSQL funciona (`SELECT 1`).
- [ ] Las tres migraciones están aplicadas en orden.
- [ ] `GET /health` responde `200`.
- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run build` genera `frontend/dist` sin errores.
- [ ] `npm run dev` levanta frontend y backend.
- [ ] No hay errores inesperados en la consola del navegador ni en la terminal.
- [ ] CORS permite `http://localhost:5173`.
- [ ] Rate limiting responde con error controlado al superar el límite.

### 1. Autenticación

- [ ] Registro con datos válidos crea usuario en Supabase Auth y perfil en `profiles`.
- [ ] Registro con email duplicado devuelve conflicto claro.
- [ ] Registro con username duplicado devuelve conflicto claro.
- [ ] Registro con email inválido, password corto o username inválido devuelve `400`.
- [ ] Login con email funciona.
- [ ] Login con username funciona.
- [ ] Login con contraseña incorrecta devuelve `401`.
- [ ] `GET /api/auth/me` devuelve el perfil autenticado.
- [ ] `POST /api/auth/refresh` renueva la sesión.
- [ ] Logout invalida la sesión.
- [ ] Recargar la página mantiene la sesión.
- [ ] Rutas privadas redirigen a `/login` sin sesión.
- [ ] Rutas de login/registro redirigen a `/dashboard` con sesión.
- [ ] Un endpoint protegido sin token devuelve `401`.
- [ ] Un token inválido o expirado devuelve `401`.
- [ ] Un usuario no puede modificar el perfil de otro (`403`).

### 2. Perfiles y personas

- [ ] Listado de perfiles carga sin exponer emails ajenos.
- [ ] Búsqueda por nombre, username, bio y habilidades.
- [ ] Filtros de personas por tipo de juego, lenguaje, género, habilidad, proyectos y valoración.
- [ ] Conteos y chips de filtros coinciden con los resultados.
- [ ] Orden por relevancia, proyectos, valoración y nombre funciona.
- [ ] Perfil por ID y por username.
- [ ] Editar nombre, username, bio, skills, categorías y enlaces.
- [ ] Cambiar disponibilidad.
- [ ] Guardar proyectos destacados (máximo permitido).
- [ ] Estadísticas, historial y ratings del perfil.
- [ ] Subir, reemplazar y eliminar avatar.
- [ ] Validar tipo y tamaño de avatar.
- [ ] Un usuario no puede editar campos de otro perfil.
- [ ] `select('*')` sobre `profiles` deja de fallar (columnas explícitas o backend).

### 3. Proyectos

- [ ] Listado con paginación y filtros.
- [ ] Búsqueda por texto, categoría, tecnología, estado y disponibilidad.
- [ ] Crear proyecto con título, categoría, slots, tech, descripción, rating mínimo, deadline, repo, imagen y roles.
- [ ] Validaciones de campos obligatorios, límites y URLs.
- [ ] Ver detalle de proyecto.
- [ ] Editar proyecto propio.
- [ ] Cambiar estado (`open`, `in-progress`, `completed`, `closed`).
- [ ] Eliminar proyecto propio.
- [ ] Un usuario no puede editar/eliminar un proyecto ajeno (`403`).
- [ ] Proyectos de usuario y proyectos destacados.
- [ ] Proyecto de grupo visible solo para miembros cuando corresponda.
- [ ] Subir/reemplazar/eliminar imagen de proyecto.
- [ ] `can-rate` responde correctamente para owner, participantes y ajenos.
- [ ] Proyectos cerrados no aceptan postulaciones.
- [ ] No se superan los cupos disponibles.

### 4. Postulaciones e invitaciones

- [ ] Postularse a un proyecto abierto.
- [ ] No se puede postular dos veces al mismo proyecto.
- [ ] No se puede postular al proyecto propio.
- [ ] No se puede postular sin cumplir requisitos de grupo/membresía.
- [ ] Invitar a un usuario a un proyecto.
- [ ] El invitado ve la invitación pendiente.
- [ ] El invitado acepta la invitación.
- [ ] El invitado rechaza la invitación.
- [ ] El owner ve las postulaciones del proyecto.
- [ ] El owner acepta/rechaza postulaciones.
- [ ] Al aceptar se respetan los cupos.
- [ ] El listado de participantes aceptados es correcto.
- [ ] Un usuario ajeno no puede gestionar postulaciones.
- [ ] Las notificaciones/toasts reflejan el resultado.

### 5. Calificaciones

- [ ] Se puede calificar solo después de completar el proyecto.
- [ ] No se puede calificar antes de tiempo.
- [ ] No se puede calificar a uno mismo.
- [ ] No se puede calificar dos veces a la misma persona/proyecto.
- [ ] Calificación válida entre 1 y 5.
- [ ] Promedio, conteo y distribución son correctos.
- [ ] Ratings recibidos y dados por usuario.
- [ ] Rating específico de proyecto/usuario.
- [ ] El perfil muestra la valoración actualizada.
- [ ] Un usuario ajeno no puede calificar sin permisos.

### 6. Grupos

- [ ] Listar grupos públicos autenticado.
- [ ] Crear grupo y quedar como owner automáticamente.
- [ ] El owner aparece como miembro `owner`.
- [ ] `POST /api/groups` devuelve `members` y el frontend reconoce el grupo como propio.
- [ ] `GroupsDirectory` espera `await createGroup(...)` antes de navegar.
- [ ] Ver grupo como miembro.
- [ ] Ver grupo como no miembro (sin miembros, proyectos ni solicitudes privadas).
- [ ] Solicitar acceso a un grupo.
- [ ] No se puede solicitar dos veces.
- [ ] No se puede solicitar acceso si ya es miembro.
- [ ] Owner/admin acepta solicitud y el usuario pasa a miembro.
- [ ] Owner/admin rechaza solicitud.
- [ ] Owner/admin cambia rol entre `admin` y `member`.
- [ ] Owner/admin elimina miembro (no al owner).
- [ ] Un miembro normal no puede administrar el grupo.
- [ ] Un usuario ajeno no puede ver solicitudes ni miembros privados.
- [ ] Editar nombre, descripción y visibilidad del grupo.
- [ ] Eliminar grupo como owner.
- [ ] Listar/crear proyectos de grupo como admin.
- [ ] `GET /api/groups` incluye la membresía del usuario actual o el frontend la obtiene correctamente.
- [ ] Conteo de miembros correcto en listado y detalle.

### 7. Storage

- [ ] Subir avatar JPG/PNG/WebP.
- [ ] Rechazar archivo que no sea imagen.
- [ ] Rechazar archivo mayor a 10 MB.
- [ ] Reemplazar avatar y eliminar el anterior si aplica.
- [ ] Subir imagen de proyecto como owner/admin.
- [ ] Rechazar imagen de proyecto de un usuario sin permisos.
- [ ] Eliminar imagen de proyecto.
- [ ] Las URLs públicas cargan correctamente.
- [ ] Buckets y políticas de Storage están aplicados.

### 8. Frontend y UX

- [ ] Landing pública.
- [ ] Login y registro con validación visual.
- [ ] Dashboard con métricas, grupos y actividad.
- [ ] Proyectos: listado, detalle, creación, edición y modal de aplicación.
- [ ] Personas: directorio, sidebar de filtros, tarjetas y modal de detalle.
- [ ] Grupos: directorio, creación, solicitud, detalle y workspace.
- [ ] Perfil público y perfil propio.
- [ ] Ajustes: perfil, talento, idioma y tema.
- [ ] Modales cierran con botón, overlay y Escape cuando aplique.
- [ ] Toasts de éxito/error/información.
- [ ] Estados vacíos, loading y error.
- [ ] Cambio ES/EN en toda la UI.
- [ ] Tema claro/oscuro persiste al recargar.
- [ ] Responsive en móvil, tablet y escritorio.
- [ ] Navegación por teclado y foco visible.
- [ ] Imágenes con texto alternativo.
- [ ] Recargar rutas profundas (`/grupos/:id`, `/proyectos/*`) funciona.
- [ ] No hay errores de consola ni requests fallidas inesperadas.

### 9. Integración entre capas

- [ ] El frontend envía el JWT de Supabase al backend en `Authorization`.
- [ ] El backend valida el token con Supabase.
- [ ] `api.groups.*` usa el backend y no PostgREST.
- [ ] La sincronización heredada de perfiles/proyectos no duplica datos.
- [ ] Datos creados en el backend aparecen en el frontend tras refrescar.
- [ ] Datos creados en el frontend aparecen en PostgreSQL.
- [ ] Dos navegadores/usuarios ven el mismo grupo, solicitud y proyecto.
- [ ] Las solicitudes de grupo se actualizan para owner y solicitante.
- [ ] Las postulaciones se actualizan para owner y postulante.
- [ ] Los ratings actualizan el perfil y el buscador de personas.
- [ ] El fallback local no pisa datos válidos de Supabase.
- [ ] Al cerrar sesión se limpian tokens y datos sensibles de la sesión.

### 10. Seguridad

- [ ] `.env` no está trackeado ni aparece en el bundle.
- [ ] La secret key solo existe en backend.
- [ ] `anon`/publishable no puede leer emails ni datos privados.
- [ ] RLS activo en todas las tablas públicas.
- [ ] Políticas de grupos, proyectos, postulaciones y ratings probadas con dos usuarios.
- [ ] No se puede escalar rol de `admin` a `owner`.
- [ ] No se puede auto-aceptar una postulación.
- [ ] Validación Zod cubre body, params y query.
- [ ] Prisma previene inyección SQL.
- [ ] Uploads validan tipo, tamaño y permisos.
- [ ] URLs de repo/imagen/avatar solo aceptan `http(s)`.
- [ ] Rate limiting activo.
- [ ] CORS restringido al frontend configurado.
- [ ] `npm audit` sin vulnerabilidades críticas o con riesgo aceptado.

### 11. Despliegue

- [ ] Frontend desplegado en Vercel con Root Directory `frontend`.
- [ ] Variables `VITE_*` configuradas en Vercel.
- [ ] `vercel.json` reescribe rutas profundas al `index.html`.
- [ ] Backend desplegado en un host con Node (Render/Railway/Fly/VPS).
- [ ] `DATABASE_URL`, `SUPABASE_*`, `JWT_SECRET`, `FRONTEND_URL` configuradas en el backend.
- [ ] CORS usa la URL real del frontend.
- [ ] El backend responde `/health` en producción.
- [ ] Migraciones aplicadas en producción.
- [ ] Login, grupos y storage funcionan en producción.
- [ ] Backup de base de datos antes de migrar.
- [ ] Rollback probado.

### 12. Pruebas automatizadas y CI

Actualmente no hay tests automatizados. Para considerar el proyecto al 200%:

- [ ] Tests unitarios de serializers, validaciones y helpers.
- [ ] Tests de integración del backend con Supertest y base de datos de prueba.
- [ ] Tests de componentes críticos del frontend con Vitest/React Testing Library.
- [ ] Tests E2E con Playwright: registro, login, crear grupo, solicitar acceso, crear proyecto, postularse, aceptar, calificar.
- [ ] CI en GitHub Actions con `lint`, `build` y tests.
- [ ] Cobertura mínima acordada (por ejemplo, 70% en backend).
- [ ] Seeds de prueba reproducibles.
- [ ] Limpieza de datos de prueba entre runs.

## Datos mínimos para probar el flujo completo

Crear o tener:

- 2 usuarios: owner y participante.
- 1 usuario adicional para probar permisos.
- 1 grupo con owner, admin y member.
- 1 solicitud de grupo pendiente.
- 1 proyecto de grupo en estado `open`.
- 1 postulación pendiente.
- 1 invitación pendiente.
- 1 proyecto `completed` con participantes para probar ratings.
- Avatar e imagen de proyecto para probar Storage.

## Cuentas demo locales

El frontend conserva seeds locales de demostración (`frontend/src/lib/store.js`). Sirven como fallback cuando Supabase no está configurado o el usuario demo no existe en Supabase:

| Correo | Contraseña | Perfil |
|---|---|---|
| maria@demo.com | 123456 | Creadora de proyectos web |
| carlos@demo.com | 123456 | Backend |
| ana@demo.com | 123456 | Frontend |
| andres@demo.com | 123456 | Videojuegos (Unity) |
| camila@demo.com | 123456 | Videojuegos (Godot) |

Para datos compartidos entre usuarios, crear cuentas reales desde `/register`; las cuentas demo viven en el navegador.

## Roadmap

- [x] Backend Express + Prisma.
- [x] Auth con Supabase.
- [x] Grupos públicos, solicitudes y roles.
- [x] Storage de avatares e imágenes.
- [ ] Completar migración del frontend al backend propio.
- [ ] Corregir los bloqueadores conocidos de perfiles y grupos.
- [ ] Implementar seeds compartidos.
- [ ] Tests automatizados y CI.
- [ ] Despliegue del backend y checklist de producción.
