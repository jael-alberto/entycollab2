// backend/src/controllers/profileController.js
// Controlador de perfiles

import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, NotFoundError, ConflictError } from '../middleware/errorHandler.js';

// GET /api/profiles
export const listProfiles = asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 20, available } = req.query;
  
  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  
  if (available === 'true') {
    query = query.eq('available', true);
  }
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);
  
  const { data, error, count } = await query;
  
  if (error) throw new Error(error.message);
  
  res.json({
    data: data || [],
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  });
});

// GET /api/profiles/search
export const searchProfiles = asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;
  
  if (!q || q.length < 2) {
    return res.json({ data: [] });
  }
  
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .or(`name.ilike.%${q}%,username.ilike.%${q}%,bio->>es.ilike.%${q}%,bio->>en.ilike.%${q}%`)
    .limit(Number(limit));
  
  if (error) throw new Error(error.message);
  
  res.json({ data: data || [] });
});

// GET /api/profiles/available
export const getAvailablePeople = asyncHandler(async (req, res) => {
  const { 
    gameTypes, languages, favoriteGenres, disciplines, 
    completed, rating, page = 1, pageSize = 20 
  } = req.query;
  
  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('available', true);
  
  if (gameTypes) query = query.overlaps('game_types', gameTypes.split(','));
  if (languages) query = query.overlaps('languages', languages.split(','));
  if (favoriteGenres) query = query.overlaps('favorite_genres', favoriteGenres.split(','));
  if (disciplines) query = query.overlaps('disciplines', disciplines.split(','));
  
  // completed y rating requieren RPC - por ahora filtramos en memoria
  // TODO: Implementar RPC para estos filtros
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to).order('created_at', { ascending: false });
  
  const { data, error, count } = await query;
  
  if (error) throw new Error(error.message);
  
  // Post-filtrado para completed y rating (temporal)
  let filtered = data || [];
  
  if (completed) {
    const minCompleted = Math.min(...completed.split(',').map(Number));
    // Requiere RPC get_completed_projects_count
    // Por ahora omitimos
  }
  
  if (rating) {
    // Requiere RPC get_user_avg_rating
    // Por ahora omitimos
  }
  
  res.json({
    data: filtered,
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  });
});

// GET /api/profiles/:id
export const getProfile = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') throw new NotFoundError('Perfil');
    throw new Error(error.message);
  }
  
  res.json({ user: data });
});

// GET /api/profiles/by-username/:username
export const getProfileByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') throw new NotFoundError('Perfil');
    throw new Error(error.message);
  }
  
  res.json({ user: data });
});

// PUT /api/profiles/:id
export const updateProfile = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const updateData = req.validated.body;
  
  // Verificar ownership
  if (id !== req.user.id) {
    throw new ForbiddenError('No puedes editar el perfil de otro usuario');
  }
  
  // Verificar username único
  if (updateData.username) {
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', updateData.username)
      .neq('id', id)
      .single();
    
    if (existing) throw new ConflictError('Ese nombre de usuario ya está en uso');
  }
  
  // Verificar email único
  if (updateData.email) {
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', updateData.email)
      .neq('id', id)
      .single();
    
    if (existing) throw new ConflictError('Ya existe una cuenta con ese correo');
    
    // También actualizar en Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email: updateData.email
    });
    if (authError) throw new Error(authError.message);
  }
  
  // Actualizar perfil
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  res.json({ user: data });
});

// PUT /api/profiles/:id/availability
export const toggleAvailability = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  
  if (id !== req.user.id) {
    throw new ForbiddenError('No puedes cambiar la disponibilidad de otro usuario');
  }
  
  const { data: current } = await supabaseAdmin
    .from('profiles')
    .select('available')
    .eq('id', id)
    .single();
  
  const newAvailable = !current?.available;
  
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ available: newAvailable })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  res.json({ user: data, available: newAvailable });
});

// PUT /api/profiles/:id/featured
export const saveFeaturedProjects = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { projectIds } = req.body;
  
  if (id !== req.user.id) {
    throw new ForbiddenError('No puedes editar los proyectos destacados de otro usuario');
  }
  
  if (!Array.isArray(projectIds) || projectIds.length > 5) {
    throw new ValidationError({ projectIds: ['Máximo 5 proyectos destacados'] });
  }
  
  // Verificar que los proyectos pertenecen al usuario o participó
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id')
    .in('id', projectIds);
  
  const validIds = (projects || []).map(p => p.id);
  
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ featured_project_ids: validIds })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  res.json({ user: data });
});

// GET /api/profiles/:id/stats
export const getProfileStats = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  
  // Proyectos creados
  const { count: createdCount } = await supabaseAdmin
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', id);
  
  // Colaboraciones (apps aceptadas)
  const { count: collabsCount } = await supabaseAdmin
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', id)
    .eq('status', 'accepted');
  
  // Rating promedio (RPC)
  const { data: avgRating } = await supabaseAdmin
    .rpc('get_user_avg_rating', { p_user_id: id });
  
  const { data: ratingCount } = await supabaseAdmin
    .rpc('get_user_rating_count', { p_user_id: id });
  
  // Proyectos completados (RPC)
  const { data: completedCount } = await supabaseAdmin
    .rpc('get_completed_projects_count', { p_user_id: id });
  
  res.json({
    stats: {
      projectsCreated: createdCount || 0,
      collaborations: collabsCount || 0,
      avgRating: avgRating || 0,
      ratingCount: ratingCount || 0,
      completedProjects: completedCount || 0
    }
  });
});

// GET /api/profiles/:id/history
export const getProfileHistory = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  
  // Proyectos creados
  const { data: created } = await supabaseAdmin
    .from('projects')
    .select('id, title, category, status, created_at, image')
    .eq('owner_id', id);
  
  // Proyectos participados
  const { data: participated } = await supabaseAdmin
    .from('applications')
    .select(`
      project_role,
      project:projects(id, title, category, status, created_at, image, owner_id)
    `)
    .eq('user_id', id)
    .eq('status', 'accepted');
  
  const participatedProjects = (participated || [])
    .map(p => ({ ...p.project, role: p.project_role, participationType: 'participant' }))
    .filter(Boolean);
  
  const createdProjects = (created || []).map(p => ({ ...p, participationType: 'creator' }));
  
  // Combinar y deduplicar
  const all = [...createdProjects, ...participatedProjects];
  const unique = all.filter((p, i, self) => self.findIndex(x => x.id === p.id) === i);
  unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json({ history: unique });
});

// GET /api/profiles/:id/ratings
export const getProfileRatings = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  
  const { data, error } = await supabaseAdmin
    .from('ratings')
    .select(`
      *,
      project:projects(id, title, category, image, owner_id),
      rated_by_profile:profiles!rated_by(id, name, username, avatar)
    `)
    .eq('rated_user_id', id)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  
  res.json({ ratings: data || [] });
});