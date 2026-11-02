// backend/src/controllers/projectController.js
// Controlador de proyectos (Prisma)

import { prisma } from '../config/prisma.js';
import {
  serializeProject,
  serializeProfile,
  projectInputToPrisma
} from '../utils/serializers.js';
import {
  asyncHandler, NotFoundError, ForbiddenError, AppError, ValidationError
} from '../middleware/errorHandler.js';

// Limpia texto usado en filtros para evitar caracteres problemáticos.
function sanitizeSearch(value = '') {
  return String(value).replace(/[,()%\\]/g, ' ').trim().slice(0, 100);
}

// IDs de grupos visibles para un usuario: grupos públicos + grupos a los que pertenece.
async function getVisibleGroupIds(userId) {
  const where = userId
    ? {
        OR: [
          { isPrivate: false },
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      }
    : { isPrivate: false };

  const groups = await prisma.group.findMany({ where, select: { id: true } });
  return new Set(groups.map(group => group.id));
}

async function getGroupRole(groupId, userId) {
  if (!groupId || !userId) return null;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true }
  });

  return membership?.role || null;
}

async function canManageProject(project, userId) {
  if (!userId) return false;
  if (project.ownerId === userId) return true;
  if (!project.groupId) return false;

  const role = await getGroupRole(project.groupId, userId);
  return role === 'owner' || role === 'admin';
}

async function assertProjectVisible(project, userId) {
  if (!project.groupId) return;

  const group = await prisma.group.findUnique({
    where: { id: project.groupId },
    select: { ownerId: true, isPrivate: true }
  });

  if (!group) throw new NotFoundError('Proyecto');

  if (!group.isPrivate) return;
  if (userId && (group.ownerId === userId || await getGroupRole(project.groupId, userId))) return;

  throw new ForbiddenError('Este proyecto pertenece a un grupo privado');
}

const PROJECT_LIST_INCLUDE = {
  owner: { select: { id: true, name: true, username: true, avatar: true } },
  group: { select: { id: true, name: true } }
};

const PROJECT_DETAIL_INCLUDE = {
  owner: {
    select: { id: true, name: true, username: true, avatar: true, available: true }
  },
  group: {
    select: { id: true, name: true, ownerId: true, isPrivate: true }
  },
  applications: {
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true } },
      inviter: { select: { id: true, name: true, username: true } }
    }
  }
};

// GET /api/projects
export const listProjects = asyncHandler(async (req, res) => {
  const {
    page = 1, pageSize = 20, status, category, groupId, ownerId,
    tech, search, sortBy = 'created_at', sortOrder = 'desc', globalOnly
  } = req.validated.query;

  const where = {};

  if (groupId) {
    const visibleGroupIds = await getVisibleGroupIds(req.user?.id);
    if (!visibleGroupIds.has(groupId)) {
      throw new ForbiddenError('No tienes acceso a este grupo');
    }
    where.groupId = groupId;
  } else if (globalOnly) {
    where.groupId = null;
  } else {
    const visibleGroupIds = await getVisibleGroupIds(req.user?.id);
    if (visibleGroupIds.size === 0) {
      where.groupId = null;
    } else {
      where.OR = [
        { groupId: null },
        { groupId: { in: Array.from(visibleGroupIds) } }
      ];
    }
  }

  if (status) where.status = status;
  if (category) where.category = category;
  if (ownerId) where.ownerId = ownerId;

  if (tech) {
    const techList = tech.split(',').map(item => item.trim()).filter(Boolean);
    if (techList.length > 0) where.tech = { hasSome: techList };
  }

  const cleanSearch = sanitizeSearch(search);
  if (cleanSearch) {
    const searchConditions = [
      { title: { path: ['es'], string_contains: cleanSearch, mode: 'insensitive' } },
      { title: { path: ['en'], string_contains: cleanSearch, mode: 'insensitive' } },
      { description: { path: ['es'], string_contains: cleanSearch, mode: 'insensitive' } },
      { description: { path: ['en'], string_contains: cleanSearch, mode: 'insensitive' } }
    ];

    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchConditions }];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  const sortFieldMap = {
    created_at: 'createdAt',
    status: 'status',
    category: 'category'
  };
  // Prisma no permite ordenar por campos Json (title), así que se usa createdAt.
  const orderBy = { [sortFieldMap[sortBy] || 'createdAt']: sortOrder === 'asc' ? 'asc' : 'desc' };

  const [projects, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      include: PROJECT_LIST_INCLUDE,
      orderBy,
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

// GET /api/projects/:id
export const getProject = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: PROJECT_DETAIL_INCLUDE
  });

  if (!project) throw new NotFoundError('Proyecto');

  await assertProjectVisible(project, req.user?.id);

  const canManage = await canManageProject(project, req.user?.id);
  if (!canManage) {
    project.applications = (project.applications || []).filter(
      application => req.user && application.userId === req.user.id
    );
  }

  res.json({ project: serializeProject(project) });
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

  const data = projectInputToPrisma({
    ...body,
    ownerId: req.user.id,
    status: 'open',
    minRating: minRating ?? 1,
    groupId: groupId || null
  });

  const project = await prisma.project.create({
    data,
    include: PROJECT_LIST_INCLUDE
  });

  res.status(201).json({ project: serializeProject(project) });
});

// PUT /api/projects/:id
export const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { minRating, ...body } = req.validated.body;

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, ownerId: true, groupId: true }
  });

  if (!project) throw new NotFoundError('Proyecto');

  if (!await canManageProject(project, req.user.id)) {
    throw new ForbiddenError('No tienes permisos para editar este proyecto');
  }

  // El grupo de un proyecto no se reasigna desde la edición normal.
  const updateData = projectInputToPrisma(body);
  if (minRating !== undefined) updateData.minRating = minRating;

  delete updateData.groupId;
  delete updateData.id;
  delete updateData.ownerId;
  delete updateData.createdAt;

  if (Object.keys(updateData).length === 0) {
    throw new ValidationError({ body: ['No se enviaron campos para actualizar'] });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: updateData,
    include: PROJECT_LIST_INCLUDE
  });

  res.json({ project: serializeProject(updated) });
});

// PUT /api/projects/:id/status
export const changeProjectStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { status } = req.validated.body;

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, ownerId: true, groupId: true, status: true }
  });

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
    const acceptedCount = await prisma.application.count({
      where: { projectId: id, status: 'accepted' }
    });

    if (!acceptedCount) {
      throw new AppError(
        'No hay participantes aceptados para completar el proyecto',
        400,
        'NO_PARTICIPANTS'
      );
    }
  }

  if (project.status === status) {
    const current = await prisma.project.findUnique({
      where: { id },
      include: PROJECT_LIST_INCLUDE
    });
    return res.json({ project: serializeProject(current) });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { status },
    include: PROJECT_LIST_INCLUDE
  });

  res.json({ project: serializeProject(updated) });
});

// DELETE /api/projects/:id
export const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, ownerId: true, groupId: true }
  });

  if (!project) throw new NotFoundError('Proyecto');

  if (!await canManageProject(project, req.user.id)) {
    throw new ForbiddenError('Solo el owner del proyecto o un admin del grupo puede eliminarlo');
  }

  await prisma.project.delete({ where: { id } });

  res.json({ message: 'Proyecto eliminado' });
});

// GET /api/projects/user/:userId
export const getUserProjects = asyncHandler(async (req, res) => {
  const { userId } = req.validated.params;
  const isSelf = req.user?.id === userId;
  const visibleGroupIds = isSelf ? null : await getVisibleGroupIds(req.user?.id);
  const isVisible = project => !project.groupId ||
    isSelf ||
    visibleGroupIds.has(project.groupId);

  const [created, participated] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.application.findMany({
      where: { userId, status: 'accepted' },
      select: { project: true }
    })
  ]);

  const participatedProjects = participated.map(item => item.project).filter(Boolean);

  const allProjects = [...created, ...participatedProjects]
    .filter(isVisible)
    .filter((project, index, self) => self.findIndex(item => item.id === project.id) === index);

  allProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ projects: allProjects.map(serializeProject) });
});

// GET /api/projects/user/:userId/featured
export const getFeaturedProjects = asyncHandler(async (req, res) => {
  const { userId } = req.validated.params;

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { featuredProjectIds: true }
  });

  if (!profile?.featuredProjectIds?.length) {
    return res.json({ projects: [] });
  }

  const projects = await prisma.project.findMany({
    where: { id: { in: profile.featuredProjectIds } }
  });

  const isSelf = req.user?.id === userId;
  const visibleGroupIds = isSelf ? null : await getVisibleGroupIds(req.user?.id);
  const visible = projects.filter(project =>
    !project.groupId || isSelf || visibleGroupIds.has(project.groupId)
  );

  // Mantener el orden elegido por el usuario
  const orderMap = new Map(profile.featuredProjectIds.map((id, index) => [id, index]));
  visible.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

  res.json({ projects: visible.map(serializeProject) });
});

// PUT /api/projects/user/:userId/featured
export const saveFeaturedProjects = asyncHandler(async (req, res) => {
  const { userId } = req.validated.params;
  const { projectIds } = req.validated.body;

  if (userId !== req.user.id) {
    throw new ForbiddenError('No puedes editar los proyectos destacados de otro usuario');
  }

  if (projectIds.length > 0) {
    const [owned, accepted] = await Promise.all([
      prisma.project.findMany({
        where: { ownerId: userId, id: { in: projectIds } },
        select: { id: true }
      }),
      prisma.application.findMany({
        where: { userId, status: 'accepted', projectId: { in: projectIds } },
        select: { projectId: true }
      })
    ]);

    const allowedIds = new Set([
      ...owned.map(project => project.id),
      ...accepted.map(application => application.projectId)
    ]);

    const invalid = projectIds.filter(id => !allowedIds.has(id));
    if (invalid.length > 0) {
      throw new ValidationError({
        projectIds: ['Solo puedes destacar proyectos propios o en los que participas']
      });
    }
  }

  const profile = await prisma.profile.update({
    where: { id: userId },
    data: { featuredProjectIds: projectIds }
  });

  res.json({ user: serializeProfile(profile, { includeEmail: true }) });
});

// GET /api/projects/:id/can-rate/:ratedId
export const canRateUser = asyncHandler(async (req, res) => {
  const { id, ratedId } = req.validated.params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      ownerId: req.user.id,
      status: 'completed',
      applications: { some: { userId: ratedId, status: 'accepted' } }
    },
    select: { id: true }
  });

  res.json({ canRate: Boolean(project) });
});
