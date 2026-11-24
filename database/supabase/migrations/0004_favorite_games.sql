-- ==========================================================================
-- 0004_favorite_games.sql
-- Juegos favoritos por tipo/género, guardados en el perfil:
--   { "shooter": ["Doom", "Halo"], "rpg": ["Baldur's Gate"] }
-- Máximo 2 juegos por tipo (la API también lo valida).
-- Ejecutar en el SQL Editor de Supabase después de 0001, 0002 y 0003.
-- ==========================================================================

alter table public.profiles
    add column if not exists favorite_games jsonb default '{}'::jsonb;

-- 0003 quitó el SELECT global a `authenticated` y concedió solo columnas
-- concretas: hay que añadir esta, o el frontend no podrá leer el campo.
grant select (favorite_games) on public.profiles to authenticated;

-- El contenedor siempre es un objeto JSON (o NULL, como `bio`). El límite de
-- 2 juegos por tipo se valida en la API; los CHECK no admiten subconsultas.
alter table public.profiles
    add constraint profiles_favorite_games_obj
    check (favorite_games is null or jsonb_typeof(favorite_games) = 'object') not valid;

alter table public.profiles
    validate constraint profiles_favorite_games_obj;

comment on column public.profiles.favorite_games is
    'Juegos favoritos por tipo: {"shooter": ["Doom", "Halo"]}. Máximo 2 por tipo.';
