# Despliegue de staging

Arquitectura:

```
Navegador
   │
   ▼
Vercel · entycollab-staging  (React, rama develop)
   │  VITE_API_URL=https://entycollab-backend-staging.onrender.com/api
   ▼
Render · entycollab-backend-staging  (Express, rama develop)
   │  DATABASE_URL (Session pooler IPv4)
   ▼
Supabase  (Postgres + Auth)
```

Regla de oro: el frontend **solo** habla con Render. La única llamada directa a
Supabase es Auth (login/OAuth); ningún dato se lee ni se escribe vía
`supabase.co/rest/v1`.

Ramas: `develop` = staging, `main` = producción. `main` no se toca hasta que
staging esté validado y lo confirmes.

> **Orden recomendado:** Vercel primero (paso 1) para obtener la URL pública;
> Render después (paso 2) configurando `FRONTEND_URL` con esa URL. La URL de
> Render es predecible (`https://entycollab-backend-staging.onrender.com`), así
> que el frontend puede desplegarse antes de que el backend exista.

---

## 0. Antes de empezar

Ten a mano estos valores:

| Valor | Dónde obtenerlo |
| --- | --- |
| `DATABASE_URL` | Supabase → Connect → **Session pooler** (ver aviso abajo) |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API → `service_role` / secret |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → `anon` / publishable |
| `VITE_SUPABASE_URL` | Igual que `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Igual que `SUPABASE_PUBLISHABLE_KEY` |

Los valores de `VITE_*` ya están en tu `frontend/.env` local.

> **Importante (IPv6):** el host directo `db.<ref>.supabase.co` resuelve solo a
> IPv6 y Render no tiene salida IPv6. Usa la cadena **Session pooler**
> (`aws-0-<region>.pooler.supabase.com:5432`, usuario `postgres.<ref>`), que sí
> es IPv4. No uses el Transaction pooler (6543) salvo que añadas
> `?pgbouncer=true&connection_limit=1`.

---

## 1. Frontend en Vercel (rama `develop`)

1. Vercel → **Add New… → Project** → importa `jael-alberto/entycollab2`.
2. Project Name: `entycollab-staging`.
3. **Root Directory: `./`** (raíz del repo; el `vercel.json` de la raíz ya
   define install, build, output y rewrites).
4. Verifica en Build & Output Settings:
   - Install Command: `npm --prefix frontend install`
   - Build Command: `npm --prefix frontend run build`
   - Output Directory: `frontend/dist`
5. Environment Variables (marca Production, Preview y Development):

   | Variable | Valor |
   | --- | --- |
   | `VITE_API_URL` | `https://entycollab-backend-staging.onrender.com/api` |
   | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable / anon |

   Nunca pongas la `service_role`/secret en Vercel.
6. Pulsa **Deploy**. El primer deploy sale de `main` (comportamiento por
   defecto de Vercel); da igual, lo corregimos ahora.
7. Settings → **Environments** → entorno **Production** → **Branch Tracking**:
   cambia la rama a **`develop`** y guarda.
8. Deployments → **Create Deployment** → introduce la rama **`develop`** →
   **Create Deployment**. Ese build será el de producción y quedará asociado al
   dominio del proyecto.
9. Anota el dominio resultante, p. ej. `https://entycollab-staging.vercel.app`
   (si el nombre estaba ocupado, Vercel añade un sufijo). Ese es el valor que
   usará Render en `FRONTEND_URL`.

> El frontend cargará, pero las llamadas a la API fallarán hasta que exista el
> backend del paso 2. Es esperado.

---

## 2. Backend en Render (rama `develop`)

### Opción recomendada: Blueprint

1. Render Dashboard → **New +** → **Blueprint**.
2. Conecta el repo `jael-alberto/entycollab2`.
3. Branch: **`develop`**.
4. Blueprint Path: **`render.staging.yaml`** (no `render.yaml`).
5. Aplica el Blueprint. Render pedirá las variables marcadas con `sync: false`:

   | Variable | Valor |
   | --- | --- |
   | `FRONTEND_URL` | dominio de Vercel del paso 1 (sin `/` final) |
   | `DATABASE_URL` | Session pooler de Supabase |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_SECRET_KEY` | secret / service_role |
   | `SUPABASE_PUBLISHABLE_KEY` | publishable / anon |

   `JWT_SECRET` se genera solo. `NODE_ENV`, `ALLOW_VERCEL_PREVIEWS` y los límites
   de rate limit ya vienen en el YAML. Render inyecta `PORT` automáticamente: no
   lo definas.

6. Espera el primer deploy y abre:
   `https://entycollab-backend-staging.onrender.com/health`
   Debe responder `{"status":"ok",...}`.

7. Si Render asignó un subdominio distinto (nombre ocupado), copia la URL real,
   actualiza `VITE_API_URL` en Vercel y vuelve a desplegar el frontend.

### Alternativa manual (New → Web Service)

Si prefieres no usar Blueprint:

- Repository / Branch: `entycollab2` / `develop`
- Root Directory: `backend`
- Runtime: Node
- Build Command: `npm install --include=dev && npx prisma generate`
- Start Command: `npm start`
- Health Check Path: `/health`
- Instance Type: Free · Region: Oregon
- Environment: las mismas variables de la tabla anterior, más
  `NODE_ENV=production` y `ALLOW_VERCEL_PREVIEWS=true`.

---

## 3. Cerrar CORS y Auth

1. **Render** → servicio staging → Environment → `FRONTEND_URL` debe ser el
   dominio de Vercel staging. Puedes poner varios separados por coma:
   `https://entycollab-staging.vercel.app,http://localhost:5173`
   Si lo cambias, guarda y espera el redeploy.
2. **Supabase** → Authentication → URL Configuration:
   - Site URL: `https://entycollab-staging.vercel.app`
   - Redirect URLs: añade `https://entycollab-staging.vercel.app/**` y
     `http://localhost:5173/**`
3. Si usas OAuth (Google/GitHub), revisa que el proveedor permita el dominio de
   staging.

> Mientras `ALLOW_VERCEL_PREVIEWS=true`, cualquier `*.vercel.app` pasa CORS. Al
> pasar a producción se pondrá en `false` y solo el dominio exacto.

---

## 4. Verificación end-to-end

- [ ] `GET /health` responde `ok`.
- [ ] La home de staging carga sin errores de consola.
- [ ] DevTools → Network: las peticiones van a
      `entycollab-backend-staging.onrender.com/api/...`; **no** aparece
      `supabase.co/rest/v1`.
- [ ] Registro y login funcionan.
- [ ] Al recargar, la sesión persiste (refresh token).
- [ ] Cambio de email y de contraseña funcionan.
- [ ] Listado y detalle de grupos cargan.
- [ ] Crear grupo / solicitar acceso / aceptar solicitud funciona.
- [ ] Crear proyecto y postularse funciona.
- [ ] Subida de imagen/storage funciona.
- [ ] Sin errores CORS en consola.

Nota: el plan free de Render duerme tras ~15 min sin tráfico; la primera
petición puede tardar ~50 s (cold start). Es esperado.

---

## 5. Problemas comunes

| Síntoma | Causa / solución |
| --- | --- |
| `P1001: Can't reach database server` | `DATABASE_URL` usa el host directo IPv6. Cambia al Session pooler. |
| 502/503 en la primera petición | Cold start del plan free; reintenta tras ~1 min. |
| Error CORS en el navegador | `FRONTEND_URL` no coincide con el origen exacto (sin `/` final) o falta redeploy. |
| `prisma generate` falla en build | Falta `DATABASE_URL` en el entorno de Render (las env vars están disponibles en build). |
| 429 Too Many Requests | Rate limit: 100 req / 15 min. Sube `RATE_LIMIT_MAX_REQUESTS` si hace falta. |
| Login funciona pero datos no cargan | `VITE_API_URL` mal (debe terminar en `/api`) o backend dormido. |
| El sitio llama a `localhost:3001` | Falta `VITE_API_URL` en Vercel o no se redeployó tras añadirla. |

---

## 6. Staging con Supabase propio (opcional)

Por defecto staging comparte la base de datos de producción: los datos son los
mismos y las pruebas pueden ensuciar producción. Si quieres aislarlo:

1. Crea un proyecto Supabase nuevo (región cercana a Oregon).
2. Ejecuta en orden `database/supabase/migrations/0001_init.sql`,
   `0002_storage.sql`, `0003_security_hardening.sql`.
3. Copia la nueva cadena **Session pooler** y actualiza `DATABASE_URL` en Render.
4. Actualiza `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `SUPABASE_PUBLISHABLE_KEY`
   en Render, y `VITE_SUPABASE_*` en Vercel.
5. Redeploy de ambos.

Ojo: cambiar de proyecto Supabase invalida los usuarios existentes (Auth vive en
el proyecto).

---

## 7. Después de validar staging

Solo cuando lo confirmes:

1. Merge `develop` → `main`.
2. Render → New + → Blueprint desde `main` con `render.yaml`
   (servicio `entycollab-backend`, `ALLOW_VERCEL_PREVIEWS=false`).
3. Vercel producción: mismos build settings de la raíz y
   `VITE_API_URL=https://<backend-produccion>.onrender.com/api`.
4. `FRONTEND_URL` exacto del dominio de producción y URLs de Auth en Supabase.
5. Repetir la verificación del paso 4 contra producción.
