// frontend/src/lib/supabaseSync.js
// Capa de sincronización y acceso directo a Supabase
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

// ============================================================================
// MAPEOS: JS (camelCase) <-> POSTGRES (snake_case)
// ============================================================================

export function projectToDb(p) {
  return {
    id: isUUID(p.id) ? p.id : undefined,
    owner_id: isUUID(p.ownerId) ? p.ownerId : undefined,
    group_id: isUUID(p.groupId) ? p.groupId : null,
    title: typeof p.title === 'string' ? { es: p.title, en: p.title } : (p.title || { es: '', en: '' }),
    category: p.category || 'web',
    slots: Number(p.slots) || 1,
    tech: Array.isArray(p.tech) ? p.tech : [],
    description: typeof p.description === 'string' ? { es: p.description, en: p.description } : (p.description || { es: '', en: '' }),
    min_rating: p.minRating !== undefined && p.minRating !== null ? Number(p.minRating) : 1,
    deadline: p.deadline || null,
    repo: p.repo || null,
    image: p.image || null,
    roles: Array.isArray(p.roles) ? p.roles : [],
    status: p.status || 'open',
    created_at: p.createdAt || new Date().toISOString()
  };
}

export function projectFromDb(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    groupId: row.group_id,
    title: row.title,
    category: row.category,
    slots: row.slots,
    tech: row.tech || [],
    description: row.description,
    minRating: row.min_rating !== null ? Number(row.min_rating) : 1,
    deadline: row.deadline,
    repo: row.repo,
    image: row.image,
    roles: row.roles || [],
    status: row.status,
    createdAt: row.created_at
  };
}

export function profileToDb(u) {
  return {
    id: isUUID(u.id) ? u.id : undefined,
    name: u.name || '',
    username: (u.username || '').replace(/^@/, ''),
    email: u.email || '',
    avatar: u.avatar || null,
    skills: Array.isArray(u.skills) ? u.skills : [],
    categories: Array.isArray(u.categories) ? u.categories : [],
    bio: typeof u.bio === 'string' ? { es: u.bio, en: u.bio } : (u.bio || { es: '', en: '' }),
    github_url: u.githubUrl || null,
    portfolio_url: u.portfolioUrl || null,
    available: Boolean(u.available),
    featured_project_ids: (u.featuredProjectIds || []).filter(isUUID),
    game_types: Array.isArray(u.gameTypes) ? u.gameTypes : [],
    languages: Array.isArray(u.languages) ? u.languages : [],
    favorite_genres: Array.isArray(u.favoriteGenres) ? u.favoriteGenres : [],
    disciplines: Array.isArray(u.disciplines) ? u.disciplines : [],
    created_at: u.createdAt || new Date().toISOString()
  };
}

export function profileFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatar: row.avatar,
    skills: row.skills || [],
    categories: row.categories || [],
    bio: row.bio,
    githubUrl: row.github_url,
    portfolioUrl: row.portfolio_url,
    available: Boolean(row.available),
    featuredProjectIds: row.featured_project_ids || [],
    gameTypes: row.game_types || [],
    languages: row.languages || [],
    favoriteGenres: row.favorite_genres || [],
    disciplines: row.disciplines || [],
    createdAt: row.created_at
  };
}

export function applicationToDb(a) {
  return {
    id: isUUID(a.id) ? a.id : undefined,
    project_id: isUUID(a.projectId) ? a.projectId : undefined,
    user_id: isUUID(a.userId) ? a.userId : undefined,
    status: a.status || 'pending',
    project_role: a.projectRole || null,
    invited_by: isUUID(a.invitedBy) ? a.invitedBy : null,
    message: a.pitch || a.message || '',
    applied_at: a.appliedAt || new Date().toISOString(),
    responded_at: a.respondedAt || null
  };
}

export function applicationFromDb(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    status: row.status,
    projectRole: row.project_role,
    invitedBy: row.invited_by,
    pitch: row.message || '',
    message: row.message || '',
    appliedAt: row.applied_at,
    respondedAt: row.responded_at
  };
}

export function ratingToDb(r) {
  return {
    id: isUUID(r.id) ? r.id : undefined,
    project_id: isUUID(r.projectId) ? r.projectId : undefined,
    rated_user_id: isUUID(r.ratedUserId) ? r.ratedUserId : undefined,
    rated_by: isUUID(r.ratedBy) ? r.ratedBy : undefined,
    stars: Number(r.stars),
    created_at: r.createdAt || new Date().toISOString(),
    updated_at: r.updatedAt || new Date().toISOString()
  };
}

export function ratingFromDb(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    ratedUserId: row.rated_user_id,
    ratedBy: row.rated_by,
    stars: Number(row.stars),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function groupToDb(g) {
  return {
    id: isUUID(g.id) ? g.id : undefined,
    name: g.name,
    description: g.description || '',
    owner_id: isUUID(g.ownerId) ? g.ownerId : undefined,
    is_private: Boolean(g.isPrivate),
    created_at: g.createdAt || new Date().toISOString()
  };
}

export function groupFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    ownerId: row.owner_id,
    isPrivate: Boolean(row.is_private),
    createdAt: row.created_at,
    members: (row.group_members || []).map(m => ({
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at
    })),
    requests: (row.group_requests || []).map(req => ({
      id: req.id,
      userId: req.user_id,
      status: req.status,
      requestedAt: req.requested_at
    }))
  };
}

// ============================================================================
// CARGA INICIAL DESDE SUPABASE
// ============================================================================

export async function fetchSupabaseData() {
  if (!isSupabaseConfigured() || !supabase) {
    return { enabled: false };
  }

  try {
    const [projRes, profRes, grpRes, appRes, ratRes] = await Promise.allSettled([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('groups').select('*, group_members(*), group_requests(*)'),
      supabase.from('applications').select('*'),
      supabase.from('ratings').select('*')
    ]);

    const result = { enabled: true };

    if (projRes.status === 'fulfilled' && !projRes.value.error && Array.isArray(projRes.value.data)) {
      result.projects = projRes.value.data.map(projectFromDb);
    }
    if (profRes.status === 'fulfilled' && !profRes.value.error && Array.isArray(profRes.value.data)) {
      result.profiles = profRes.value.data.map(profileFromDb);
    }
    if (grpRes.status === 'fulfilled' && !grpRes.value.error && Array.isArray(grpRes.value.data)) {
      result.groups = grpRes.value.data.map(groupFromDb);
    }
    if (appRes.status === 'fulfilled' && !appRes.value.error && Array.isArray(appRes.value.data)) {
      result.applications = appRes.value.data.map(applicationFromDb);
    }
    if (ratRes.status === 'fulfilled' && !ratRes.value.error && Array.isArray(ratRes.value.data)) {
      result.ratings = ratRes.value.data.map(ratingFromDb);
    }

    return result;
  } catch (err) {
    console.warn('[Supabase] Error al consultar datos iniciales:', err);
    return { enabled: true, error: err };
  }
}

// ============================================================================
// MUTACIONES HACIA SUPABASE
// ============================================================================

export async function syncProjectToSupabase(p) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const payload = projectToDb(p);
    if (!payload.id || !payload.owner_id) return;
    const { error } = await supabase.from('projects').upsert(payload);
    if (error) console.warn('[Supabase] Error al guardar proyecto:', error.message);
  } catch (err) {
    console.warn('[Supabase] Error sincronizando proyecto:', err);
  }
}

export async function deleteProjectFromSupabase(projectId) {
  if (!isSupabaseConfigured() || !supabase || !isUUID(projectId)) return;
  try {
    await supabase.from('projects').delete().eq('id', projectId);
  } catch (err) {
    console.warn('[Supabase] Error al eliminar proyecto:', err);
  }
}

export async function syncProfileToSupabase(u) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const payload = profileToDb(u);
    if (!payload.id) return;
    const { error } = await supabase.from('profiles').upsert(payload);
    if (error) console.warn('[Supabase] Error al guardar perfil:', error.message);
  } catch (err) {
    console.warn('[Supabase] Error sincronizando perfil:', err);
  }
}

export async function syncApplicationToSupabase(a) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const payload = applicationToDb(a);
    if (!payload.project_id || !payload.user_id) return;
    const { error } = await supabase.from('applications').upsert(payload);
    if (error) console.warn('[Supabase] Error al guardar postulación:', error.message);
  } catch (err) {
    console.warn('[Supabase] Error sincronizando postulación:', err);
  }
}

export async function syncRatingToSupabase(r) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const payload = ratingToDb(r);
    if (!payload.project_id || !payload.rated_user_id || !payload.rated_by) return;
    const { error } = await supabase.from('ratings').upsert(payload);
    if (error) console.warn('[Supabase] Error al guardar calificación:', error.message);
  } catch (err) {
    console.warn('[Supabase] Error sincronizando calificación:', err);
  }
}

export async function syncGroupToSupabase(g) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const payload = groupToDb(g);
    if (!payload.id || !payload.owner_id) return;
    const { error } = await supabase.from('groups').upsert(payload);
    if (error) {
      console.warn('[Supabase] Error al guardar grupo:', error.message);
      return;
    }
    if (Array.isArray(g.members)) {
      const membersToInsert = g.members
        .filter(m => isUUID(m.userId))
        .map(m => ({
          group_id: g.id,
          user_id: m.userId,
          role: m.role || 'member',
          joined_at: m.joinedAt || new Date().toISOString()
        }));
      if (membersToInsert.length > 0) {
        await supabase.from('group_members').upsert(membersToInsert);
      }
    }
  } catch (err) {
    console.warn('[Supabase] Error sincronizando grupo:', err);
  }
}

// ============================================================================
// AUTENTICACIÓN DIRECTA CON SUPABASE
// ============================================================================

export async function supabaseAuthLogin(identifier, password) {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const clean = String(identifier || '').trim().replace(/^@/, '');
    let email = clean;

    // Si no es un email directo, buscar en la tabla profiles por username
    if (!clean.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', clean)
        .maybeSingle();

      if (profile?.email) {
        email = profile.email;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      return null;
    }

    // Cargar perfil completo
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile) {
      return profileFromDb(profile);
    }

    return {
      id: data.user.id,
      name: data.user.user_metadata?.name || data.user.email.split('@')[0],
      username: data.user.user_metadata?.username || data.user.email.split('@')[0],
      email: data.user.email
    };
  } catch (err) {
    console.warn('[Supabase Auth] Error en login:', err);
    return null;
  }
}

export async function supabaseAuthRegister(regData) {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { email, password, name, username, skills, bio, gameTypes, favoriteGenres, disciplines, languages } = regData;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, username }
      }
    });

    if (error) {
      if (error.message?.toLowerCase().includes('already registered')) return 'email';
      return null;
    }

    const userId = data.user?.id;
    if (!userId) return null;

    const newProfile = {
      id: userId,
      name,
      username,
      email,
      skills: skills || [],
      categories: [],
      bio,
      gameTypes: gameTypes || [],
      favoriteGenres: favoriteGenres || [],
      disciplines: disciplines || [],
      languages: languages || [],
      createdAt: new Date().toISOString()
    };

    await syncProfileToSupabase(newProfile);
    return newProfile;
  } catch (err) {
    console.warn('[Supabase Auth] Error en register:', err);
    return null;
  }
}
