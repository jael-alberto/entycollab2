// backend/src/controllers/bootstrapController.js
// Carga inicial de datos para el frontend en una sola peticion.

import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  serializeProfile,
  serializeProject,
  serializeGroup,
  serializeApplication,
  serializeRating
} from '../utils/serializers.js';

const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  skills: true,
  categories: true,
  bio: true,
  githubUrl: true,
  portfolioUrl: true,
  available: true,
  featuredProjectIds: true,
  gameTypes: true,
  languages: true,
  favoriteGenres: true,
  disciplines: true,
  createdAt: true
};

// GET /api/bootstrap
// Devuelve los datos visibles para el usuario autenticado (o solo publicos).
export const getBootstrap = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;

  const visibleGroupsWhere = userId
    ? {
        OR: [
          { isPrivate: false },
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      }
    : { isPrivate: false };

  const groups = await prisma.group.findMany({
    where: visibleGroupsWhere,
    include: {
      owner: { select: PUBLIC_PROFILE_SELECT },
      members: { include: { user: { select: PUBLIC_PROFILE_SELECT } } },
      requests: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const managedGroupIds = new Set(
    groups
      .filter(group =>
        group.ownerId === userId ||
        group.members.some(member =>
          member.userId === userId && (member.role === 'owner' || member.role === 'admin')
        )
      )
      .map(group => group.id)
  );

  const groupIds = groups.map(group => group.id);

  const projects = await prisma.project.findMany({
    where: groupIds.length > 0
      ? { OR: [{ groupId: null }, { groupId: { in: groupIds } }] }
      : { groupId: null },
    include: {
      owner: { select: PUBLIC_PROFILE_SELECT },
      group: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const managedProjectIds = new Set(
    projects
      .filter(project =>
        project.ownerId === userId ||
        (project.groupId && managedGroupIds.has(project.groupId))
      )
      .map(project => project.id)
  );

  const profiles = await prisma.profile.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const applications = userId
    ? await prisma.application.findMany({
        where: {
          OR: [
            { userId },
            { projectId: { in: Array.from(managedProjectIds) } }
          ]
        },
        include: {
          user: { select: PUBLIC_PROFILE_SELECT },
          inviter: { select: PUBLIC_PROFILE_SELECT },
          project: { select: { id: true, title: true } }
        },
        orderBy: { appliedAt: 'desc' }
      })
    : [];

  const ratings = await prisma.rating.findMany({
    include: {
      ratedUser: { select: PUBLIC_PROFILE_SELECT },
      rater: { select: PUBLIC_PROFILE_SELECT },
      project: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    projects: projects.map(serializeProject),
    profiles: profiles.map(profile =>
      serializeProfile(profile, { includeEmail: profile.id === userId })
    ),
    groups: groups.map(group => serializeGroup({
      ...group,
      // Las solicitudes solo se muestran a quien administra el grupo.
      requests: managedGroupIds.has(group.id) ? group.requests : []
    })),
    applications: applications.map(serializeApplication),
    ratings: ratings.map(serializeRating)
  });
});
