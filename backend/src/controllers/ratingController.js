// backend/src/controllers/ratingController.js
// Controlador de calificaciones

import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, NotFoundError, ForbiddenError, AppError } from '../middleware/errorHandler.js';

// POST /api/ratings/project/:projectId
export const saveRatings = asyncHandler(async (req, res) => {
  const { projectId } = req.validated.params;
  const { ratings } = req.validated.body; // { [ratedUserId]: stars }
  const raterId = req.user.id;
  
  // Verificar que el proyecto existe y está completado
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, status, owner_id')
    .eq('id', projectId)
    .single();
  
  if (projectError || !project) throw new NotFoundError('Proyecto');
  if (project.status !== 'completed') throw new AppError('Solo se pueden calificar proyectos completados', 400, 'PROJECT_NOT_COMPLETED');
  if (project.owner_id !== raterId) throw new ForbiddenError('Solo el owner puede calificar');
  
  // Obtener participantes aceptados
  const { data: participants } = await supabaseAdmin
    .from('applications')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('status', 'accepted');
  
  const acceptedUserIds = new Set((participants || []).map(p => p.user_id));
  
  const results = [];
  
  for (const [ratedUserId, stars] of Object.entries(ratings)) {
    if (!stars || stars < 1 || stars > 5) continue;
    
    // Verificar que el usuario a calificar es participante aceptado
    if (!acceptedUserIds.has(ratedUserId)) {
      throw new AppError(`El usuario ${ratedUserId} no es participante aceptado`, 400, 'INVALID_RATED_USER');
    }
    
    // No auto-calificarse
    if (ratedUserId === raterId) {
      throw new AppError('No puedes calificarte a ti mismo', 400, 'SELF_RATING');
    }
    
    const { data, error } = await supabaseAdmin
      .from('ratings')
      .upsert({
        project_id: projectId,
        rated_user_id: ratedUserId,
        rated_by: raterId,
        stars,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id,rated_user_id,rated_by'
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === 'P0001') throw new AppError(error.message, 400, 'RATING_VALIDATION_ERROR');
      throw new Error(error.message);
    }
    
    results.push(data);
  }
  
  res.json({ ratings: results });
});

// GET /api/ratings/project/:projectId
export const getProjectRatings = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  const { data, error } = await supabaseAdmin
    .from('ratings')
    .select(`
      *,
      rated_user:profiles!rated_user_id(id, name, username, avatar),
      rated_by_profile:profiles!rated_by(id, name, username)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  
  res.json({ ratings: data || [] });
});

// GET /api/ratings/user/:userId/received
export const getUserReceivedRatings = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const { data, error } = await supabaseAdmin
    .from('ratings')
    .select(`
      *,
      project:projects(id, title, category, image, owner_id),
      rated_by_profile:profiles!rated_by(id, name, username, avatar)
    `)
    .eq('rated_user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  
  res.json({ ratings: data || [] });
});

// GET /api/ratings/user/:userId/given
export const getUserGivenRatings = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const { data, error } = await supabaseAdmin
    .from('ratings')
    .select(`
      *,
      project:projects(id, title, category, image),
      rated_user:profiles!rated_user_id(id, name, username, avatar)
    `)
    .eq('rated_by', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  
  res.json({ ratings: data || [] });
});

// GET /api/ratings/user/:userId/average
export const getUserAvgRating = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const { data, error } = await supabaseAdmin
    .rpc('get_user_avg_rating', { p_user_id: userId });
  
  if (error) throw new Error(error.message);
  
  res.json({ averageRating: data || 0 });
});

// GET /api/ratings/user/:userId/count
export const getUserRatingCount = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const { data, error } = await supabaseAdmin
    .rpc('get_user_rating_count', { p_user_id: userId });
  
  if (error) throw new Error(error.message);
  
  res.json({ ratingCount: data || 0 });
});

// GET /api/ratings/user/:userId/distribution
export const getUserRatingDistribution = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const { data, error } = await supabaseAdmin
    .from('ratings')
    .select('stars')
    .eq('rated_user_id', userId);
  
  if (error) throw new Error(error.message);
  
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (data || []).forEach(r => { distribution[r.stars] = (distribution[r.stars] || 0) + 1; });
  
  res.json({ distribution });
});

// GET /api/ratings/project/:projectId/user/:userId
export const getUserProjectRating = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  
  const { data, error } = await supabaseAdmin
    .from('ratings')
    .select('*')
    .eq('project_id', projectId)
    .eq('rated_user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  
  res.json({ rating: data || null });
});

// GET /api/ratings/project/:projectId/can-rate/:ratedId
export const checkCanRate = asyncHandler(async (req, res) => {
  const { projectId, ratedId } = req.params;
  const raterId = req.user.id;
  
  const { data, error } = await supabaseAdmin
    .rpc('can_rate_user', {
      p_project_id: projectId,
      p_rater_id: raterId,
      p_rated_id: ratedId
    });
  
  if (error) throw new Error(error.message);
  
  res.json({ canRate: data });
});