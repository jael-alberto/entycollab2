// backend/src/controllers/applicationController.js
// Controlador de postulaciones e invitaciones

import { supabaseAdmin } from '../config/supabase.js';
import {
  asyncHandler, NotFoundError, ForbiddenError, ConflictError, AppError
} from '../middleware/errorHandler.js';

async function getGroupRole(groupId, userId) {
  if (!groupId) return null;

  const { data } = await supabaseAdmin
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  return data?.role || null;
}

async function canManageProject(project, userId) {
  if (project.owner_id === userId) return true;
  if (!project.group_id) return false;

  const role = await getGroupRole(project.group_id, userId);
  return role === 'owner' || role === 'admin';
}

async function assertGroupProjectAccess(project, userId) {
  if (!project.group_id) return;

  const { data: group } = await supabaseAdmin
    .from('groups')
    .select('is_private')
    .eq('id', project.group_id)
    .maybeSingle();

  if (!group) throw new NotFoundError('Proyecto');

  if (group.is_private) {
    const role = await getGroupRole(project.group_id, userId);
    if (!role) throw new ForbiddenError('Este proyecto pertenece a un grupo privado');
  }
}

// POST /api/applications/apply
export const applyToProject = asyncHandler(async (req, res) => {
  const { projectId, message = '' } = req.validated.body;
  const userId = req.user.id;

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, status, min_rating, owner_id, group_id, slots')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw new Error(projectError.message);
  if (!project) throw new NotFoundError('Proyecto');
  if (project.status !== 'open') {
    throw new AppError('El proyecto no está abierto para postulaciones', 400, 'PROJECT_NOT_OPEN');
  }
  if (project.owner_id === userId) {
    throw new AppError('No puedes postularte a tu propio proyecto', 400, 'OWN_PROJECT');
  }

  await assertGroupProjectAccess(project, userId);

  const { data: existing } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) throw new ConflictError('Ya te has postulado a este proyecto');

  const { count: acceptedCount } = await supabaseAdmin
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'accepted');

  if ((acceptedCount || 0) >= project.slots) {
    throw new AppError('No hay cupos disponibles', 400, 'SLOTS_FULL');
  }

  // Verificar rating mínimo
  if (project.min_rating > 0) {
    const { data: avgRating } = await supabaseAdmin
      .rpc('get_user_avg_rating', { p_user_id: userId });

    if ((avgRating || 0) < project.min_rating) {
      throw new AppError(
        `Necesitas un promedio de ${project.min_rating}★ o más`,
        400,
        'MIN_RATING_REQUIRED'
      );
    }
  }

  const { data, error } = await supabaseAdmin
    .from('applications')
    .insert({
      project_id: projectId,
      user_id: userId,
      status: 'pending',
      message
    })
    .select(`
      *,
      project:projects(id, title, category, status, min_rating, slots, owner_id)
    `)
    .single();

  if (error) {
    if (error.code === '23505') throw new ConflictError('Ya te has postulado a este proyecto');
    throw new Error(error.message);
  }

  res.status(201).json({ application: data });
});

// POST /api/applications/invite
export const sendInvite = asyncHandler(async (req, res) => {
  const { projectId, targetUserId, message = '' } = req.validated.body;
  const userId = req.user.id;

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, status, slots, owner_id, group_id')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw new Error(projectError.message);
  if (!project) throw new NotFoundError('Proyecto');

  if (!await canManageProject(project, userId)) {
    throw new ForbiddenError('Solo el owner del proyecto o un admin del grupo puede invitar');
  }
  if (project.status !== 'open') {
    throw new AppError('El proyecto no está abierto', 400, 'PROJECT_NOT_OPEN');
  }
  if (targetUserId === project.owner_id) {
    throw new AppError('No puedes invitarte a tu propio proyecto', 400, 'OWN_PROJECT');
  }

  const { count: acceptedCount } = await supabaseAdmin
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'accepted');

  if ((acceptedCount || 0) >= project.slots) {
    throw new AppError('No hay cupos disponibles', 400, 'SLOTS_FULL');
  }

  const { data: targetUser, error: targetError } = await supabaseAdmin
    .from('profiles')
    .select('id, name, username')
    .eq('id', targetUserId)
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!targetUser) throw new NotFoundError('Usuario');

  const { data, error } = await supabaseAdmin
    .from('applications')
    .insert({
      project_id: projectId,
      user_id: targetUserId,
      status: 'pending',
      invited_by: userId,
      message
    })
    .select(`
      *,
      project:projects(id, title, category, status, slots),
      invited_by_profile:profiles!invited_by(id, name, username)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ConflictError('Esta persona ya está postulada o invitada a ese proyecto');
    }
    throw new Error(error.message);
  }

  res.status(201).json({ application: data });
});

// PUT /api/applications/:id
export const handleApplication = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { status, projectRole } = req.validated.body;
  const userId = req.user.id;

  const { data: app, error: appError } = await supabaseAdmin
    .from('applications')
    .select(`
      *,
      project:projects(id, title, status, slots, owner_id, group_id)
    `)
    .eq('id', id)
    .maybeSingle();

  if (appError) throw new Error(appError.message);
  if (!app || !app.project) throw new NotFoundError('Postulación');

  if (!await canManageProject(app.project, userId)) {
    throw new ForbiddenError('Solo el owner del proyecto o un admin del grupo puede gestionar postulaciones');
  }

  if (app.status !== 'pending') {
    throw new AppError(
      'Solo se pueden gestionar postulaciones pendientes',
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }

  if (status === 'accepted' && !['open', 'in-progress'].includes(app.project.status)) {
    throw new AppError(
      'No se pueden aceptar participantes en un proyecto cerrado o completado',
      400,
      'PROJECT_CLOSED'
    );
  }

  const updateData = { status, responded_at: new Date().toISOString() };
  if (status === 'accepted') {
    updateData.project_role = projectRole || 'Developer';
  }

  const { data, error } = await supabaseAdmin
    .from('applications')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      user:profiles!user_id(id, name, username, avatar),
      project:projects(id, title, owner_id)
    `)
    .single();

  if (error) {
    if (error.code === 'P0001' && /cupos|slots/i.test(error.message)) {
      throw new AppError('No hay cupos disponibles', 400, 'SLOTS_FULL');
    }
    throw new Error(error.message);
  }

  res.json({ application: data });
});

// PUT /api/applications/:id/respond
export const respondInvite = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { action } = req.validated.body; // 'accepted' | 'rejected'
  const userId = req.user.id;

  const { data: app, error: appError } = await supabaseAdmin
    .from('applications')
    .select(`
      *,
      project:projects(id, title, status, slots, owner_id)
    `)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (appError) throw new Error(appError.message);
  if (!app || !app.project) throw new NotFoundError('Invitación');
  if (!app.invited_by) throw new AppError('Esta no es una invitación', 400, 'NOT_INVITE');
  if (app.status !== 'pending') {
    throw new AppError('Esta invitación ya fue respondida', 400, 'ALREADY_RESPONDED');
  }

  if (action === 'accepted' && !['open', 'in-progress'].includes(app.project.status)) {
    throw new AppError(
      'No puedes aceptar una invitación de un proyecto cerrado o completado',
      400,
      'PROJECT_CLOSED'
    );
  }

  const newStatus = action === 'accepted' ? 'accepted' : 'rejected';

  const { data, error } = await supabaseAdmin
    .from('applications')
    .update({
      status: newStatus,
      responded_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      *,
      project:projects(id, title, owner_id)
    `)
    .single();

  if (error) {
    if (error.code === 'P0001' && /cupos|slots/i.test(error.message)) {
      throw new AppError('No hay cupos disponibles', 400, 'SLOTS_FULL');
    }
    throw new Error(error.message);
  }

  res.json({ application: data });
});

// GET /api/applications/user
export const getUserApplications = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(`
      *,
      project:projects(
        id, title, category, status, image, deadline,
        owner:profiles!owner_id(id, name, username, avatar),
        group:groups!group_id(id, name)
      )
    `)
    .eq('user_id', userId)
    .order('applied_at', { ascending: false });

  if (error) throw new Error(error.message);

  res.json({ applications: data || [] });
});

// GET /api/applications/project/:projectId
export const getProjectApplications = asyncHandler(async (req, res) => {
  const { projectId } = req.validated.params;

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('owner_id, group_id')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw new Error(projectError.message);
  if (!project) throw new NotFoundError('Proyecto');

  if (!await canManageProject(project, req.user.id)) {
    throw new ForbiddenError('No tienes permisos para ver las postulaciones');
  }

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(`
      *,
      user:profiles!user_id(id, name, username, avatar, skills, game_types, disciplines),
      invited_by_profile:profiles!invited_by(id, name, username)
    `)
    .eq('project_id', projectId)
    .order('applied_at', { ascending: false });

  if (error) throw new Error(error.message);

  res.json({ applications: data || [] });
});

// GET /api/applications/invites/pending
export const getPendingInvites = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(`
      *,
      project:projects(
        id, title, category, status, image,
        owner:profiles!owner_id(id, name, username, avatar)
      ),
      invited_by_profile:profiles!invited_by(id, name, username, avatar)
    `)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .not('invited_by', 'is', null)
    .order('applied_at', { ascending: false });

  if (error) throw new Error(error.message);

  res.json({ invitations: data || [] });
});

// GET /api/applications/check/:projectId
export const checkUserApplication = asyncHandler(async (req, res) => {
  const { projectId } = req.validated.params;
  const userId = req.user.id;

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('id, status, project_role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  res.json({ application: data || null });
});

// GET /api/applications/project/:projectId/accepted
export const getAcceptedApplications = asyncHandler(async (req, res) => {
  const { projectId } = req.validated.params;

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('owner_id, group_id')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw new Error(projectError.message);
  if (!project) throw new NotFoundError('Proyecto');

  if (project.group_id) {
    const role = await getGroupRole(project.group_id, req.user.id);
    const isOwner = project.owner_id === req.user.id;
    if (!isOwner && !role) {
      throw new ForbiddenError('No tienes acceso a los participantes de este proyecto');
    }
  }

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(`
      user_id,
      project_role,
      user:profiles!user_id(id, name, username, avatar)
    `)
    .eq('project_id', projectId)
    .eq('status', 'accepted');

  if (error) throw new Error(error.message);

  res.json({ participants: data || [] });
});
