-- ==========================================================================
-- ENTYCOLLAB · Migración 0001 · Esquema inicial completo
-- Convención: forward-only, versionada.
-- Orden de dependencias estrictamente secuencial:
-- 1. Extensiones
-- 2. Creación de tablas (en orden de claves foráneas)
-- 3. Índices de rendimiento
-- 4. Activación de RLS y políticas de seguridad
-- 5. Triggers de automatización y validación
-- 6. Funciones auxiliares
-- ==========================================================================

-- ==========================================================================
-- 1. EXTENSIONES NECESARIAS
-- ==========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================================
-- 2. TABLAS (ORDEN DE DEPENDENCIAS)
-- ==========================================================================

-- 2.1 TABLA: profiles (perfiles de usuario, 1:1 con auth.users)
CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    username text UNIQUE NOT NULL,
    email text UNIQUE NOT NULL,
    avatar text,
    skills text[] DEFAULT '{}',
    categories text[] DEFAULT '{}',
    bio jsonb,
    github_url text,
    portfolio_url text,
    available boolean DEFAULT false,
    featured_project_ids uuid[] DEFAULT '{}',
    game_types text[] DEFAULT '{}',
    languages text[] DEFAULT '{}',
    favorite_genres text[] DEFAULT '{}',
    disciplines text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- 2.2 TABLA: groups (grupos / equipos)
CREATE TABLE groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text DEFAULT '',
    owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_private boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2.3 TABLA: group_members (miembros de grupos)
CREATE TABLE group_members (
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);

-- 2.4 TABLA: group_requests (solicitudes de ingreso a grupos)
CREATE TABLE group_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    requested_at timestamptz DEFAULT now(),
    decided_at timestamptz,
    decided_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- 2.5 TABLA: projects (proyectos)
CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
    title jsonb NOT NULL,
    category text NOT NULL,
    slots integer NOT NULL CHECK (slots > 0),
    tech text[] DEFAULT '{}',
    description jsonb NOT NULL,
    min_rating numeric(2,1) DEFAULT 1 CHECK (min_rating BETWEEN 0 AND 5),
    deadline date,
    repo text,
    image text,
    roles text[] DEFAULT '{}',
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'completed', 'closed')),
    created_at timestamptz DEFAULT now()
);

-- 2.6 TABLA: applications (postulaciones e invitaciones)
CREATE TABLE applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    project_role text,
    invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    message text DEFAULT '',
    applied_at timestamptz DEFAULT now(),
    responded_at timestamptz,
    UNIQUE (project_id, user_id)
);

-- 2.7 TABLA: ratings (calificaciones)
CREATE TABLE ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rated_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rated_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz,
    UNIQUE (project_id, rated_user_id, rated_by)
);

-- ==========================================================================
-- 3. ÍNDICES DE RENDIMIENTO
-- ==========================================================================

-- Índices profiles
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_available ON profiles(available) WHERE available = true;
CREATE INDEX idx_profiles_categories ON profiles USING GIN(categories);
CREATE INDEX idx_profiles_skills ON profiles USING GIN(skills);
CREATE INDEX idx_profiles_game_types ON profiles USING GIN(game_types);
CREATE INDEX idx_profiles_languages ON profiles USING GIN(languages);
CREATE INDEX idx_profiles_disciplines ON profiles USING GIN(disciplines);

-- Índices groups
CREATE INDEX idx_groups_owner ON groups(owner_id);

-- Índices group_members
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- Índices group_requests
CREATE INDEX idx_group_requests_group ON group_requests(group_id);
CREATE INDEX idx_group_requests_user ON group_requests(user_id);

-- Índices projects
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_group ON projects(group_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_tech ON projects USING GIN(tech);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Índices applications
CREATE INDEX idx_applications_project ON applications(project_id);
CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Índices ratings
CREATE INDEX idx_ratings_rated_user ON ratings(rated_user_id);
CREATE INDEX idx_ratings_project ON ratings(project_id);
CREATE INDEX idx_ratings_rater ON ratings(rated_by);

-- ==========================================================================
-- 4. SEGURIDAD A NIVEL DE FILAS (RLS) Y POLÍTICAS
-- ==========================================================================

-- 4.1 Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- 4.2 Políticas profiles
CREATE POLICY "Profiles visible to all" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 4.3 Políticas groups
CREATE POLICY "Groups readable" ON groups
    FOR SELECT USING (
        NOT is_private
        OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = groups.id
            AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update groups" ON groups
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners delete groups" ON groups
    FOR DELETE USING (auth.uid() = owner_id);

-- 4.4 Políticas group_members
CREATE POLICY "Members readable" ON group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members gm2
            WHERE gm2.group_id = group_members.group_id
            AND gm2.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins manage members" ON group_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners promote/demote" ON group_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'owner'
        )
    );

CREATE POLICY "Admins remove members" ON group_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('owner', 'admin')
            AND group_members.role != 'owner'
        )
    );

-- 4.5 Políticas group_requests
CREATE POLICY "Requests readable" ON group_requests
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_requests.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users request join" ON group_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins decide requests" ON group_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_requests.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('owner', 'admin')
        )
    );

-- 4.6 Políticas projects
CREATE POLICY "Projects readable" ON projects
    FOR SELECT USING (
        group_id IS NULL
        OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = projects.group_id
            AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users create projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update projects" ON projects
    FOR UPDATE USING (
        auth.uid() = owner_id
        OR (group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = projects.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('owner', 'admin')
        ))
    );

CREATE POLICY "Owners delete projects" ON projects
    FOR DELETE USING (
        auth.uid() = owner_id
        OR (group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = projects.group_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'owner'
        ))
    );

-- 4.7 Políticas applications
CREATE POLICY "Applications readable" ON applications
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = applications.project_id
            AND (
                p.owner_id = auth.uid()
                OR (p.group_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM group_members gm
                    WHERE gm.group_id = p.group_id
                    AND gm.user_id = auth.uid()
                    AND gm.role IN ('owner', 'admin')
                ))
            )
        )
    );

CREATE POLICY "Users apply themselves" ON applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners manage applications" ON applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = applications.project_id
            AND p.owner_id = auth.uid()
        )
        OR (invited_by IS NOT NULL AND user_id = auth.uid() AND status = 'pending')
    );

-- 4.8 Políticas ratings
CREATE POLICY "Ratings readable" ON ratings FOR SELECT USING (true);

CREATE POLICY "Owners rate participants" ON ratings
    FOR INSERT WITH CHECK (
        rated_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM projects p
            JOIN applications a ON a.project_id = p.id
            WHERE p.id = ratings.project_id
            AND p.owner_id = auth.uid()
            AND a.user_id = ratings.rated_user_id
            AND a.status = 'accepted'
            AND p.status = 'completed'
        )
    );

CREATE POLICY "Owners update own ratings" ON ratings
    FOR UPDATE USING (rated_by = auth.uid());

-- ==========================================================================
-- 5. TRIGGERS Y FUNCIONES DE DISPARO
-- ==========================================================================

-- 5.1 Trigger: Crear perfil al registrarse usuario en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, username, email, created_at)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', ''),
        COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
        new.email,
        now()
    );
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5.2 Trigger: Agregar automáticamente al creador de un grupo como 'owner' en group_members
CREATE OR REPLACE FUNCTION public.add_group_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.group_members (group_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', now())
    ON CONFLICT (group_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_add_owner ON groups;
CREATE TRIGGER trigger_add_owner
    AFTER INSERT ON groups
    FOR EACH ROW EXECUTE FUNCTION public.add_group_owner();

-- 5.3 Trigger: Al aceptar solicitud de grupo, agregar a group_members
CREATE OR REPLACE FUNCTION public.accept_group_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        INSERT INTO public.group_members (group_id, user_id, role, joined_at)
        VALUES (NEW.group_id, NEW.user_id, 'member', now())
        ON CONFLICT (group_id, user_id) DO NOTHING;
        NEW.decided_at := now();
        NEW.decided_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_accept_request ON group_requests;
CREATE TRIGGER trigger_accept_request
    BEFORE UPDATE ON group_requests
    FOR EACH ROW EXECUTE FUNCTION public.accept_group_request();

-- 5.4 Trigger: Validar cupos disponibles antes de aceptar una postulación
CREATE OR REPLACE FUNCTION public.validate_project_slots()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    accepted_count integer;
    project_slots integer;
BEGIN
    IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
        SELECT slots INTO project_slots FROM projects WHERE id = NEW.project_id;
        SELECT COUNT(*) INTO accepted_count
        FROM applications
        WHERE project_id = NEW.project_id AND status = 'accepted';
        
        IF accepted_count >= project_slots THEN
            RAISE EXCEPTION 'No hay cupos disponibles en este proyecto';
        END IF;
        
        NEW.responded_at := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_slots ON applications;
CREATE TRIGGER trigger_validate_slots
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION public.validate_project_slots();

-- 5.5 Trigger: Validar que no se auto-califique y que el proyecto esté completado
CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.rated_by = NEW.rated_user_id THEN
        RAISE EXCEPTION 'No puedes calificarte a ti mismo';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM projects p
        JOIN applications a ON a.project_id = p.id
        WHERE p.id = NEW.project_id
        AND p.owner_id = NEW.rated_by
        AND a.user_id = NEW.rated_user_id
        AND a.status = 'accepted'
        AND p.status = 'completed'
    ) THEN
        RAISE EXCEPTION 'Solo el owner puede calificar participantes aceptados de proyectos completados';
    END IF;
    
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_rating ON ratings;
CREATE TRIGGER trigger_validate_rating
    BEFORE INSERT OR UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION public.validate_rating();

-- ==========================================================================
-- 6. FUNCIONES AUXILIARES (HELPERS API)
-- ==========================================================================

-- Promedio de calificación de un usuario
CREATE OR REPLACE FUNCTION public.get_user_avg_rating(p_user_id uuid)
RETURNS numeric(3,2) LANGUAGE sql STABLE AS $$
    SELECT COALESCE(ROUND(AVG(stars)::numeric, 2), 0)
    FROM ratings
    WHERE rated_user_id = p_user_id;
$$;

-- Conteo de calificaciones de un usuario
CREATE OR REPLACE FUNCTION public.get_user_rating_count(p_user_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
    SELECT COUNT(*) FROM ratings WHERE rated_user_id = p_user_id;
$$;

-- Proyectos completados de un usuario (como owner o participante aceptado)
CREATE OR REPLACE FUNCTION public.get_completed_projects_count(p_user_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
    SELECT COUNT(DISTINCT p.id)
    FROM projects p
    LEFT JOIN applications a ON a.project_id = p.id AND a.user_id = p_user_id AND a.status = 'accepted'
    WHERE p.status = 'completed'
    AND (p.owner_id = p_user_id OR a.id IS NOT NULL);
$$;

-- Verificar si usuario puede calificar a otro en un proyecto
CREATE OR REPLACE FUNCTION public.can_rate_user(p_project_id uuid, p_rater_id uuid, p_rated_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM projects p
        JOIN applications a ON a.project_id = p.id
        WHERE p.id = p_project_id
        AND p.owner_id = p_rater_id
        AND a.user_id = p_rated_id
        AND a.status = 'accepted'
        AND p.status = 'completed'
    );
$$;

-- Verificar cupos disponibles en proyecto
CREATE OR REPLACE FUNCTION public.get_project_available_slots(p_project_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
    SELECT p.slots - COUNT(a.id)
    FROM projects p
    LEFT JOIN applications a ON a.project_id = p.id AND a.status = 'accepted'
    WHERE p.id = p_project_id
    GROUP BY p.slots;
$$;