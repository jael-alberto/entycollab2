// backend/src/controllers/projectController.js
// Controlador de proyectos

import { supabaseAdmin } from '../config/supabase.js';
import {
  asyncHandler, NotFoundError, ForbiddenError, AppError, ValidationError
} from '../middleware/errorHandler.js';

// Limpia texto usado en filtros PostgREST para evitar inyección de operadores.
function sanitizeSearch(value = '') {
  return String(value).replace(/[,()%\\]/g, ' ').trim().slice(0, 100);
}

// IDs de grupos visibles para un usuario: grupos públicos + grupos a los que pertenece.
async function getVisibleGroupIds(userId) {
  const { data: publicGroups } = await supabaseAdmin
    .from('groups')
    .select('id')
    .eq('is_private', false);

  const ids = new Set((publicGroups || []).map(group => group.id));

  if (userId) {
    const { data: memberships } = await supabaseAdmin
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    (memberships || []).forEach(membership => ids.add(membership.group_id));
  }

  return ids;
}

async function getGroupRole(groupId, userId) {
  if (!groupId || !userId) return null;

  const { data: membership } = await supabaseAdmin
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  return membership?.role || null;
}

async function canManageProject(project, userId) {
  if (!userId) return false;
  if (project.owner_id === userId) return true;
  if (!project.group_id) return false;

  const role = await getGroupRole(project.group_id, userId);
  return role === 'owner' || role === 'admin';
}

async function assertProjectVisible(project, userId) {
  if (!project.group_id) return;

  const { data: group } = await supabaseAdmin
    .from('groups')
    .select('owner_id, is_private')
    .eq('id', project.group_id)
    .maybeSingle();

  if (!group) throw new NotFoundError('Proyecto');

  if (!group.is_private) return;
  if (userId && (group.owner_id === userId || await getGroupRole(project.group_id, userId))) return;

  throw new ForbiddenError('Este proyecto pertenece a un grupo privado');
}

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

  if (groupId) {
    const visibleGroupIds = await getVisibleGroupIds(req.user?.id);
    if (!visibleGroupIds.has(groupId)) {
      throw new ForbiddenError('No tienes acceso a este grupo');
    }
    query = query.eq('group_id', groupId);
  } else if (globalOnly) {
    query = query.is('group_id', null);
  } else {
    const visibleGroupIds = await getVisibleGroupIds(req.user?.id);
    if (visibleGroupIds.size === 0) {
      query = query.is('group_id', null);
    } else {
      const groupFilter = Array.from(visibleGroupIds).join(',');
      query = query.or(`group_id.is.null,group_id.in.(${groupFilter})`);
    }
  }

  if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);
  if (ownerId) query = query.eq('owner_id', ownerId);
  if (tech) {
    const techList = tech.split(',').map(item => item.trim()).filter(Boolean);
    if (techList.length > 0) query = query.overlaps('tech', techList);
  }

  const cleanSearch = sanitizeSearch(search);
  if (cleanSearch) {
    query = query.or(
      `title->>es.ilike.%${cleanSearch}%,title->>en.ilike.%${cleanSearch}%,` +
      `description->>es.ilike.%${cleanSearch}%,description->>en.ilike.%${cleanSearch}%`
    );
  }

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
      group:groups!group_id(id, name, owner_id, is_private),
      applications(
        id, user_id, status, project_role, invited_by, message, applied_at, responded_at,
        user:profiles!user_id(id, name, username, avatar),
        invited_by_profile:profiles!invited_by(id, name, username)
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new NotFoundError('Proyecto');

  await assertProjectVisible(data, req.user?.id);

  const canManage = await canManageProject(data, req.user?.id);
  if (!canManage) {
    data.applications = (data.applications || []).filter(
      application => req.user && application.user_id === req.user.id
    );
  }

  res.json({ project: data });
});

// POST /api/projects
export const createProject = asyncHandler(async (req, res) => {
  const { groupId, minRating, ...body } = req.validated.body;

  if (groupId) {
    const role = await getGroupRole(groupId, req.user.id);
    if (role !== 'owner' && role !== 'admin') {
      throw new ForbiddenError('No tienes permisos para crear proyectos en este grupo');
    }
  }

  const projectData = {
    ...body,
    owner_id: req.user.id,
    status: 'open',
    min_rating: minRating ?? 1,
    group_id: groupId || null
  };

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert(projectData)
    .select(`
      *,
      owner:profiles!owner_id(id, name, username, avatar),
      group:groups!group_id(id, name)
    `)
    .single();

  if (error) throw new AppError(error.message, 400, 'PROJECT_CREATE_FAILED');

  res.status(201).json({ project: data });
});

// PUT /api/projects/:id
export const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { minRating, ...body } = req.validated.body;

  const updateData = { ...body };
  if (minRating !== undefined) updateData.min_rating = minRating;

  // El grupo de un proyecto no se reasigna desde la edición normal.
  delete updateData.groupId;
  delete updateData.group_id;
  delete updateData.id;
  delete updateData.owner_id;
  delete updateData.created_at;

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, owner_id, group_id')
    .eq('id', id)
    .maybeSingle();

  if (projectError) throw new Error(projectError.message);
  if (!project) throw new NotFoundError('Proyecto');

  if (!await canManageProject(project, req.user.id)) {
    throw new ForbiddenError('No tienes permisos para editar este proyecto');
  }

  if (Object.keys(updateData).length === 0) {
    throw new ValidationError({ body: ['No se enviaron campos para actualizar'] });
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      owner:profiles!owner_id(id, name, username, avatar),
      group:groups!group_id(id, name)
    `)
    .single();

  if (error) throw new AppError(error.message, 400, 'PROJECT_UPDATE_FAILED');

  res.json({ project: data });
});

// PUT /api/projects/:id/status
export const changeProjectStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { status } = req.validated.body;

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, owner_id, group_id, status')
    .eq('id', id)
    .maybeSingle();

  if (projectError) throw new Error(projectError.message);
  if (!project) throw new NotFoundError('Proyecto');

  if (!await canManageProject(project, req.user.id)) {
    throw new ForbiddenError('Solo el owner o un admin del grupo puede cambiar el estado');
  }

  const allowedTransitions = {
    open: ['in-progress', 'closed'],
    'in-progress': ['completed', 'closed'],
    completed: ['closed'],
    closed: ['open']
  };

  if (project.status !== status && !allowedTransitions[project.status]?.includes(status)) {
    throw new AppError(
      `No se puede pasar de "${project.status}" a "${status}"`,
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }

  if (status === 'completed') {
    const { count } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id)
      .eq('status', 'accepted');

    if (!count) {
      throw new AppError(
        'No hay participantes aceptados para completar el proyecto',
        400,
        'NO_PARTICIPANTS'
      );
    }
  }

  if (project.status === status) {
    return res.json({ project });
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ status })
    .eq('id', id)
    .select(`
      *,
      owner:profiles!owner_id(id, name, username, avatar),
      group:groups!group_id(id, name)
    `)
    .single();

  if (error) throw new AppError(error.message, 400, 'PROJECT_STATUS_FAILED');

  res.json({ project: data });
});

// DELETE /api/projects/:id
export const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, owner_id, group_id')
    .eq('id', id)
    .maybeSingle();

  if (projectError) throw new Error(projectError.message);
  if (!project) throw new NotFoundError('Proyecto');

  if (!await canManageProject(project, req.user.id)) {
    throw new ForbiddenError('Solo el owner del proyecto o un admin del grupo puede eliminarlo');
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
  const { userId } = req.validated.params;
  const isSelf = req.user?.id === userId;
  const visibleGroupIds = isSelf ? null : await getVisibleGroupIds(req.user?.id);
  const isVisible = project => !project.group_id ||
    isSelf ||
    visibleGroupIds.has(project.group_id);

  // Proyectos creados
  const { data: created, error: createdError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (createdError) throw new Error(createdError.message);

  // Proyectos participados
  const { data: participated, error: participatedError } = await supabaseAdmin
    .from('applications')
    .select(`
      project:projects(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (participatedError) throw new Error(participatedError.message);

  const participatedProjects = (participated || []).map(item => item.project).filter(Boolean);

  // Combinar, deduplicar y aplicar visibilidad de grupos privados
  const allProjects = [...(created || []), ...participatedProjects]
    .filter(isVisible)
    .filter((project, index, self) => self.findIndex(item => item.id === project.id) === index);

  allProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({ projects: allProjects });
});

// GET /api/projects/user/:userId/featured
export const getFeaturedProjects = asyncHandler(async (req, res) => {
  const { userId } = req.validated.params;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('featured_project_ids')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile?.featured_project_ids?.length) {
    return res.json({ projects: [] });
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .in('id', profile.featured_project_ids);

  if (error) throw new Error(error.message);

  const isSelf = req.user?.id === userId;
  const visibleGroupIds = isSelf ? null : await getVisibleGroupIds(req.user?.id);
  const visible = (data || []).filter(project =>
    !project.group_id || isSelf || visibleGroupIds.has(project.group_id)
  );

  // Mantener el orden elegido por el usuario
  const orderMap = new Map(profile.featured_project_ids.map((id, index) => [id, index]));
  visible.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

  res.json({ projects: visible });
});

// PUT /api/projects/user/:userId/featured
export const saveFeaturedProjects = asyncHandler(async (req, res) => {
  const { userId } = req.validated.params;
  const { projectIds } = req.validated.body;

  if (userId !== req.user.id) {
    throw new ForbiddenError('No puedes editar los proyectos destacados de otro usuario');
  }

  if (projectIds.length > 0) {
    const [{ data: owned }, { data: accepted }] = await Promise.all([
      supabaseAdmin
        .from('projects')
        .select('id')
        .eq('owner_id', userId)
        .in('id', projectIds),
      supabaseAdmin
        .from('applications')
        .select('project_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .in('project_id', projectIds)
    ]);

    const allowedIds = new Set([
      ...(owned || []).map(project => project.id),
      ...(accepted || []).map(application => application.project_id)
    ]);

    const invalid = projectIds.filter(id => !allowedIds.has(id));
    if (invalid.length > 0) {
      throw new ValidationError({
        projectIds: ['Solo puedes destacar proyectos propios o en los que participas']
      });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ featured_project_ids: projectIds })
    .eq('id', userId)
    .select('id, featured_project_ids')
    .single();

  if (error) throw new Error(error.message);

  res.json({ user: data });
});

// GET /api/projects/:id/can-rate/:ratedId
export const canRateUser = asyncHandler(async (req, res) => {
  const { id, ratedId } = req.validated.params;

  const { data, error } = await supabaseAdmin
    .rpc('can_rate_user', {
      p_project_id: id,
      p_rater_id: req.user.id,
      p_rated_id: ratedId
    });

  if (error) throw new Error(error.message);

  res.json({ canRate: data });
});
