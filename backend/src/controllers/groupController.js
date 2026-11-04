// backend/src/controllers/groupController.js
// Controlador de grupos/equipos (Prisma)

import { prisma } from '../config/prisma.js';
import {
  serializeGroup,
  serializeGroupMember,
  serializeGroupRequest,
  serializeProject,
  projectInputToPrisma
} from '../utils/serializers.js';
import {
  asyncHandler, NotFoundError, ForbiddenError, ConflictError, AppError
} from '../middleware/errorHandler.js';

async function getMembership(groupId, userId) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true }
  });

  return membership || null;
}

async function getGroupWithAccess(groupId, userId) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, ownerId: true }
  });

  if (!group) throw new NotFoundError('Grupo');

  const membership = await getMembership(groupId, userId);
  const isOwner = group.ownerId === userId;
  const isMember = isOwner || !!membership;

  return {
    group,
    membership,
    isMember,
    isOwner,
    isAdmin: isOwner || membership?.role === 'admin'
  };
}

const GROUP_OWNER_SELECT = { id: true, name: true, username: true, avatar: true };

// GET /api/groups
export const listGroups = asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 20, search } = req.validated.query;
  const userId = req.user?.id;

  // Todos los grupos son públicos: se listan para que cualquiera pueda ver su
  // información principal y solicitar acceso. El contenido completo se valida
  // en getGroup/listGroupProjects.
  const where = {};

  if (search) {
    const cleanSearch = String(search).replace(/[,()%\\]/g, ' ').trim().slice(0, 100);
    if (cleanSearch) where.name = { contains: cleanSearch, mode: 'insensitive' };
  }

  const [groups, total] = await prisma.$transaction([
    prisma.group.findMany({
      where,
      include: {
        owner: { select: GROUP_OWNER_SELECT },
        _count: { select: { members: true } },
        ...(req.user?.id ? {
          requests: {
            where: { userId: req.user.id, status: 'pending' },
            select: { id: true, userId: true, status: true, requestedAt: true }
          }
        } : {})
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.group.count({ where })
  ]);

  res.json({
    data: groups.map(group => serializeGroup(group, { memberCount: group._count.members })),
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

// GET /api/groups/user
export const getUserGroups = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: { owner: { select: GROUP_OWNER_SELECT } }
      }
    },
    orderBy: { joinedAt: 'desc' }
  });

  const groups = memberships.map(membership => ({
    ...serializeGroup(membership.group),
    membership: {
      role: membership.role,
      joined_at: membership.joinedAt
    }
  }));

  res.json({ groups });
});

// GET /api/groups/:id
export const getGroup = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const userId = req.user.id;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      owner: { select: GROUP_OWNER_SELECT },
      members: {
        include: {
          user: {
            select: { id: true, name: true, username: true, avatar: true, available: true }
          }
        }
      },
      requests: {
        include: {
          user: { select: { id: true, name: true, username: true, avatar: true } }
        }
      },
      projects: {
        select: {
          id: true, title: true, category: true, status: true,
          createdAt: true, ownerId: true
        }
      }
    }
  });

  if (!group) throw new NotFoundError('Grupo');

  const membership = group.members.find(member => member.userId === userId);
  const isOwner = group.ownerId === userId;
  const isMember = isOwner || !!membership;

  const isAdmin = isOwner || membership?.role === 'admin';
  const serialized = serializeGroup(group);

  if (!isMember) {
    // Vista pública: información principal + número de miembros. Los proyectos
    // y la lista de miembros quedan reservados a miembros.
    // El usuario autenticado que aún no es miembro debe poder ver sus solicitudes.
    serialized.members = [{ count: group.members.length }];
    serialized.requests = (serialized.requests || []).filter(
      request => (request.userId === userId || request.user_id === userId)
    );
    delete serialized.projects;
  } else if (!isAdmin) {
    // Un miembro normal solo ve sus propias solicitudes.
    serialized.requests = (serialized.requests || []).filter(
      request => (request.userId === userId || request.user_id === userId)
    );
  }

  const userPendingRequest = (serialized.requests || []).find(
    request => (request.userId === userId || request.user_id === userId) && request.status === 'pending'
  );

  serialized.currentUserMembership = membership
    ? { role: membership.role, joined_at: membership.joinedAt }
    : (isOwner ? { role: 'owner' } : null);
  serialized.isMember = isMember;
  serialized.isAdmin = isAdmin;
  serialized.isOwner = isOwner;
  serialized.hasPendingRequest = Boolean(userPendingRequest);
  serialized.currentUserRequest = userPendingRequest || null;

  res.json({ group: serialized });
});

// POST /api/groups
export const createGroup = asyncHandler(async (req, res) => {
  const { name, description = '', isPrivate = false } = req.validated.body;
  const userId = req.user.id;

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description.trim(),
      ownerId: userId,
      isPrivate
    },
    include: { owner: { select: GROUP_OWNER_SELECT } }
  });

  // El trigger add_group_owner agrega al owner como miembro automáticamente

  res.status(201).json({ group: serializeGroup(group) });
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
  if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

  if (Object.keys(updateData).length === 0) {
    return res.json({ group: await getGroupById(id) });
  }

  const group = await prisma.group.update({
    where: { id },
    data: updateData
  });

  res.json({ group: serializeGroup(group) });
});

// DELETE /api/groups/:id
export const deleteGroup = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const userId = req.user.id;

  const access = await getGroupWithAccess(id, userId);
  if (!access.isOwner) {
    throw new ForbiddenError('Solo el owner puede eliminar el grupo');
  }

  await prisma.group.delete({ where: { id } });

  res.json({ message: 'Grupo eliminado' });
});

// GET /api/groups/:id/members
export const getGroupMembers = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const access = await getGroupWithAccess(id, req.user.id);
  if (!access.isMember) {
    throw new ForbiddenError('Debes ser miembro para ver la lista de miembros');
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    include: {
      user: {
        select: {
          id: true, name: true, username: true, avatar: true,
          available: true, skills: true
        }
      }
    },
    orderBy: { joinedAt: 'asc' }
  });

  res.json({ members: members.map(serializeGroupMember) });
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

  const targetMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: memberId } },
    select: { role: true }
  });

  if (!targetMember) throw new NotFoundError('Miembro');
  if (targetMember.role === 'owner') {
    throw new AppError('No se puede cambiar el rol del owner', 400, 'CANNOT_CHANGE_OWNER');
  }
  if (!access.isOwner && targetMember.role === 'admin') {
    throw new ForbiddenError('Solo el owner puede cambiar el rol de un administrador');
  }

  const member = await prisma.groupMember.update({
    where: { groupId_userId: { groupId: id, userId: memberId } },
    data: { role }
  });

  res.json({ member: serializeGroupMember(member) });
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

  const targetMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: memberId } },
    select: { role: true }
  });

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

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId: id, userId: memberId } }
  });

  res.json({ message: isSelf ? 'Has salido del grupo' : 'Miembro eliminado' });
});

// POST /api/groups/:id/join
export const requestToJoinGroup = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const userId = req.user.id;

  // Verificar que el grupo existe. Todos los grupos son públicos: la
  // solicitud de acceso es siempre el mecanismo para entrar.
  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!group) throw new NotFoundError('Grupo');

  // Verificar si ya es miembro
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId } },
    select: { userId: true }
  });

  if (member) throw new ConflictError('Ya eres miembro de este grupo');

  // Verificar solicitud pendiente
  const existing = await prisma.groupRequest.findFirst({
    where: { groupId: id, userId, status: 'pending' },
    select: { id: true, status: true }
  });

  if (existing) throw new ConflictError('Ya tienes una solicitud pendiente');

  const request = await prisma.groupRequest.create({
    data: { groupId: id, userId, status: 'pending' }
  });

  res.status(201).json({ request: serializeGroupRequest(request) });
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

  const request = await prisma.groupRequest.findFirst({
    where: { id: requestId, groupId: id, status: 'pending' },
    select: { id: true }
  });

  if (!request) throw new ConflictError('La solicitud no existe o ya fue gestionada');

  // El trigger accept_group_request agrega al miembro automáticamente.
  // auth.uid() es NULL con Prisma, por eso fijamos decidedBy/decidedAt.
  const updated = await prisma.groupRequest.update({
    where: { id: requestId },
    data: {
      status: newStatus,
      decidedBy: userId,
      decidedAt: new Date()
    }
  });

  res.json({ request: serializeGroupRequest(updated) });
});

// GET /api/groups/:id/requests
export const getGroupRequests = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const access = await getGroupWithAccess(id, req.user.id);
  if (!access.isAdmin) {
    throw new ForbiddenError('Solo el owner o un admin puede ver las solicitudes');
  }

  const requests = await prisma.groupRequest.findMany({
    where: { groupId: id, status: 'pending' },
    include: {
      user: {
        select: {
          id: true, name: true, username: true, avatar: true,
          skills: true, categories: true
        }
      }
    },
    orderBy: { requestedAt: 'asc' }
  });

  res.json({ requests: requests.map(serializeGroupRequest) });
});

// GET /api/groups/:id/my-request
export const getMyGroupRequest = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const userId = req.user.id;

  const request = await prisma.groupRequest.findFirst({
    where: { groupId: id, userId, status: 'pending' },
    orderBy: { requestedAt: 'desc' }
  });

  res.json({
    request: serializeGroupRequest(request),
    hasPendingRequest: Boolean(request)
  });
});

// GET /api/groups/:id/projects
export const listGroupProjects = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { page, pageSize, status } = req.validated.query;

  // Verificar membresía
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: req.user.id } },
    select: { userId: true }
  });

  if (!membership) throw new ForbiddenError('No eres miembro de este grupo');

  const where = { groupId: id };
  if (status) where.status = status;

  const [projects, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      include: { owner: { select: GROUP_OWNER_SELECT } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.project.count({ where })
  ]);

  res.json({
    data: projects.map(serializeProject),
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

// POST /api/groups/:id/projects
export const createGroupProject = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  // Verificar membresía admin/owner
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: req.user.id } },
    select: { role: true }
  });

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new ForbiddenError('No tienes permisos para crear proyectos en este grupo');
  }

  const { minRating, ...body } = req.validated.body;
  const data = projectInputToPrisma({
    ...body,
    ownerId: req.user.id,
    groupId: id,
    status: 'open',
    minRating: minRating ?? 1
  });

  const project = await prisma.project.create({
    data,
    include: { owner: { select: GROUP_OWNER_SELECT } }
  });

  res.status(201).json({ project: serializeProject(project) });
});

// Helper
async function getGroupById(id) {
  const group = await prisma.group.findUnique({ where: { id } });
  return serializeGroup(group);
}
