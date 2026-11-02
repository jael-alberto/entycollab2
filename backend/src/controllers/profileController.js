// backend/src/controllers/profileController.js
// Controlador de perfiles (Prisma)

import { prisma } from '../config/prisma.js';
import { supabaseAdmin } from '../config/supabase.js';
import {
  serializeProfile,
  serializeRating,
  serializeProject,
  profileInputToPrisma
} from '../utils/serializers.js';
import {
  asyncHandler,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError
} from '../middleware/errorHandler.js';

function pagination(page, pageSize, total) {
  return {
    page: Number(page),
    pageSize: Number(pageSize),
    total,
    totalPages: Math.ceil(total / pageSize)
  };
}

// GET /api/profiles
export const listProfiles = asyncHandler(async (req, res) => {
  const { page, pageSize, available } = req.validated.query;

  const where = available === true ? { available: true } : {};

  const [data, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.profile.count({ where })
  ]);

  res.json({
    data: data.map(profile => serializeProfile(profile)),
    pagination: pagination(page, pageSize, total)
  });
});

// GET /api/profiles/search
export const searchProfiles = asyncHandler(async (req, res) => {
  const { q, limit } = req.validated.query;

  if (!q || q.length < 2) {
    return res.json({ data: [] });
  }

  const data = await prisma.profile.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { bio: { path: ['es'], string_contains: q, mode: 'insensitive' } },
        { bio: { path: ['en'], string_contains: q, mode: 'insensitive' } }
      ]
    },
    take: Number(limit)
  });

  res.json({ data: data.map(profile => serializeProfile(profile)) });
});

// GET /api/profiles/available
export const getAvailablePeople = asyncHandler(async (req, res) => {
  const {
    gameTypes, languages, favoriteGenres, disciplines,
    completed, rating, page, pageSize
  } = req.validated.query;

  const where = { available: true };

  if (gameTypes) where.gameTypes = { hasSome: gameTypes.split(',') };
  if (languages) where.languages = { hasSome: languages.split(',') };
  if (favoriteGenres) where.favoriteGenres = { hasSome: favoriteGenres.split(',') };
  if (disciplines) where.disciplines = { hasSome: disciplines.split(',') };

  const [data, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.profile.count({ where })
  ]);

  let filtered = data;

  if (completed) {
    const minCompleted = Math.min(...completed.split(',').map(Number).filter(Number.isFinite));
    const ids = filtered.map(profile => profile.id);
    const counts = await Promise.all(
      ids.map(userId =>
        prisma.project.count({
          where: {
            status: 'completed',
            OR: [
              { ownerId: userId },
              { applications: { some: { userId, status: 'accepted' } } }
            ]
          }
        })
      )
    );
    filtered = filtered.filter((_, index) => counts[index] >= minCompleted);
  }

  if (rating) {
    const minRating = Number(rating);
    const ids = filtered.map(profile => profile.id);
    const averages = await prisma.rating.groupBy({
      by: ['ratedUserId'],
      where: { ratedUserId: { in: ids } },
      _avg: { stars: true }
    });
    const avgByUser = new Map(
      averages.map(item => [item.ratedUserId, item._avg.stars || 0])
    );
    filtered = filtered.filter(profile => (avgByUser.get(profile.id) || 0) >= minRating);
  }

  res.json({
    data: filtered.map(profile => serializeProfile(profile)),
    pagination: pagination(page, pageSize, total)
  });
});

// GET /api/profiles/:id
export const getProfile = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const currentUserId = req.user?.id;

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) throw new NotFoundError('Perfil');

  res.json({
    user: serializeProfile(profile, { includeEmail: profile.id === currentUserId })
  });
});

// GET /api/profiles/by-username/:username
export const getProfileByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user?.id;

  const profile = await prisma.profile.findUnique({ where: { username } });
  if (!profile) throw new NotFoundError('Perfil');

  res.json({
    user: serializeProfile(profile, { includeEmail: profile.id === currentUserId })
  });
});

// PUT /api/profiles/:id
export const updateProfile = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const body = { ...req.validated.body };

  // Verificar ownership
  if (id !== req.user.id) {
    throw new ForbiddenError('No puedes editar el perfil de otro usuario');
  }

  // Verificar username único
  if (body.username) {
    const existing = await prisma.profile.findFirst({
      where: { username: body.username, NOT: { id } },
      select: { id: true }
    });
    if (existing) throw new ConflictError('Ese nombre de usuario ya está en uso');
  }

  // Si cambia email, actualizar en Auth (profiles.email es inmutable por trigger)
  if (body.email) {
    const existing = await prisma.profile.findFirst({
      where: { email: body.email, NOT: { id } },
      select: { id: true }
    });
    if (existing) throw new ConflictError('Ya existe una cuenta con ese correo');

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email: body.email
    });
    if (authError) throw new Error(authError.message);
    delete body.email;
  }

  // Eliminar columnas inmutables
  delete body.id;
  delete body.email;
  delete body.createdAt;

  const data = profileInputToPrisma(body);

  const profile = Object.keys(data).length > 0
    ? await prisma.profile.update({ where: { id }, data })
    : await prisma.profile.findUnique({ where: { id } });

  if (!profile) throw new NotFoundError('Perfil');

  res.json({ user: serializeProfile(profile, { includeEmail: true }) });
});

// PUT /api/profiles/:id/availability
export const toggleAvailability = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  if (id !== req.user.id) {
    throw new ForbiddenError('No puedes cambiar la disponibilidad de otro usuario');
  }

  const current = await prisma.profile.findUnique({
    where: { id },
    select: { available: true }
  });
  if (!current) throw new NotFoundError('Perfil');

  const newAvailable = !current.available;

  const profile = await prisma.profile.update({
    where: { id },
    data: { available: newAvailable }
  });

  res.json({
    user: serializeProfile(profile, { includeEmail: true }),
    available: newAvailable
  });
});

// PUT /api/profiles/:id/featured
export const saveFeaturedProjects = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { projectIds } = req.validated.body;

  if (id !== req.user.id) {
    throw new ForbiddenError('No puedes editar los proyectos destacados de otro usuario');
  }

  if (!Array.isArray(projectIds) || projectIds.length > 5) {
    throw new ValidationError({ projectIds: ['Máximo 5 proyectos destacados'] });
  }

  // Verificar que los proyectos existen
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true }
  });

  const validIds = projects.map(project => project.id);

  const profile = await prisma.profile.update({
    where: { id },
    data: { featuredProjectIds: validIds }
  });

  res.json({ user: serializeProfile(profile, { includeEmail: true }) });
});

// GET /api/profiles/:id/stats
export const getProfileStats = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const [createdCount, collabsCount, ratingAgg, ratingCount, completedCount] = await Promise.all([
    prisma.project.count({ where: { ownerId: id } }),
    prisma.application.count({ where: { userId: id, status: 'accepted' } }),
    prisma.rating.aggregate({ where: { ratedUserId: id }, _avg: { stars: true } }),
    prisma.rating.count({ where: { ratedUserId: id } }),
    prisma.project.count({
      where: {
        status: 'completed',
        OR: [
          { ownerId: id },
          { applications: { some: { userId: id, status: 'accepted' } } }
        ]
      }
    })
  ]);

  const avg = ratingAgg._avg.stars
    ? Number(Number(ratingAgg._avg.stars).toFixed(2))
    : 0;

  res.json({
    stats: {
      projectsCreated: createdCount,
      collaborations: collabsCount,
      avgRating: avg,
      ratingCount,
      completedProjects: completedCount
    }
  });
});

// GET /api/profiles/:id/history
export const getProfileHistory = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const [created, participated] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: id },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        createdAt: true,
        image: true
      }
    }),
    prisma.application.findMany({
      where: { userId: id, status: 'accepted' },
      select: {
        projectRole: true,
        project: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            createdAt: true,
            image: true,
            ownerId: true
          }
        }
      }
    })
  ]);

  const participatedProjects = participated
    .filter(item => item.project)
    .map(item => ({
      ...serializeProject(item.project),
      role: item.projectRole,
      participationType: 'participant'
    }));

  const createdProjects = created.map(project => ({
    ...serializeProject(project),
    participationType: 'creator'
  }));

  // Combinar y deduplicar
  const all = [...createdProjects, ...participatedProjects];
  const unique = all.filter(
    (project, index, self) => self.findIndex(item => item.id === project.id) === index
  );
  unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({ history: unique });
});

// GET /api/profiles/:id/ratings
export const getProfileRatings = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const ratings = await prisma.rating.findMany({
    where: { ratedUserId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      project: {
        select: { id: true, title: true, category: true, image: true, ownerId: true }
      },
      rater: {
        select: { id: true, name: true, username: true, avatar: true }
      }
    }
  });

  res.json({ ratings: ratings.map(rating => serializeRating(rating)) });
});
