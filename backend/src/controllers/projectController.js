// backend/src/controllers/projectController.js
// Controlador de proyectos

import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, NotFoundError, ForbiddenError, AppError } from '../middleware/errorHandler.js';

// GET /api/projects
export const listProjects = asyncHandler(async (req, res) => {
  const { 
    page = 1, pageSize = 20, status, category, groupId, ownerId, 
    tech, search, sortBy = 'created_at', sortOrder = 'desc', globalOnly 
  } = req.validated.query;
  
  let query = supabaseAdmin
    .from('projects')
    .select(`
      *,
      owner:profiles!owner_id(id, name, username, avatar),
      group:groups!group_id(id, name)
    `, { count: 'exact' });
  
  if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);
  if (groupId) query = query.eq('group_id', groupId);
  if (ownerId) query = query.eq('owner_id', ownerId);
  if (tech) query = query.overlaps('tech', tech.split(','));
  if (search) {
    query = query.or(`title->>es.ilike.%${search}%,title->>en.ilike.%${search}%,description->>es.ilike.%${search}%,description->>en.ilike.%${search}%`);
  }
  if (globalOnly) query = query.is('group_id', null);
  
  const allowedSortFields = ['created_at', 'title', 'status', 'category'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
  query = query.order(sortField, order);
  
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

// GET /api/projects/:id
export const getProject = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select(`
      *,
      owner:profiles!owner_id(id, name, username, avatar, available),
      group:groups!group_id(id, name, owner_id),
      applications(
        id, user_id, status, project_role, invited_by, applied_at, responded_at,
        user:profiles!user_id(id, name, username, avatar),
        invited_by_profile:profiles!invited_by(id, name, username)
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') throw new NotFoundError('Proyecto');
    throw new Error(error.message);
  }
  
  res.json({ project: data });
});

// POST /api/projects
export const createProject = asyncHandler(async (req, res) => {
  const projectData = {
    ...req.validated.body,
    owner_id: req.user.id,
    status: 'open'
  };
  
  // Si groupId está presente, verificar membresía admin/owner
  if (projectData.groupId) {
    const { data: membership } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', projectData.groupId)
      .eq('user_id', req.user.id)
      .single();
    
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenError('No tienes permisos para crear proyectos en este grupo');
    }
  }
  
  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert(projectData)
    .select(`
      *,
      owner:profiles!owner_id(id, name, username, avatar)
    `)
    .single();
  
  if (error) throw new Error(error.message);
  
  res.status(201).json({ project: data });
});

// PUT /api/projects/:id
export const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const updateData = req.validated.body;
  
  // Verificar permisos
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('owner_id, group_id')
    .eq('id', id)
    .single();
  
  if (!project) throw new NotFoundError('Proyecto');
  
  const isOwner = project.owner_id === req.user.id;
  let isGroupAdmin = false;
  
  if (project.group_id) {
    const { data: membership } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();
    
    isGroupAdmin = membership && ['owner', 'admin'].includes(membership.role);
  }
  
  if (!isOwner && !isGroupAdmin) {
    throw new ForbiddenError('No tienes permisos para editar este proyecto');
  }
  
  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  res.json({ project: data });
});

// PUT /api/projects/:id/status
export const changeProjectStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { status } = req.body;
  
  if (!['open', 'in-progress', 'completed', 'closed'].includes(status)) {
    throw new AppError('Estado inválido', 400, 'INVALID_STATUS');
  }
  
  // Verificar ownership
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('owner_id, group_id')
    .eq('id', id)
    .single();
  
  if (!project) throw new NotFoundError('Proyecto');
  
  const isOwner = project.owner_id === req.user.id;
  let isGroupAdmin = false;
  
  if (project.group_id) {
    const { data: membership } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();
    
    isGroupAdmin = membership && ['owner', 'admin'].includes(membership.role);
  }
  
  if (!isOwner && !isGroupAdmin) {
    throw new ForbiddenError('Solo el owner puede cambiar el estado');
  }
  
  // Validación de negocio: completed requiere participantes aceptados
  if (status === 'completed') {
    const { count } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id)
      .eq('status', 'accepted');
    
    if (!count || count === 0) {
      throw new AppError('No hay participantes aceptados para completar el proyecto', 400, 'NO_PARTICIPANTS');
    }
  }
  
  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  res.json({ project: data });
});

// DELETE /api/projects/:id
export const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('owner_id, group_id')
    .eq('id', id)
    .single();
  
  if (!project) throw new NotFoundError('Proyecto');
  
  const isOwner = project.owner_id === req.user.id;
  let isGroupOwner = false;
  
  if (project.group_id) {
    const { data: membership } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();
    
    isGroupOwner = membership && membership.role === 'owner';
  }
  
  if (!isOwner && !isGroupOwner) {
    throw new ForbiddenError('Solo el owner del proyecto o del grupo puede eliminarlo');
  }
  
  const { error } = await supabaseAdmin
    .from('projects')
    .delete()
    .eq('id', id);
  
  if (error) throw new Error(error.message);
  
  res.json({ message: 'Proyecto eliminado' });
});

// GET /api/projects/user/:userId
export const getUserProjects = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Proyectos creados
  const { data: created } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  
  // Proyectos participados
  const { data: participated } = await supabaseAdmin
    .from('applications')
    .select(`
      project:projects(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted');
  
  const participatedProjects = (participated || []).map(p => p.project).filter(Boolean);
  
  // Combinar y deduplicar
  const allProjects = [...(created || []), ...participatedProjects];
  const unique = allProjects.filter((p, i, self) => self.findIndex(x => x.id === p.id) === i);
  unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json({ projects: unique });
});

// GET /api/projects/user/:userId/featured
export const getFeaturedProjects = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('featured_project_ids')
    .eq('id', userId)
    .single();
  
  if (!profile?.featured_project_ids?.length) {
    return res.json({ projects: [] });
  }
  
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .in('id', profile.featured_project_ids);
  
  if (error) throw new Error(error.message);
  
  // Mantener orden
  const orderMap = new Map(profile.featured_project_ids.map((id, i) => [id, i]));
  const sorted = (data || []).sort((a, b) => (orderMap.get(a.id) || 999) - (orderMap.get(b.id) || 999));
  
  res.json({ projects: sorted });
});

// PUT /api/projects/user/:userId/featured
export const saveFeaturedProjects = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { projectIds } = req.body;
  
  if (userId !== req.user.id) {
    throw new ForbiddenError('No puedes editar los proyectos destacados de otro usuario');
  }
  
  if (!Array.isArray(projectIds) || projectIds.length > 5) {
    throw new AppError('Máximo 5 proyectos destacados', 400, 'MAX_FEATURED_EXCEEDED');
  }
  
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ featured_project_ids: projectIds })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  res.json({ user: data });
});

// GET /api/projects/:id/can-rate
export const canRateUser = asyncHandler(async (req, res) => {
  const { id } = req.validated.params; // projectId
  const { ratedId } = req.query;
  
  if (!ratedId) throw new AppError('ratedId requerido', 400, 'MISSING_RATED_ID');
  
  const { data, error } = await supabaseAdmin
    .rpc('can_rate_user', {
      p_project_id: id,
      p_rater_id: req.user.id,
      p_rated_id: ratedId
    });
  
  if (error) throw new Error(error.message);
  
  res.json({ canRate: data });
});