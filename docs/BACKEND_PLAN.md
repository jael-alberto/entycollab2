# Plan Backend — ENTYCOLLAB (propuesta, sin implementar)

> Estado: **FASE 1 COMPLETADA** (estructura creada, lint + build en verde).
> Base de datos confirmada: **Supabase**.

## 1. Objetivo

Dejar lista solo la **estructura de archivos** para conectar el frontend actual (que hoy vive en `localStorage`) a Supabase, sin definir todavía el SQL ni la lógica, porque no tengo el contexto de tu proyecto Supabase (tablas, RLS, buckets, Auth).

## 2. Correspondencia actual → Supabase (solo nombres, sin esquema)

| Hoy (`src/lib/store.js`) | Mañana (Supabase) |
|---|---|
| `devcollab_users` | tabla `profiles` (ligada a Supabase Auth) |
| `devcollab_projects` | tabla `projects` |
| `devcollab_applications` | tabla `applications` |
| `devcollab_ratings` | tabla `ratings` |
| `devcollab_current_user, devcollab_theme, devcollab_lang` | se quedan en `localStorage` |

El detalle de columnas, tipos, constraints, RLS, triggers y políticas de Storage **lo defines tú** (o me das acceso/contexto después). Yo solo dejo las carpetas y archivos vacíos/listos.

## 3. Estructura de archivos que voy a crear (Fase 1)

```
database/supabase/
├─ migrations/
│  ├─ 0001_init.sql        # vacío, con encabezado: aquí irán profiles/projects/applications/ratings
│  └─ 0002_storage.sql     # vacío, con encabezado: aquí irán buckets y políticas
└─ seed.sql                # vacío, con encabezado: aquí irán los inserts demo cuando los definas

frontend/src/lib/
├─ supabaseClient.js       # único punto de conexión (lee VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
└─ api/
   ├─ client.js            # helpers comunes (sesión, errores) — vacío
   ├─ profiles.js          # acceso a perfiles — vacío
   ├─ projects.js          # acceso a proyectos — vacío
   ├─ applications.js      # postulaciones/invitaciones — vacío
   ├─ ratings.js           # calificaciones — vacío
   └─ storage.js           # subida de avatar/imagen — vacío

frontend/.env.example      # solo nombres de variables, sin valores:
                           # VITE_SUPABASE_URL=
                           # VITE_SUPABASE_ANON_KEY=
                           # VITE_USE_SUPABASE=false
```

Qué contendrá cada archivo en esta fase:
- Solo encabezados y `TODO` (ej. `// TODO: conectar a tabla profiles cuando el esquema esté definido`).
- Sin lógica real, sin SQL, sin llamadas a Supabase fuera del cliente base.
- Sin modificar `src/lib/store.js`, `src/context/AppContext.jsx`, `src/main.jsx`, `package.json`, `vercel.json` ni estilos.

## 4. Fases (para tu aprobación)

- **Fase 0 — Este .md.** ✅ hecha.
- **Fase 1 — Solo estructura.** ✅ hecha (carpetas + stubs + `.env.example` + §7 en README; lint + build en verde, sin tocar `store.js` ni `AppContext.jsx`).
- **Fase 2 (después, con tu esquema).** Rellenar SQL, RLS, API y conmutador `VITE_USE_SUPABASE` en `AppContext.jsx`.
- **Fase 3 (después).** Storage, seeds reales, Auth y variables en Vercel.

## 5. Lo que queda pendiente por falta de contexto (no lo propongo yo)

- Nombres finales y columnas de cada tabla en tu proyecto Supabase.
- Políticas RLS y triggers (cupos, `completed`, unicidades).
- Buckets de Storage y sus políticas.
- Proveedor de Auth (email/password, OAuth, etc.) y manejo de los passwords actuales en texto plano.
- Si se migran o no los datos demo (`seedDemoData`, `seedDemoExtraData` en `store.js`).

## 6. Lo que NO haré sin tu orden

- No instalo `@supabase/supabase-js`.
- No creo proyecto ni tablas en Supabase.
- No toco Vercel ni subo secretos.
- No reescribo `store.js` ni `AppContext.jsx`.
- No cambio UI/UX ni i18n.

## 7. Cierre Fase 1: `README.md` con arquitectura del stack

Al terminar la estructura, documento en el `README.md` la arquitectura del proyecto:

- **Frontend:** React 19 + Vite + React Router (despliegue en Vercel).
- **Backend:** Supabase (Postgres + Auth + Storage). Sin servidor propio.
- **Base de datos:** Postgres en Supabase (`profiles`, `projects`, `applications`, `ratings`).
- **Capas:** UI (`pages/`, `components/`, `modals/`) → estado global (`context/AppContext.jsx`) → capa API (`src/lib/api/`) → Supabase; persistencia local solo para sesión y preferencias (`localStorage`).
- Diagrama de flujo y qué vive en cada capa.

---
*Dime “prosigue fase 1”, “ajusta X” o “cancelado”.*
