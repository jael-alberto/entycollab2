// backend/src/controllers/groupController.js
// Controlador de grupos/equipos

import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, NotFoundError, ForbiddenError, ConflictError, AppError } from '../middleware/errorHandler.js';

async function getMembership(groupId, userId) {
  const { data } = await supabaseAdmin
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  return data || null;
}

async function getGroupWithAccess(groupId, userId) {
  const { data: group, error } = await supabaseAdmin
    .from('groups')
    .select('id, owner_id, is_private')
    .eq('id', groupId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!group) throw new NotFoundError('Grupo');

  const membership = await getMembership(groupId, userId);
  const isOwner = group.owner_id === userId;
  const isMember = isOwner || !!membership;

  if (group.is_private && !isMember) {
    throw new ForbiddenError('No tienes acceso a este grupo privado');
  }

  return {
    group,
    membership,
    isMember,
    isOwner,
    isAdmin: isOwner || membership?.role === 'admin'
  };
}

// GET /api/groups
export const listGroups = asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 20, search } = req.validated.query;
  const userId = req.user.id;
  
  // Obtener IDs de grupos donde el usuario es miembro
  const { data: memberships } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);
  
  const memberGroupIds = (memberships || []).map(m => m.group_id);
  
  let query = supabaseAdmin
    .from('groups')
    .select(`
      *,
      owner:profiles!owner_id(id, name, username, avatar),
      members:group_members(count)
    `, { count: 'exact' });
  
  // Filtrar: públicos + donde es miembro + donde es owner
  const conditions = [`is_private.eq.false`];
  if (memberGroupIds.length > 0) {
    conditions.push(`id.in.(${memberGroupIds.join(',')})`);
  }
  conditions.push(`owner_id.eq.${userId}`);
  
  query = query.or(conditions.join(','));
  
  if (search) {
    const cleanSearch = String(search).replace(/[,()%\\]/g, ' ').trim().slice(0, 100);
    if (cleanSearch) query = query.ilike('name', `%${cleanSearch}%`);
  }
  
  query = query.order('created_at', { ascending: false });
  
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

// GET /api/groups/user
export const getUserGroups = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select(`
      group_id,
      role,
      joined_at,
      group:groups(
        id, name, description, owner_id, is_private, created_at,
        owner:profiles!owner_id(id, name, username, avatar)
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  
  const groups = (data || []).map(d => ({
    ...d.group,
    membership: { role: d.role, joined_at: d.joined_at }
  }));
  
  res.json({ groups });
});

// GET /api/groups/:id
export const getGroup = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const userId = req.user.id;
  
  const { data, error } = await supabaseAdmin
    .from('groups')
    .select(`
      *,
      owner:profiles!owner_id(id, name, username, avatar),
      members:group_members(
        user_id, role, joined_at,
        user:profiles!user_id(id, name, username, avatar, available)
      ),
      requests:group_requests(
        id, user_id, status, requested_at, decided_at,
        user:profiles!user_id(id, name, username, avatar)
      ),
      projects:projects(id, title, category, status, created_at, owner_id)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') throw new NotFoundError('Grupo');
    throw new Error(error.message);
  }
  
  // Verificar acceso a grupos privados
  const isOwner = data.owner_id === userId;
  const membership = data.members?.find(m => m.user_id === userId);

  if (data.is_private && !isOwner && !membership) {
    throw new ForbiddenError('No tienes acceso a este grupo privado');
  }

  data.currentUserMembership = membership || (isOwner ? { role: 'owner' } : null);
  data.isMember = isOwner || !!membership;
  data.isAdmin = isOwner || membership?.role === 'admin';
  data.isOwner = isOwner;

  // Filtrar solicitudes si no es admin
  if (!data.isAdmin) {
    data.requests = data.requests?.filter(r => r.user_id === userId) || [];
  }
  
  res.json({ group: data });
});

// POST /api/groups
export const createGroup = asyncHandler(async (req, res) => {
  const { name, description = '', isPrivate = true } = req.validated.body;
  const userId = req.user.id;
  
  const { data: group, error } = await supabaseAdmin
    .from('groups')
    .insert({
      name: name.trim(),
      description: description.trim(),
      owner_id: userId,
      is_private: isPrivate
    })
    .select(`
      *,
      owner:profiles!owner_id(id, name, username, avatar)
    `)
    .single();
  
  if (error) throw new Error(error.message);
  
  // El trigger add_group_owner agrega al owner como miembro automáticamente
  
  res.status(201).json({ group });
});

// PUT /api/groups/:id
export const updateGroup = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { name, description, isPrivate } = req.validated.body;
  const userId = req.user.id;
  
  // Verificar permisos: owner o admin del grupo
  const access = await getGroupWithAccess(id, userId);
  if (!access.isAdmin) {
    throw new ForbiddenError('Solo el owner o un admin puede actualizar el grupo');
  }
  
  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description.trim();
  if (isPrivate !== undefined) updateData.is_private = isPrivate;
  
  if (Object.keys(updateData).length === 0) {
    return res.json({ group: await getGroupById(id) });
  }
  
  const { data, error } = await supabaseAdmin
    .from('groups')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  res.json({ group: data });
});

// DELETE /api/groups/:id
export const deleteGroup = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const userId = req.user.id;

  const access = await getGroupWithAccess(id, userId);
  if (!access.isOwner) {
    throw new ForbiddenError('Solo el owner puede eliminar el grupo');
  }

  const { error } = await supabaseAdmin
    .from('groups')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  res.json({ message: 'Grupo eliminado' });
});

// GET /api/groups/:id/members
export const getGroupMembers = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  await getGroupWithAccess(id, req.user.id);

  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select(`
      user_id, role, joined_at,
      user:profiles!user_id(id, name, username, avatar, available, skills)
    `)
    .eq('group_id', id)
    .order('joined_at', { ascending: true });
  
  if (error) throw new Error(error.message);
  
  res.json({ members: data || [] });
});

// PUT /api/groups/:id/members/:memberId
export const setGroupMemberRole = asyncHandler(async (req, res) => {
  const { id, memberId } = req.validated.params;
  const { role } = req.validated.body;
  const userId = req.user.id;
  
  // Verificar permisos: owner o admin del grupo
  const access = await getGroupWithAccess(id, userId);
  if (!access.isAdmin) {
    throw new ForbiddenError('Solo el owner o un admin puede cambiar roles');
  }

  // No se puede cambiar el rol del owner
  const { data: targetMember } = await supabaseAdmin
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', memberId)
    .maybeSingle();

  if (!targetMember) throw new NotFoundError('Miembro');
  if (targetMember.role === 'owner') {
    throw new AppError('No se puede cambiar el rol del owner', 400, 'CANNOT_CHANGE_OWNER');
  }
  if (!access.isOwner && targetMember.role === 'admin') {
    throw new ForbiddenError('Solo el owner puede cambiar el rol de un administrador');
  }
  
  const { data, error } = await supabaseAdmin
    .from('group_members')
    .update({ role })
    .eq('group_id', id)
    .eq('user_id', memberId)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  res.json({ member: data });
});

// DELETE /api/groups/:id/members/:memberId
export const removeGroupMember = asyncHandler(async (req, res) => {
  const { id, memberId } = req.validated.params;
  const userId = req.user.id;

  const access = await getGroupWithAccess(id, userId);
  const isSelf = memberId === userId;

  // Cualquier miembro puede salir por su cuenta; owner/admin pueden expulsar.
  if (!isSelf && !access.isAdmin) {
    throw new ForbiddenError('No tienes permisos para eliminar miembros');
  }

  const { data: targetMember } = await supabaseAdmin
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', memberId)
    .maybeSingle();

  if (!targetMember) throw new NotFoundError('Miembro');
  if (targetMember.role === 'owner') {
    throw new AppError(
      'El owner no puede salir del grupo; debe eliminarlo o transferir la propiedad',
      400,
      'CANNOT_REMOVE_OWNER'
    );
  }

  if (isSelf && access.isOwner) {
    throw new AppError('El owner no puede salir del grupo', 400, 'CANNOT_REMOVE_OWNER');
  }

  // Los admins solo pueden eliminar members, no otros admins
  if (access.isAdmin && !access.isOwner && !isSelf && targetMember.role === 'admin') {
    throw new ForbiddenError('Solo el owner puede remover administradores');
  }

  const { error } = await supabaseAdmin
    .from('group_members')
    .delete()
    .eq('group_id', id)
    .eq('user_id', memberId);

  if (error) throw new Error(error.message);

  res.json({ message: isSelf ? 'Has salido del grupo' : 'Miembro eliminado' });
});

// POST /api/groups/:id/join
export const requestToJoinGroup = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const userId = req.user.id;
  
  // Verificar que el grupo existe
  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .select('id, is_private')
    .eq('id', id)
    .maybeSingle();

  if (groupError) throw new Error(groupError.message);
  if (!group) throw new NotFoundError('Grupo');

  // Verificar si ya es miembro
  const { data: member } = await supabaseAdmin
    .from('group_members')
    .select('user_id')
    .eq('group_id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (member) throw new ConflictError('Ya eres miembro de este grupo');

  // Verificar solicitud pendiente
  const { data: existing } = await supabaseAdmin
    .from('group_requests')
    .select('id, status')
    .eq('group_id', id)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) throw new ConflictError('Ya tienes una solicitud pendiente');
  
  const { data, error } = await supabaseAdmin
    .from('group_requests')
    .insert({
      group_id: id,
      user_id: userId,
      status: 'pending'
    })
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  res.status(201).json({ request: data });
});

// PUT /api/groups/:id/requests/:requestId
export const decideGroupRequest = asyncHandler(async (req, res) => {
  const { id, requestId } = req.validated.params;
  const { accepted } = req.validated.body;
  const userId = req.user.id;
  
  // Verificar permisos (owner/admin)
  const access = await getGroupWithAccess(id, userId);
  if (!access.isAdmin) {
    throw new ForbiddenError('Solo admins pueden gestionar solicitudes');
  }

  const newStatus = accepted ? 'accepted' : 'rejected';

  const { data: request, error: requestError } = await supabaseAdmin
    .from('group_requests')
    .select('id')
    .eq('id', requestId)
    .eq('group_id', id)
    .eq('status', 'pending')
    .maybeSingle();

  if (requestError) throw new Error(requestError.message);
  if (!request) throw new ConflictError('La solicitud no existe o ya fue gestionada');

  const { data, error } = await supabaseAdmin
    .from('group_requests')
    .update({
      status: newStatus,
      decided_by: userId
    })
    .eq('id', requestId)
    .eq('group_id', id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  // El trigger accept_group_request agrega al miembro automáticamente
  
  res.json({ request: data });
});

// GET /api/groups/:id/requests
export const getGroupRequests = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  
  const { data, error } = await supabaseAdmin
    .from('group_requests')
    .select(`
      *,
      user:profiles!user_id(id, name, username, avatar, skills, categories)
    `)
    .eq('group_id', id)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });
  
  if (error) throw new Error(error.message);
  
  res.json({ requests: data || [] });
});

// GET /api/groups/:id/projects
export const listGroupProjects = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { page = 1, pageSize = 20, status } = req.query;
  
  // Verificar membresía
  const { data: membership } = await supabaseAdmin
    .from('group_members')
    .select('user_id')
    .eq('group_id', id)
    .eq('user_id', req.user.id)
    .single();
  
  if (!membership) throw new ForbiddenError('No eres miembro de este grupo');
  
  let query = supabaseAdmin
    .from('projects')
    .select(`
      *,
      owner:profiles!owner_id(id, name, username, avatar)
    `, { count: 'exact' })
    .eq('group_id', id);
  
  if (status) query = query.eq('status', status);
  
  query = query.order('created_at', { ascending: false });
  
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

// POST /api/groups/:id/projects
export const createGroupProject = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const projectData = {
    ...req.validated.body,
    owner_id: req.user.id,
    group_id: id,
    status: 'open'
  };
  
  // Verificar membresía admin/owner
  const { data: membership } = await supabaseAdmin
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', req.user.id)
    .single();
  
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new ForbiddenError('No tienes permisos para crear proyectos en este grupo');
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

// Helper
async function getGroupById(id) {
  const { data } = await supabaseAdmin
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}