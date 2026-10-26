-- ==========================================================================
-- ENTYCOLLAB · Migración 0002 · Endurecimiento de seguridad
-- Ejecutar UNA sola vez en: Supabase → SQL Editor (primero en Staging).
-- Todo va dentro de una transacción: si algo falla, no se aplica nada.
--
-- Corrige:
--  1. Recursión infinita en políticas de group_members
--  2. Escalada de privilegios (admin -> owner, auto-aceptarse en proyectos)
--  3. Emails de todos los usuarios expuestos públicamente
--  4. Funciones SECURITY DEFINER sin search_path fijo (inyección vía search_path)
--  5. Acceso del rol anon a tablas y funciones
--  6. Columnas sensibles modificables (owner_id, user_id, project_id...)
--  7. Validaciones de longitud/formato (anti abuso, anti XSS por URLs)
--  8. Condición de carrera al aceptar postulaciones (exceso de cupos)
-- ==========================================================================

begin;

-- ==========================================================================
-- 0. ESQUEMA PRIVADO PARA FUNCIONES AUXILIARES (no expuesto por la API)
-- ==========================================================================
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ==========================================================================
-- 1. FUNCIONES AUXILIARES PARA POLÍTICAS (evitan la recursión de RLS)
-- ==========================================================================

create or replace function private.is_group_member(p_group uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.group_members gm
        where gm.group_id = p_group and gm.user_id = (select auth.uid())
    );
$$;

create or replace function private.is_group_admin(p_group uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.group_members gm
        where gm.group_id = p_group
          and gm.user_id = (select auth.uid())
          and gm.role in ('owner', 'admin')
    );
$$;

create or replace function private.is_group_owner(p_group uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.group_members gm
        where gm.group_id = p_group
          and gm.user_id = (select auth.uid())
          and gm.role = 'owner'
    );
$$;

create or replace function private.is_project_owner(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.projects p
        where p.id = p_project and p.owner_id = (select auth.uid())
    );
$$;

create or replace function private.can_manage_project(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.projects p
        where p.id = p_project
          and (
              p.owner_id = (select auth.uid())
              or (p.group_id is not null and private.is_group_admin(p.group_id))
          )
    );
$$;

create or replace function private.can_apply_to_project(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.projects p
        where p.id = p_project
          and p.status = 'open'
          and p.owner_id <> (select auth.uid())
          and (p.group_id is null or private.is_group_member(p.group_id))
    );
$$;

revoke all on function private.is_group_member(uuid)        from public, anon;
revoke all on function private.is_group_admin(uuid)         from public, anon;
revoke all on function private.is_group_owner(uuid)         from public, anon;
revoke all on function private.is_project_owner(uuid)       from public, anon;
revoke all on function private.can_manage_project(uuid)     from public, anon;
revoke all on function private.can_apply_to_project(uuid)   from public, anon;
grant execute on function private.is_group_member(uuid)      to authenticated;
grant execute on function private.is_group_admin(uuid)       to authenticated;
grant execute on function private.is_group_owner(uuid)       to authenticated;
grant execute on function private.is_project_owner(uuid)     to authenticated;
grant execute on function private.can_manage_project(uuid)   to authenticated;
grant execute on function private.can_apply_to_project(uuid) to authenticated;

-- ==========================================================================
-- 2. TRIGGER GENÉRICO: COLUMNAS INMUTABLES
--    Desde la API (anon/authenticated) estas columnas no se pueden cambiar.
--    Desde el SQL Editor / service_role sí (para mantenimiento).
-- ==========================================================================
create or replace function private.protect_immutable_columns()
returns trigger language plpgsql set search_path = ''
as $$
declare
    col text;
begin
    if current_user not in ('anon', 'authenticated') then
        return new;
    end if;
    foreach col in array tg_argv loop
        if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
            raise exception 'La columna "%" no se puede modificar', col
                using errcode = '42501';
        end if;
    end loop;
    return new;
end;
$$;

drop trigger if exists trg_protect_profiles on public.profiles;
create trigger trg_protect_profiles before update on public.profiles
    for each row execute function private.protect_immutable_columns('id', 'email', 'created_at');

drop trigger if exists trg_protect_groups on public.groups;
create trigger trg_protect_groups before update on public.groups
    for each row execute function private.protect_immutable_columns('id', 'owner_id', 'created_at');

drop trigger if exists trg_protect_group_members on public.group_members;
create trigger trg_protect_group_members before update on public.group_members
    for each row execute function private.protect_immutable_columns('group_id', 'user_id', 'joined_at');

drop trigger if exists trg_protect_group_requests on public.group_requests;
create trigger trg_protect_group_requests before update on public.group_requests
    for each row execute function private.protect_immutable_columns('id', 'group_id', 'user_id', 'requested_at');

drop trigger if exists trg_protect_projects on public.projects;
create trigger trg_protect_projects before update on public.projects
    for each row execute function private.protect_immutable_columns('id', 'owner_id', 'created_at');

drop trigger if exists trg_protect_applications on public.applications;
create trigger trg_protect_applications before update on public.applications
    for each row execute function private.protect_immutable_columns('id', 'project_id', 'user_id', 'invited_by', 'applied_at', 'message');

drop trigger if exists trg_protect_ratings on public.ratings;
create trigger trg_protect_ratings before update on public.ratings
    for each row execute function private.protect_immutable_columns('id', 'project_id', 'rated_user_id', 'rated_by', 'created_at');

-- ==========================================================================
-- 3. REESCRITURA DE FUNCIONES SECURITY DEFINER (search_path fijo + nombres calificados)
-- ==========================================================================

-- 3.1 Crear perfil al registrarse (compatible con Google y GitHub)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
    v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    v_name     text  := left(coalesce(nullif(v_meta->>'full_name', ''), nullif(v_meta->>'name', ''), ''), 100);
    v_avatar   text  := coalesce(v_meta->>'avatar_url', v_meta->>'picture');
    v_user     text  := lower(regexp_replace(
                            coalesce(v_meta->>'user_name', v_meta->>'preferred_username', ''),
                            '[^a-zA-Z0-9_-]', '', 'g'));
    v_fallback text  := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
begin
    if length(v_user) < 3 then
        v_user := v_fallback;
    end if;
    v_user := left(v_user, 30);

    if v_avatar is not null and v_avatar !~* '^https://' then
        v_avatar := null;
    end if;

    begin
        insert into public.profiles (id, name, username, email, avatar)
        values (new.id, v_name, v_user, new.email, v_avatar);
    exception when unique_violation then
        insert into public.profiles (id, name, username, email, avatar)
        values (new.id, v_name, v_fallback, new.email, v_avatar);
    end;

    return new;
end;
$$;

-- 3.2 Owner del grupo como miembro 'owner'
create or replace function public.add_group_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
    insert into public.group_members (group_id, user_id, role, joined_at)
    values (new.id, new.owner_id, 'owner', now())
    on conflict (group_id, user_id) do nothing;
    return new;
end;
$$;

-- 3.3 Resolver solicitudes de grupo
create or replace function public.accept_group_request()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
    if old.status = 'pending' and new.status in ('accepted', 'rejected') then
        new.decided_at := coalesce(new.decided_at, now());
        new.decided_by := coalesce((select auth.uid()), new.decided_by);
        if new.status = 'accepted' then
            insert into public.group_members (group_id, user_id, role, joined_at)
            values (new.group_id, new.user_id, 'member', now())
            on conflict (group_id, user_id) do nothing;
        end if;
    elsif new.status is distinct from old.status then
        raise exception 'La solicitud ya fue resuelta';
    end if;
    return new;
end;
$$;

-- 3.4 Validar cupos (con bloqueo para evitar condiciones de carrera)
create or replace function public.validate_project_slots()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
    accepted_count integer;
    project_slots  integer;
begin
    if new.status in ('accepted', 'rejected') and old.status is distinct from new.status then
        new.responded_at := now();
    end if;

    if new.status = 'accepted' and old.status is distinct from 'accepted' then
        select slots into project_slots
        from public.projects where id = new.project_id
        for update;

        select count(*) into accepted_count
        from public.applications
        where project_id = new.project_id and status = 'accepted' and id <> new.id;

        if accepted_count >= project_slots then
            raise exception 'No hay cupos disponibles en este proyecto';
        end if;
    end if;
    return new;
end;
$$;

-- 3.5 Validar calificaciones
create or replace function public.validate_rating()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
    if new.rated_by = new.rated_user_id then
        raise exception 'No puedes calificarte a ti mismo';
    end if;

    if not exists (
        select 1
        from public.projects p
        join public.applications a on a.project_id = p.id
        where p.id = new.project_id
          and p.owner_id = new.rated_by
          and a.user_id = new.rated_user_id
          and a.status = 'accepted'
          and p.status = 'completed'
    ) then
        raise exception 'Solo el owner puede calificar participantes aceptados de proyectos completados';
    end if;

    new.updated_at := now();
    return new;
end;
$$;

-- Las funciones de trigger no deben ser invocables por nadie desde la API
revoke all on function public.handle_new_user()        from public, anon, authenticated;
revoke all on function public.add_group_owner()        from public, anon, authenticated;
revoke all on function public.accept_group_request()   from public, anon, authenticated;
revoke all on function public.validate_project_slots() from public, anon, authenticated;
revoke all on function public.validate_rating()        from public, anon, authenticated;

-- 3.6 Funciones de consulta (SECURITY INVOKER, respetan RLS) con search_path fijo
create or replace function public.get_user_avg_rating(p_user_id uuid)
returns numeric(3,2) language sql stable set search_path = ''
as $$
    select coalesce(round(avg(stars)::numeric, 2), 0)
    from public.ratings
    where rated_user_id = p_user_id;
$$;

create or replace function public.get_user_rating_count(p_user_id uuid)
returns integer language sql stable set search_path = ''
as $$
    select count(*)::integer from public.ratings where rated_user_id = p_user_id;
$$;

create or replace function public.get_completed_projects_count(p_user_id uuid)
returns integer language sql stable set search_path = ''
as $$
    select count(distinct p.id)::integer
    from public.projects p
    left join public.applications a
        on a.project_id = p.id and a.user_id = p_user_id and a.status = 'accepted'
    where p.status = 'completed'
      and (p.owner_id = p_user_id or a.id is not null);
$$;

create or replace function public.can_rate_user(p_project_id uuid, p_rater_id uuid, p_rated_id uuid)
returns boolean language sql stable set search_path = ''
as $$
    select exists (
        select 1
        from public.projects p
        join public.applications a on a.project_id = p.id
        where p.id = p_project_id
          and p.owner_id = p_rater_id
          and a.user_id = p_rated_id
          and a.status = 'accepted'
          and p.status = 'completed'
    );
$$;

create or replace function public.get_project_available_slots(p_project_id uuid)
returns integer language sql stable set search_path = ''
as $$
    select (p.slots - count(a.id))::integer
    from public.projects p
    left join public.applications a on a.project_id = p.id and a.status = 'accepted'
    where p.id = p_project_id
    group by p.slots;
$$;

revoke all on function public.get_user_avg_rating(uuid)                 from public, anon;
revoke all on function public.get_user_rating_count(uuid)               from public, anon;
revoke all on function public.get_completed_projects_count(uuid)        from public, anon;
revoke all on function public.can_rate_user(uuid, uuid, uuid)           from public, anon;
revoke all on function public.get_project_available_slots(uuid)         from public, anon;
grant execute on function public.get_user_avg_rating(uuid)              to authenticated;
grant execute on function public.get_user_rating_count(uuid)            to authenticated;
grant execute on function public.get_completed_projects_count(uuid)     to authenticated;
grant execute on function public.can_rate_user(uuid, uuid, uuid)        to authenticated;
grant execute on function public.get_project_available_slots(uuid)      to authenticated;

-- ==========================================================================
-- 4. POLÍTICAS RLS REESCRITAS
-- ==========================================================================

-- 4.0 Eliminar todas las políticas anteriores
drop policy if exists "Profiles visible to all"       on public.profiles;
drop policy if exists "Users update own profile"      on public.profiles;
drop policy if exists "Users insert own profile"      on public.profiles;

drop policy if exists "Groups readable"               on public.groups;
drop policy if exists "Users create groups"           on public.groups;
drop policy if exists "Owners update groups"          on public.groups;
drop policy if exists "Owners delete groups"          on public.groups;

drop policy if exists "Members readable"              on public.group_members;
drop policy if exists "Admins manage members"         on public.group_members;
drop policy if exists "Owners promote/demote"         on public.group_members;
drop policy if exists "Admins remove members"         on public.group_members;

drop policy if exists "Requests readable"             on public.group_requests;
drop policy if exists "Users request join"            on public.group_requests;
drop policy if exists "Admins decide requests"        on public.group_requests;

drop policy if exists "Projects readable"             on public.projects;
drop policy if exists "Users create projects"         on public.projects;
drop policy if exists "Owners update projects"        on public.projects;
drop policy if exists "Owners delete projects"        on public.projects;

drop policy if exists "Applications readable"         on public.applications;
drop policy if exists "Users apply themselves"        on public.applications;
drop policy if exists "Owners manage applications"    on public.applications;

drop policy if exists "Ratings readable"              on public.ratings;
drop policy if exists "Owners rate participants"      on public.ratings;
drop policy if exists "Owners update own ratings"     on public.ratings;

-- Forzar RLS (también aplica al dueño de la tabla en conexiones directas)
alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.group_requests enable row level security;
alter table public.projects       enable row level security;
alter table public.applications   enable row level security;
alter table public.ratings        enable row level security;

-- 4.1 profiles ---------------------------------------------------------
create policy profiles_select on public.profiles
    for select to authenticated using (true);

create policy profiles_insert_own on public.profiles
    for insert to authenticated
    with check ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
    for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

-- 4.2 groups -----------------------------------------------------------
create policy groups_select on public.groups
    for select to authenticated
    using (
        not is_private
        or owner_id = (select auth.uid())
        or private.is_group_member(id)
    );

create policy groups_insert on public.groups
    for insert to authenticated
    with check (owner_id = (select auth.uid()));

create policy groups_update on public.groups
    for update to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

create policy groups_delete on public.groups
    for delete to authenticated
    using (owner_id = (select auth.uid()));

-- 4.3 group_members ----------------------------------------------------
create policy group_members_select on public.group_members
    for select to authenticated
    using (
        user_id = (select auth.uid())
        or private.is_group_member(group_id)
    );

-- El owner puede añadir 'member' o 'admin'; un admin solo 'member'.
-- Nadie puede crear un 'owner' por la API (lo hace el trigger al crear el grupo).
create policy group_members_insert on public.group_members
    for insert to authenticated
    with check (
        (private.is_group_owner(group_id) and role in ('member', 'admin'))
        or (private.is_group_admin(group_id) and role = 'member')
    );

-- Solo el owner cambia roles, y solo entre 'admin' y 'member'.
create policy group_members_update on public.group_members
    for update to authenticated
    using (private.is_group_owner(group_id) and role <> 'owner')
    with check (private.is_group_owner(group_id) and role in ('admin', 'member'));

-- Cada quien puede salirse; el owner expulsa a cualquiera (menos owner);
-- un admin solo expulsa a 'member'.
create policy group_members_delete on public.group_members
    for delete to authenticated
    using (
        role <> 'owner'
        and (
            user_id = (select auth.uid())
            or private.is_group_owner(group_id)
            or (private.is_group_admin(group_id) and role = 'member')
        )
    );

-- 4.4 group_requests ---------------------------------------------------
create policy group_requests_select on public.group_requests
    for select to authenticated
    using (
        user_id = (select auth.uid())
        or private.is_group_admin(group_id)
    );

-- Solo se puede crear en estado 'pending', a nombre propio y si aún no es miembro.
create policy group_requests_insert on public.group_requests
    for insert to authenticated
    with check (
        user_id = (select auth.uid())
        and status = 'pending'
        and decided_at is null
        and decided_by is null
        and not private.is_group_member(group_id)
    );

create policy group_requests_update on public.group_requests
    for update to authenticated
    using (private.is_group_admin(group_id))
    with check (private.is_group_admin(group_id));

create policy group_requests_delete on public.group_requests
    for delete to authenticated
    using (user_id = (select auth.uid()) and status = 'pending');

create unique index if not exists uq_group_requests_pending
    on public.group_requests (group_id, user_id) where status = 'pending';

-- 4.5 projects ---------------------------------------------------------
create policy projects_select on public.projects
    for select to authenticated
    using (
        owner_id = (select auth.uid())
        or group_id is null
        or private.is_group_member(group_id)
    );

create policy projects_insert on public.projects
    for insert to authenticated
    with check (
        owner_id = (select auth.uid())
        and (group_id is null or private.is_group_member(group_id))
    );

create policy projects_update on public.projects
    for update to authenticated
    using (
        owner_id = (select auth.uid())
        or (group_id is not null and private.is_group_admin(group_id))
    )
    with check (
        (owner_id = (select auth.uid())
         or (group_id is not null and private.is_group_admin(group_id)))
        and (group_id is null or private.is_group_member(group_id))
    );

create policy projects_delete on public.projects
    for delete to authenticated
    using (
        owner_id = (select auth.uid())
        or (group_id is not null and private.is_group_owner(group_id))
    );

-- 4.6 applications -----------------------------------------------------
create policy applications_select on public.applications
    for select to authenticated
    using (
        user_id = (select auth.uid())
        or private.can_manage_project(project_id)
    );

-- Postulación propia: siempre 'pending', sin invited_by, a un proyecto abierto y visible.
create policy applications_insert_self on public.applications
    for insert to authenticated
    with check (
        user_id = (select auth.uid())
        and status = 'pending'
        and invited_by is null
        and responded_at is null
        and private.can_apply_to_project(project_id)
    );

-- Invitación: la crea el owner del proyecto para otro usuario.
create policy applications_insert_invite on public.applications
    for insert to authenticated
    with check (
        invited_by = (select auth.uid())
        and user_id <> (select auth.uid())
        and status = 'pending'
        and responded_at is null
        and private.is_project_owner(project_id)
    );

-- El owner del proyecto acepta/rechaza.
create policy applications_update_owner on public.applications
    for update to authenticated
    using (private.is_project_owner(project_id))
    with check (private.is_project_owner(project_id));

-- El invitado responde su propia invitación (solo aceptar o rechazar).
create policy applications_update_invitee on public.applications
    for update to authenticated
    using (user_id = (select auth.uid()) and invited_by is not null and status = 'pending')
    with check (user_id = (select auth.uid()) and invited_by is not null and status in ('accepted', 'rejected'));

-- Retirar una postulación pendiente, o cancelar una invitación pendiente propia.
create policy applications_delete on public.applications
    for delete to authenticated
    using (
        status = 'pending'
        and (user_id = (select auth.uid()) or invited_by = (select auth.uid()))
    );

-- 4.7 ratings ----------------------------------------------------------
create policy ratings_select on public.ratings
    for select to authenticated using (true);

create policy ratings_insert on public.ratings
    for insert to authenticated
    with check (
        rated_by = (select auth.uid())
        and rated_by <> rated_user_id
        and exists (
            select 1
            from public.projects p
            join public.applications a on a.project_id = p.id
            where p.id = ratings.project_id
              and p.owner_id = (select auth.uid())
              and a.user_id = ratings.rated_user_id
              and a.status = 'accepted'
              and p.status = 'completed'
        )
    );

create policy ratings_update on public.ratings
    for update to authenticated
    using (rated_by = (select auth.uid()))
    with check (rated_by = (select auth.uid()));

-- ==========================================================================
-- 5. PRIVILEGIOS (defensa en profundidad: RLS + GRANT)
-- ==========================================================================

-- El rol anon (visitantes sin sesión) no necesita tocar ninguna tabla.
-- Si quieres una landing pública con proyectos, vuelve a dar SELECT solo en 'projects'.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Usuarios autenticados: nunca TRUNCATE, REFERENCES ni TRIGGER.
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- Emails privados: ningún usuario puede leer la columna email de otros perfiles.
-- (Cada usuario ve su propio email con supabase.auth.getUser()).
-- IMPORTANTE: en el frontend usa .select('id,name,username,...') y NO .select('*') sobre profiles.
revoke select on public.profiles from authenticated;
grant select (
    id, name, username, avatar, skills, categories, bio, github_url, portfolio_url,
    available, featured_project_ids, game_types, languages, favorite_genres,
    disciplines, created_at
) on public.profiles to authenticated;

-- ==========================================================================
-- 6. VALIDACIONES DE DATOS (anti abuso / anti XSS por URLs)
--    NOT VALID = no revisa filas viejas, pero sí todas las nuevas.
-- ==========================================================================

alter table public.profiles alter column email drop not null;  -- GitHub puede no devolver email

alter table public.profiles
    add constraint profiles_username_fmt   check (username ~* '^[a-z0-9_-]{3,30}$') not valid,
    add constraint profiles_name_len       check (char_length(name) <= 100) not valid,
    add constraint profiles_github_url_ok  check (github_url    is null or github_url    ~* '^https?://') not valid,
    add constraint profiles_portfolio_ok   check (portfolio_url is null or portfolio_url ~* '^https?://') not valid,
    add constraint profiles_avatar_ok      check (avatar        is null or avatar        ~* '^https?://') not valid,
    add constraint profiles_arrays_len     check (
        cardinality(skills) <= 50 and cardinality(categories) <= 50
        and cardinality(game_types) <= 50 and cardinality(languages) <= 50
        and cardinality(favorite_genres) <= 50 and cardinality(disciplines) <= 50
        and cardinality(featured_project_ids) <= 50
    ) not valid;

alter table public.groups
    add constraint groups_name_len check (char_length(name) between 1 and 100) not valid,
    add constraint groups_desc_len check (char_length(description) <= 2000) not valid;

alter table public.projects
    add constraint projects_category_len check (char_length(category) <= 60) not valid,
    add constraint projects_slots_max    check (slots <= 100) not valid,
    add constraint projects_arrays_len   check (cardinality(tech) <= 50 and cardinality(roles) <= 50) not valid,
    add constraint projects_repo_ok      check (repo  is null or repo  ~* '^https?://') not valid,
    add constraint projects_image_ok     check (image is null or image ~* '^https?://') not valid;

alter table public.applications
    add constraint applications_msg_len  check (char_length(message) <= 1000) not valid,
    add constraint applications_role_len check (project_role is null or char_length(project_role) <= 100) not valid;

-- ==========================================================================
-- 7. REFRESCAR LA CACHÉ DE LA API
-- ==========================================================================
notify pgrst, 'reload schema';

commit;

-- ==========================================================================
-- VERIFICACIÓN (ejecutar aparte después de la migración)
-- ==========================================================================
-- Todas las tablas deben tener rowsecurity = true:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- Ver todas las políticas:
--   select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public' order by 1, 2;
-- Funciones SECURITY DEFINER sin search_path fijo (debe devolver 0 filas):
--   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname in ('public','private') and p.prosecdef and p.proconfig is null;

mira se hicieron todos estos cambios en la base de datos