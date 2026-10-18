-- ==========================================================================
-- ENTYCOLLAB · Migración 0002 · Storage Buckets y Políticas
-- Convención: schema y datos separados; buckets y políticas en su propia migración.
-- ==========================================================================

-- Bucket: avatars (fotos de perfil)
-- Lectura pública, escritura solo dueño (por user_id en path)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
) ON CONFLICT (id) DO NOTHING;

-- Políticas bucket avatars
-- Lectura pública
CREATE POLICY "Avatars public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- Inserción: solo autenticados, path = user_id
CREATE POLICY "Avatars owner insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Actualización: solo dueño
CREATE POLICY "Avatars owner update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Eliminación: solo dueño
CREATE POLICY "Avatars owner delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Bucket: project-images (imágenes de proyectos)
-- Lectura pública, escritura autenticada (owner del proyecto o admin grupo)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-images',
    'project-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
) ON CONFLICT (id) DO NOTHING;

-- Políticas bucket project-images
-- Lectura pública
CREATE POLICY "Project images public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'project-images');

-- Inserción: usuarios autenticados, validación en aplicación (owner/admin)
CREATE POLICY "Project images authenticated insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-images'
        AND auth.uid() IS NOT NULL
    );

-- Actualización: solo quien subió (owner del proyecto o admin grupo)
CREATE POLICY "Project images owner update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'project-images'
        AND auth.uid() = owner
    );

-- Eliminación: solo quien subió
CREATE POLICY "Project images owner delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'project-images'
        AND auth.uid() = owner
    );

-- Nota: La validación fina de "solo owner del proyecto o admin del grupo puede subir"
-- se hace a nivel de aplicación (API layer) antes de subir, ya que storage policies
-- no tienen acceso directo a las tablas projects/groups. El path recomendado:
-- project-images/{project_id}/{filename}