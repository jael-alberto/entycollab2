# Entycollab Backend API

Backend API para Entycollab construido con Node.js + Express + Prisma + Supabase.

## Arquitectura

```
Frontend (React) → Backend API (Express) → Prisma → PostgreSQL (Supabase)
                                        ↘ Supabase Auth + Storage
```

El backend actúa como intermediario:
- Valida y sanitiza entradas
- Aplica reglas de negocio
- Usa **Prisma** para todas las consultas de datos de la aplicación (`public.*`)
- Usa **Supabase** solo para Auth (registro/login/tokens) y Storage (avatares/imágenes)
- Expone API REST limpia al frontend

> Prisma se conecta directamente a PostgreSQL (equivale al Service Role: bypass RLS).
> Los triggers y políticas de la base de datos siguen activos.

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
│   ├── controllers/             # Lógica de negocio
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
| GET | `/by-username/:username` | Perfil por username |
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
| GET | `/user/:userId/count` | Conteo |
| GET | `/user/:userId/distribution` | Distribución |
| GET | `/project/:projectId/user/:userId` | Rating específico |
| GET | `/project/:projectId/can-rate/:ratedId` | Verificar permiso |

### Groups (`/api/groups`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar grupos |
| GET | `/user` | Mis grupos |
| GET | `/:id` | Obtener grupo |
| POST | `/` | Crear grupo |
| PUT | `/:id` | Actualizar grupo |
| DELETE | `/:id` | Eliminar grupo |
| GET | `/:id/members` | Miembros |
| PUT | `/:id/members/:memberId` | Cambiar rol |
| DELETE | `/:id/members/:memberId` | Eliminar miembro |
| POST | `/:id/join` | Solicitar ingreso |
| PUT | `/:id/requests/:requestId` | Decidir solicitud |
| GET | `/:id/requests` | Solicitudes pendientes |
| GET | `/:id/projects` | Proyectos del grupo |
| POST | `/:id/projects` | Crear proyecto en grupo |

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
DATABASE_URL=postgresql://postgres.tu-proyecto:TU_PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres
SHADOW_DATABASE_URL=postgresql://postgres.tu-proyecto:TU_PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres

# Supabase (Service Role Key - SOLO BACKEND)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT
JWT_SECRET=tu-secreto-super-seguro
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
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

Prisma **no reemplaza** esas migraciones: `backend/prisma/schema.prisma` describe las
mismas tablas para que el cliente Prisma pueda consultarlas.

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
- **Grupos**: owner único, admin gestiona miembros/solicitudes
- **Proyectos de grupo**: solo owner/admin del grupo

## Seguridad

- Helmet.js para headers de seguridad
- CORS configurado para frontend
- Rate limiting global
- Validación Zod en todas las entradas
- Autenticación JWT (Supabase Auth)
- Verificación de ownership/roles en middleware
- Service Role Key solo en backend (nunca en frontend)

## Despliegue

El backend se puede desplegar en:
- Railway, Render, Fly.io (Node.js)
- Vercel Functions (con adaptador)
- Docker + cualquier cloud

Variables de producción requeridas en el proveedor de hosting.