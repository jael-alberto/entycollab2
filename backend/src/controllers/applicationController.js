// backend/src/controllers/applicationController.js
// Controlador de postulaciones e invitaciones (Prisma)

import { prisma } from '../config/prisma.js';
import { serializeApplication } from '../utils/serializers.js';
import {
  asyncHandler, NotFoundError, ForbiddenError, ConflictError, AppError
} from '../middleware/errorHandler.js';

async function getGroupRole(groupId, userId) {
  if (!groupId) return null;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true }
  });

  return membership?.role || null;
}

async function canManageProject(project, userId) {
  if (project.ownerId === userId) return true;
  if (!project.groupId) return false;

  const role = await getGroupRole(project.groupId, userId);
  return role === 'owner' || role === 'admin';
}

async function assertGroupProjectAccess(project, userId) {
  if (!project.groupId) return;

  const group = await prisma.group.findUnique({
    where: { id: project.groupId },
    select: { isPrivate: true }
  });

  if (!group) throw new NotFoundError('Proyecto');

  if (group.isPrivate) {
    const role = await getGroupRole(project.groupId, userId);
    if (!role) throw new ForbiddenError('Este proyecto pertenece a un grupo privado');
  }
}

const APPLICATION_PROJECT_INCLUDE = {
  project: {
    select: {
      id: true, title: true, category: true, status: true,
      image: true, deadline: true, slots: true, minRating: true, ownerId: true,
      owner: { select: { id: true, name: true, username: true, avatar: true } },
      group: { select: { id: true, name: true } }
    }
  },
  user: {
    select: {
      id: true, name: true, username: true, avatar: true,
      skills: true, gameTypes: true, disciplines: true
    }
  },
  inviter: { select: { id: true, name: true, username: true, avatar: true } }
};

// POST /api/applications/apply
export const applyToProject = asyncHandler(async (req, res) => {
  const { projectId, message = '' } = req.validated.body;
  const userId = req.user.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true, status: true, minRating: true, ownerId: true, groupId: true, slots: true
    }
  });

  if (!project) throw new NotFoundError('Proyecto');
  if (project.status !== 'open') {
    throw new AppError('El proyecto no está abierto para postulaciones', 400, 'PROJECT_NOT_OPEN');
  }
  if (project.ownerId === userId) {
    throw new AppError('No puedes postularte a tu propio proyecto', 400, 'OWN_PROJECT');
  }

  await assertGroupProjectAccess(project, userId);

  const existing = await prisma.application.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true }
  });

  if (existing) throw new ConflictError('Ya te has postulado a este proyecto');

  const acceptedCount = await prisma.application.count({
    where: { projectId, status: 'accepted' }
  });

  if (acceptedCount >= project.slots) {
    throw new AppError('No hay cupos disponibles', 400, 'SLOTS_FULL');
  }

  // Verificar rating mínimo
  if (Number(project.minRating) > 0) {
    const ratingAgg = await prisma.rating.aggregate({
      where: { ratedUserId: userId },
      _avg: { stars: true }
    });

    const avgRating = Number(ratingAgg._avg.stars || 0);

    if (avgRating < Number(project.minRating)) {
      throw new AppError(
        `Necesitas un promedio de ${project.minRating}★ o más`,
        400,
        'MIN_RATING_REQUIRED'
      );
    }
  }

  const application = await prisma.application.create({
    data: {
      projectId,
      userId,
      status: 'pending',
      message
    },
    include: {
      project: {
        select: {
          id: true, title: true, category: true, status: true,
          minRating: true, slots: true, ownerId: true
        }
      }
    }
  });

  res.status(201).json({ application: serializeApplication(application) });
});

// POST /api/applications/invite
export const sendInvite = asyncHandler(async (req, res) => {
  const { projectId, targetUserId, message = '' } = req.validated.body;
  const userId = req.user.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, status: true, slots: true, ownerId: true, groupId: true }
  });

  if (!project) throw new NotFoundError('Proyecto');

  if (!await canManageProject(project, userId)) {
    throw new ForbiddenError('Solo el owner del proyecto o un admin del grupo puede invitar');
  }
  if (project.status !== 'open') {
    throw new AppError('El proyecto no está abierto', 400, 'PROJECT_NOT_OPEN');
  }
  if (targetUserId === project.ownerId) {
    throw new AppError('No puedes invitarte a tu propio proyecto', 400, 'OWN_PROJECT');
  }

  const acceptedCount = await prisma.application.count({
    where: { projectId, status: 'accepted' }
  });

  if (acceptedCount >= project.slots) {
    throw new AppError('No hay cupos disponibles', 400, 'SLOTS_FULL');
  }

  const targetUser = await prisma.profile.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, username: true }
  });

  if (!targetUser) throw new NotFoundError('Usuario');

  const application = await prisma.application.create({
    data: {
      projectId,
      userId: targetUserId,
      status: 'pending',
      invitedBy: userId,
      message
    },
    include: {
      project: {
        select: { id: true, title: true, category: true, status: true, slots: true }
      },
      inviter: { select: { id: true, name: true, username: true } }
    }
  });

  res.status(201).json({ application: serializeApplication(application) });
});

// PUT /api/applications/:id
export const handleApplication = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { status, projectRole } = req.validated.body;
  const userId = req.user.id;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true, title: true, status: true, slots: true, ownerId: true, groupId: true
        }
      }
    }
  });

  if (!application || !application.project) throw new NotFoundError('Postulación');

  if (!await canManageProject(application.project, userId)) {
    throw new ForbiddenError('Solo el owner del proyecto o un admin del grupo puede gestionar postulaciones');
  }

  if (application.status !== 'pending') {
    throw new AppError(
      'Solo se pueden gestionar postulaciones pendientes',
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }

  if (status === 'accepted' && !['open', 'in-progress'].includes(application.project.status)) {
    throw new AppError(
      'No se pueden aceptar participantes en un proyecto cerrado o completado',
      400,
      'PROJECT_CLOSED'
    );
  }

  const data = { status, respondedAt: new Date() };
  if (status === 'accepted') {
    data.projectRole = projectRole || 'Developer';
  }

  const updated = await prisma.application.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true } },
      project: { select: { id: true, title: true, ownerId: true } }
    }
  });

  res.json({ application: serializeApplication(updated) });
});

// PUT /api/applications/:id/respond
export const respondInvite = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { action } = req.validated.body; // 'accepted' | 'rejected'
  const userId = req.user.id;

  const application = await prisma.application.findFirst({
    where: { id, userId },
    include: {
      project: {
        select: { id: true, title: true, status: true, slots: true, ownerId: true }
      }
    }
  });

  if (!application || !application.project) throw new NotFoundError('Invitación');
  if (!application.invitedBy) throw new AppError('Esta no es una invitación', 400, 'NOT_INVITE');
  if (application.status !== 'pending') {
    throw new AppError('Esta invitación ya fue respondida', 400, 'ALREADY_RESPONDED');
  }

  if (action === 'accepted' && !['open', 'in-progress'].includes(application.project.status)) {
    throw new AppError(
      'No puedes aceptar una invitación de un proyecto cerrado o completado',
      400,
      'PROJECT_CLOSED'
    );
  }

  const newStatus = action === 'accepted' ? 'accepted' : 'rejected';

  const updated = await prisma.application.update({
    where: { id },
    data: { status: newStatus, respondedAt: new Date() },
    include: {
      project: { select: { id: true, title: true, ownerId: true } }
    }
  });

  res.json({ application: serializeApplication(updated) });
});

// GET /api/applications/user
export const getUserApplications = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const applications = await prisma.application.findMany({
    where: { userId },
    include: APPLICATION_PROJECT_INCLUDE,
    orderBy: { appliedAt: 'desc' }
  });

  res.json({ applications: applications.map(serializeApplication) });
});

// GET /api/applications/project/:projectId
export const getProjectApplications = asyncHandler(async (req, res) => {
  const { projectId } = req.validated.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, groupId: true }
  });

  if (!project) throw new NotFoundError('Proyecto');

  if (!await canManageProject(project, req.user.id)) {
    throw new ForbiddenError('No tienes permisos para ver las postulaciones');
  }

  const applications = await prisma.application.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true, name: true, username: true, avatar: true,
          skills: true, gameTypes: true, disciplines: true
        }
      },
      inviter: { select: { id: true, name: true, username: true } }
    },
    orderBy: { appliedAt: 'desc' }
  });

  res.json({ applications: applications.map(serializeApplication) });
});

// GET /api/applications/invites/pending
export const getPendingInvites = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const invitations = await prisma.application.findMany({
    where: {
      userId,
      status: 'pending',
      invitedBy: { not: null }
    },
    include: {
      project: {
        select: {
          id: true, title: true, category: true, status: true, image: true,
          owner: { select: { id: true, name: true, username: true, avatar: true } }
        }
      },
      inviter: { select: { id: true, name: true, username: true, avatar: true } }
    },
    orderBy: { appliedAt: 'desc' }
  });

  res.json({ invitations: invitations.map(serializeApplication) });
});

// GET /api/applications/check/:projectId
export const checkUserApplication = asyncHandler(async (req, res) => {
  const { projectId } = req.validated.params;
  const userId = req.user.id;

  const application = await prisma.application.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true, status: true, projectRole: true }
  });

  res.json({
    application: application
      ? {
          id: application.id,
          status: application.status,
          project_role: application.projectRole
        }
      : null
  });
});

// GET /api/applications/project/:projectId/accepted
export const getAcceptedApplications = asyncHandler(async (req, res) => {
  const { projectId } = req.validated.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, groupId: true }
  });

  if (!project) throw new NotFoundError('Proyecto');

  if (project.groupId) {
    const role = await getGroupRole(project.groupId, req.user.id);
    const isOwner = project.ownerId === req.user.id;
    if (!isOwner && !role) {
      throw new ForbiddenError('No tienes acceso a los participantes de este proyecto');
    }
  }

  const applications = await prisma.application.findMany({
    where: { projectId, status: 'accepted' },
    select: {
      userId: true,
      projectRole: true,
      user: { select: { id: true, name: true, username: true, avatar: true } }
    }
  });

  res.json({
    participants: applications.map(application => ({
      user_id: application.userId,
      project_role: application.projectRole,
      user: application.user
        ? {
            id: application.user.id,
            name: application.user.name,
            username: application.user.username,
            avatar: application.user.avatar ?? null
          }
        : null
    }))
  });
});
