# Entycollab Backend API

Backend API para Entycollab construido con Node.js + Express + Supabase.

## Arquitectura

```
Frontend (React) → Backend API (Express) → Supabase (Postgres + Auth + Storage)
```

El backend actúa como intermediario:
- Valida y sanitiza entradas
- Aplica reglas de negocio
- Usa **Service Role Key** de Supabase para bypass RLS
- Expone API REST limpia al frontend

## Estructura

```
backend/
├── src/
│   ├── index.js                 # Entry point
│   ├── config/
│   │   ├── env.js               # Variables de entorno validadas
│   │   └── supabase.js          # Cliente Supabase (admin + user)
│   ├── middleware/
│   │   ├── auth.js              # JWT auth, ownership, group roles
│   │   ├── validation.js        # Zod schemas
│   │   └── errorHandler.js      # Errores centralizados
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
npm run dev
```

## Base de Datos

Ejecuta las migraciones en Supabase SQL Editor:

1. `database/supabase/migrations/0001_init.sql` - Esquema completo
2. `database/supabase/migrations/0002_storage.sql` - Buckets y políticas
3. `database/supabase/seed.sql` - Datos demo (opcional)

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