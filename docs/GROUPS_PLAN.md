# Grupos — diseño funcional

## Objetivo

Un grupo representa una empresa o equipo privado dentro de ENTYCOLLAB. Sus
proyectos solo son visibles para miembros autorizados y se trabajan en un
contexto aislado del inicio de la plataforma.

## Roles

| Rol | Capacidades |
| --- | --- |
| Creador | Crea el grupo, acepta o rechaza solicitudes y designa administradores. |
| Administrador | Acepta o rechaza solicitudes y crea/gestiona proyectos del grupo. No puede cambiar los roles administrativos. |
| Miembro | Ve el espacio y sus proyectos; no crea proyectos del grupo. |
| No miembro | Ve el grupo en el directorio y puede solicitar acceso, pero no ve sus proyectos ni miembros. |

## Flujo

1. Una empresa crea un grupo y se convierte en su creador.
2. Cualquier persona puede ver el grupo en el directorio y enviar una solicitud.
3. Un administrador acepta o rechaza la solicitud.
4. Al entrar, el grupo queda como contexto activo: la sección de proyectos
   muestra solamente proyectos con ese `groupId`.
5. Al volver a Inicio se limpia el contexto activo y reaparecen los proyectos
   personales/globales.
6. En la creación de un proyecto, un administrador declara los roles buscados.
   Al aceptar una postulación asigna el rol concreto; este se muestra en el
   historial del participante.

## Ubicación técnica

- `frontend/src/pages/Groups.jsx`: directorio, solicitud y área administrativa.
- `frontend/src/context/AppContext.jsx`: reglas de membresía, permisos y
  contexto activo.
- `frontend/src/lib/store.js`: persistencia temporal en `localStorage`.
- `frontend/src/modals/CreateProjectModal.jsx` y
  `frontend/src/modals/ProjectDetailModal.jsx`: definición y asignación de
  roles de proyecto.
- `backend/`: sin cambios en esta fase. Cuando se conecte Supabase/API, las
  operaciones de autorización deberán imponerse en servidor/RLS; el frontend
  no será la frontera de seguridad.
