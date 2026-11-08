// backend/src/controllers/ratingController.js
// Controlador de calificaciones (Prisma)

import { prisma } from '../config/prisma.js';
import { serializeRating } from '../utils/serializers.js';
import { asyncHandler, NotFoundError, ForbiddenError, AppError } from '../middleware/errorHandler.js';

// POST /api/ratings/project/:projectId
export const saveRatings = asyncHandler(async (req, res) => {
  const { projectId } = req.validated.params;
  const { ratings } = req.validated.body; // { [ratedUserId]: stars }
  const raterId = req.user.id;

  // Verificar que el proyecto existe y está completado
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, status: true, ownerId: true }
  });

  if (!project) throw new NotFoundError('Proyecto');
  if (project.status !== 'completed') {
    throw new AppError('Solo se pueden calificar proyectos completados', 400, 'PROJECT_NOT_COMPLETED');
  }
  if (project.ownerId !== raterId) throw new ForbiddenError('Solo el owner puede calificar');

  // Obtener participantes aceptados
  const participants = await prisma.application.findMany({
    where: { projectId, status: 'accepted' },
    select: { userId: true }
  });

  const acceptedUserIds = new Set(participants.map(participant => participant.userId));

  const results = [];

  for (const [ratedUserId, stars] of Object.entries(ratings)) {
    if (!stars || stars < 1 || stars > 5) continue;

    // Verificar que el usuario a calificar es participante aceptado
    if (!acceptedUserIds.has(ratedUserId)) {
      throw new AppError(
        `El usuario ${ratedUserId} no es participante aceptado`,
        400,
        'INVALID_RATED_USER'
      );
    }

    // No auto-calificarse
    if (ratedUserId === raterId) {
      throw new AppError('No puedes calificarte a ti mismo', 400, 'SELF_RATING');
    }

    const rating = await prisma.rating.upsert({
      where: {
        projectId_ratedUserId_ratedById: {
          projectId,
          ratedUserId,
          ratedById: raterId
        }
      },
      update: {
        stars,
        updatedAt: new Date()
      },
      create: {
        projectId,
        ratedUserId,
        ratedById: raterId,
        stars
      }
    });

    results.push(serializeRating(rating));
  }

  res.json({ ratings: results });
});

// GET /api/ratings/project/:projectId
export const getProjectRatings = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const ratings = await prisma.rating.findMany({
    where: { projectId },
    include: {
      ratedUser: { select: { id: true, name: true, username: true, avatar: true } },
      rater: { select: { id: true, name: true, username: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ ratings: ratings.map(serializeRating) });
});

// GET /api/ratings/user/:userId/received
export const getUserReceivedRatings = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const ratings = await prisma.rating.findMany({
    where: { ratedUserId: userId },
    include: {
      project: { select: { id: true, title: true, category: true, image: true, ownerId: true } },
      rater: { select: { id: true, name: true, username: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ ratings: ratings.map(serializeRating) });
});

// GET /api/ratings/user/:userId/given
export const getUserGivenRatings = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const ratings = await prisma.rating.findMany({
    where: { ratedById: userId },
    include: {
      project: { select: { id: true, title: true, category: true, image: true } },
      ratedUser: { select: { id: true, name: true, username: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ ratings: ratings.map(serializeRating) });
});

// GET /api/ratings/user/:userId/average
export const getUserAvgRating = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const aggregate = await prisma.rating.aggregate({
    where: { ratedUserId: userId },
    _avg: { stars: true }
  });

  const averageRating = aggregate._avg.stars
    ? Number(Number(aggregate._avg.stars).toFixed(2))
    : 0;

  res.json({ averageRating });
});

// GET /api/ratings/user/:userId/count
export const getUserRatingCount = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const ratingCount = await prisma.rating.count({ where: { ratedUserId: userId } });

  res.json({ ratingCount });
});

// GET /api/ratings/user/:userId/distribution
export const getUserRatingDistribution = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const ratings = await prisma.rating.findMany({
    where: { ratedUserId: userId },
    select: { stars: true }
  });

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(rating => {
    distribution[rating.stars] = (distribution[rating.stars] || 0) + 1;
  });

  res.json({ distribution });
});

// GET /api/ratings/project/:projectId/user/:userId
export const getUserProjectRating = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  const rating = await prisma.rating.findFirst({
    where: { projectId, ratedUserId: userId }
  });

  res.json({ rating: rating ? serializeRating(rating) : null });
});

// GET /api/ratings/project/:projectId/can-rate/:ratedId
export const checkCanRate = asyncHandler(async (req, res) => {
  const { projectId, ratedId } = req.params;
  const raterId = req.user.id;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: raterId,
      status: 'completed',
      applications: { some: { userId: ratedId, status: 'accepted' } }
    },
    select: { id: true }
  });

  res.json({ canRate: Boolean(project) });
});
