# Entycollab Backend API

Backend API para Entycollab construido con **Node.js + Express + Prisma + PostgreSQL**. Los datos de la aplicación (grupos, proyectos, postulaciones, calificaciones) usan **Prisma** directamente sobre PostgreSQL. Supabase se usa solo para **Auth** (registro/login/tokens) y **Storage** (avatares/imágenes).

## Arquitectura

```
Frontend (React) → Backend API (Express) → Prisma → PostgreSQL
                                   ↘ Supabase Auth + Storage
```

> **Prisma se conecta directamente a PostgreSQL** (equivale al Service Role: bypass RLS).
> Los triggers y políticas de la base de datos siguen activos.
> El backend ya no consulta Supabase PostgREST para datos de aplicación.

## Estructura

```
backend/
├── prisma/
│   └── schema.prisma            # Modelos Prisma (public + puente auth.users)
├── src/
│   ├── index.js                 # Entry point
│   ├── config/
│   │   ├── env.js               # Variables de entorno validadas
│   │   ├── prisma.js            # Cliente Prisma singleton
│   │   └── supabase.js          # Cliente Supabase (Auth + Storage)
│   ├── middleware/
│   │   ├── auth.js              # JWT auth, ownership, group roles
│   │   ├── validation.js        # Zod schemas
│   │   └── errorHandler.js      # Errores centralizados (Prisma + triggers)
│   ├── utils/
│   │   └── serializers.js       # camelCase (Prisma) → snake_case (API)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── profileController.js
│   │   ├── projectController.js
│   │   ├── applicationController.js
│   │   ├── ratingController.js
│   │   ├── groupController.js
│   │   └── storageController.js
│   └── routes/                  # Definición de endpoints
│       ├── authRoutes.js
│       ├── profileRoutes.js
│       ├── projectRoutes.js
│       ├── applicationRoutes.js
│       ├── ratingRoutes.js
│       ├── groupRoutes.js
│       └── storageRoutes.js
├── .env.example
└── package.json
```

## Endpoints API

### Auth (`/api/auth`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/register` | Registro de usuario |
| POST | `/login` | Inicio de sesión |
| POST | `/logout` | Cerrar sesión |
| GET | `/me` | Usuario actual |
| POST | `/refresh` | Renovar access token |

### Profiles (`/api/profiles`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar perfiles |
| GET | `/search?q=` | Buscar perfiles |
| GET | `/available` | Personas disponibles (filtros) |
| GET | `/:id` | Obtener perfil |
| PUT | `/:id` | Actualizar perfil |
| PUT | `/:id/availability` | Toggle disponibilidad |
| PUT | `/:id/featured` | Guardar proyectos destacados |
| GET | `/:id/stats` | Estadísticas |
| GET | `/:id/history` | Historial proyectos |
| GET | `/:id/ratings` | Calificaciones recibidas |

### Projects (`/api/projects`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar proyectos (filtros, paginación) |
| GET | `/:id` | Obtener proyecto con aplicaciones |
| POST | `/` | Crear proyecto |
| PUT | `/:id` | Actualizar proyecto |
| PUT | `/:id/status` | Cambiar estado |
| DELETE | `/:id` | Eliminar proyecto |
| GET | `/user/:userId` | Proyectos de usuario |
| GET | `/user/:userId/featured` | Proyectos destacados |
| PUT | `/user/:userId/featured` | Guardar destacados |
| GET | `/:id/can-rate/:ratedId` | Verificar si puede calificar |

### Applications (`/api/applications`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/apply` | Postularse a proyecto |
| POST | `/invite` | Invitar a proyecto |
| PUT | `/:id` | Gestionar postulación (owner) |
| PUT | `/:id/respond` | Responder invitación (invitado) |
| GET | `/user` | Mis postulaciones |
| GET | `/project/:projectId` | Postulaciones a proyecto |
| GET | `/invites/pending` | Invitaciones pendientes |
| GET | `/check/:projectId` | Verificar si aplicó |
| GET | `/project/:projectId/accepted` | Participantes aceptados |

### Ratings (`/api/ratings`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/project/:projectId` | Guardar calificaciones |
| GET | `/project/:projectId` | Calificaciones de proyecto |
| GET | `/user/:userId/received` | Calificaciones recibidas |
| GET | `/user/:userId/given` | Calificaciones dadas |
| GET | `/user/:userId/average` | Promedio |
| GET | `/user/:UserId/count` | Conteo |
| GET | `/user/:userId/distribution` | Distribución |
| GET | `/project/:projectId/user/:userId` | Rating específico |
| GET | `/project/:projectId/can-rate/:ratedId` | Verificar permiso |

### Groups (`/api/groups`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar grupos (todos son públicos) |
| GET | `/user` | Mis grupos |
| GET | `/:id` | Obtener grupo (vista pública o completa según membresía) |
| POST | `/` | Crear grupo (público por defecto) |
| PUT | `/:id` | Actualizar grupo (owner/admin) |
| DELETE | `/:id` | Eliminar grupo (owner) |
| GET | `/:id/members` | Miembros (requiere membresía) |
| PUT | `/:id/members/:memberId` | Cambiar rol (owner/admin) |
| DELETE | `/:id/members/:memberId` | Eliminar miembro (owner) |
| POST | `/:id/join` | Solicitar ingreso (siempre requiere aprobación) |
| PUT | `/:id/requests/:requestId` | Decidir solicitud (owner/admin) |
| GET | `/:id/requests` | Solicitudes pendientes (owner/admin) |
| GET | `/:id/projects` | Proyectos del grupo (requiere membresía) |
| POST | `/:id/projects` | Crear proyecto en grupo (owner/admin) |

### Storage (`/api/storage`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/avatar` | Subir avatar (multipart) |
| DELETE | `/avatar` | Eliminar avatar |
| POST | `/project-image` | Subir imagen proyecto (multipart) |
| DELETE | `/project-image` | Eliminar imagen proyecto |

## Variables de Entorno

```env
# Servidor
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Base de datos (Prisma)
DATABASE_URL=postgresql://entylab:entylabpass@localhost:5432/entylab?schema=public
SHADOW_DATABASE_URL=postgresql://entylab:entylabpass@localhost:5432/entylab?schema=public

# Supabase (Service Role Key - SOLO BACKEND)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT
JWT_SECRET=tu-secreto-super-seguro
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

## Instalación

```bash
# Desde la raíz del proyecto
npm run setup

# O manualmente
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
npx prisma generate
npm run dev
```

## Base de Datos

El esquema de la base de datos ya está definido en `database/supabase/migrations`:

1. `database/supabase/migrations/0001_init.sql` - Esquema completo
2. `database/supabase/migrations/0002_storage.sql` - Buckets y políticas
3. `database/supabase/migrations/0003_security_hardening.sql` - RLS, triggers y validaciones
4. `database/supabase/seed.sql` - Datos demo (opcional)

**Prisma no reemplaza** esas migraciones: `backend/prisma/schema.prisma` describe las mismas tablas para que el cliente Prisma pueda consultarlas.

### Comandos Prisma

```bash
npm run prisma:validate   # Valida el schema
npm run prisma:generate   # Genera el cliente en node_modules/@prisma/client
npm run prisma:format     # Formatea el schema
npm run prisma:studio     # Abre Prisma Studio
npm run prisma:db:pull    # Introspección (sobrescribe el schema: úsalo con cuidado)
```

> ⚠️ **No uses `prisma migrate dev` ni `prisma db push` contra la base de datos existente**
> sin revisar antes el diff. Prisma no modela RLS, triggers, políticas ni el índice único
> parcial `uq_group_requests_pending`, y `db push` podría intentar eliminarlos.
> Para pruebas, ejecuta primero las migraciones SQL de Supabase y luego `prisma generate`.

### Notas sobre Prisma + Supabase

- `auth.users` se declara como `AuthUser` con `@@ignore`: Prisma nunca la crea ni la modifica.
- `Profile.authUser` también está ignorado (solo documenta la relación 1:1).
- Los controladores fijan explícitamente `decidedBy`/`decidedAt` porque los triggers usan
  `auth.uid()`, que es `NULL` en conexiones directas de Prisma.
- Los triggers de PostgreSQL siguen validando cupos, calificaciones y solicitudes.

## Reglas de Negocio Implementadas

- **Postulaciones**: único por usuario/proyecto, rating mínimo, no owner
- **Invitaciones**: solo owner, único, cupos disponibles
- **Aceptación**: solo owner, valida cupos (trigger DB)
- **Cambio estado**: completed requiere ≥1 aceptado
- **Calificaciones**: solo owner, solo completados, solo aceptados, upsert único
- **Grupos**: owner único, admin gestiona miembros/solicitudes. **Todos los grupos son públicos**.
- **Proyectos de grupo**: solo owner/admin del grupo
- **Acceso a grupos**: cualquier persona puede ver la información básica; para ver proyectos/lista de miembros/hacer solicitudes, se requiere ser miembro (aprobación de admin/owner).

## Seguridad

- Helmet.js para headers de seguridad
- CORS configurado para frontend
- Rate limiting global
- Validación Zod en todas las entradas
- Autenticación JWT (Supabase Auth)
- Verificación de ownership/roles en middleware
- Service Role Key solo en backend (nunca en frontend)

## Próximos pasos - Qué probar / hacer

1. **Configurar la base de datos**
   - Tener PostgreSQL corriendo con la base de datos indicada en `DATABASE_URL` (en `backend/.env`).
   - Ejecutar las migraciones SQL de Supabase primero.
   - Ejecutar `npx prisma generate`.

2. **Levantar el backend**
   - `cd backend && npm run dev`
   - El servidor deberá iniciar en `http://localhost:3001`.

3. **Levantar el frontend**
   - `cd frontend && npm run dev`
   - La app debería abrirse en `http://localhost:5173`.

4. **Probar el flujo de grupos públicos**
   - **Crear un grupo**: Ir a "Crear grupo", llenar nombre/descripción. El grupo aparecerá público.
   - **Ver directorio**: Todos los grupos se ven en la página de grupos. Badge `GRUPO PÚBLICO`.
   - **Solicitar acceso (no miembro)**: Clic en "Solicitar acceso". Se crea una `groupRequest` con status `pending`. El dueño/admin recibirá la solicitud.
   - **Admin aprueba solicitud**: El dueño/admin ve las solicitudes en `/:id/requests` y aprueba una. El usuario pasa a ser `member` del grupo.
   - **Como miembro**: Ahora el usuario puede ver proyectos del grupo, la lista de miembros, y puede crear proyectos en el grupo.
   - **Pitch de postulante**: Al aplicar a un proyecto (`/apply`), el owner verá el pitch (`a.pitch || a.message`) en el modal de detalle del proyecto.

5. **Probar reglas de membresía**
   - Un usuario no miembro no debe poder ver `/:id/projects`, `/:id/members` ni `/:id/requests` (recibirá `ForbiddenError`).
   - Un usuario miembro normal solo ve sus propias solicitudes en `/:id/requests`.
   - Solo owner/admin pueden cambiar roles, expulsar miembros y aprobar/rechazar solicitudes.

6. **Verificar is_private**
   - El campo `is_private` sigue existiendo en el schema pero **no restringe la visibilidad**.
   - `createGroup` crea grupos con `is_private: false` por defecto.
   - `updateGroup` acepta `isPrivate` pero no tiene efecto en la UI/visibilidad actual.

7. **Probar storage y auth**
   - Register/login con Supabase Auth.
   - Subir/eliminar avatares e imágenes de proyecto.

8. **Ejecutar lints y validaciones**
   - `cd backend && npm run lint` (oxlint) - debería tener solo warnings preexistentes.
   - `cd frontend && npx oxlint@1.81.0 "src/**/*.jsx"` - warnings solo de dependencias useEffect/useCallback.

### Comandos útiles

```bash
# Verificar que Prisma funciona
cd backend
npx prisma generate
npx prisma validate

# Ver la schema generada
npx prisma studio

# Probar conexión a BD
node -e "require('@prisma/client').PrismaClient"

# Reiniciar dev servers
# Backend: Ctrl+C y npm run dev
# Frontend: Ctrl+C y npm run dev
```