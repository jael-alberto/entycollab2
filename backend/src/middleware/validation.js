// backend/src/middleware/validation.js
// Middleware de validación con Zod

import { z } from 'zod';

export function validate(schema) {
  return (req, res, next) => {
    try {
      // Validar body, query y params
      const data = {
        body: req.body,
        query: req.query,
        params: req.params
      };
      
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const errors = result.error.flatten();
        return res.status(400).json({
          error: 'Validación fallida',
          details: errors.fieldErrors
        });
      }
      
      req.validated = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return res.status(500).json({ 
        error: 'Error interno', 
        message: 'Error en validación' 
      });
    }
  };
}

// Esquemas comunes
const uuid = z.string().uuid();
const idParams = z.object({ params: z.object({ id: uuid }) });
const userIdParams = z.object({ params: z.object({ userId: uuid }) });
const projectIdParams = z.object({ params: z.object({ projectId: uuid }) });
const usernameParams = z.object({ params: z.object({ username: z.string().min(3).max(30) }) });
const optionalUrl = z.union([z.string().url(), z.literal('')]).optional().nullable();
const queryBoolean = z.enum(['true', 'false']).transform(v => v === 'true');

export const schemas = {
  // Auth
  register: z.object({
    body: z.object({
      name: z.string().trim().min(1).max(100),
      username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).transform(v => v.toLowerCase()),
      email: z.string().trim().email().transform(v => v.toLowerCase()),
      password: z.string().min(6).max(100),
      bio: z.string().max(500).optional(),
      skills: z.array(z.string()).max(50).optional()
    })
  }),

  login: z.object({
    body: z.object({
      identifier: z.string().trim().min(1).transform(v => v.toLowerCase()), // email o username
      password: z.string().min(1)
    })
  }),

  refresh: z.object({
    body: z.object({
      refresh_token: z.string().min(1)
    })
  }),

  // Perfil
  updateProfile: z.object({
    body: z.object({
      name: z.string().trim().min(1).max(100).optional(),
      username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).transform(v => v.toLowerCase()).optional(),
      email: z.string().trim().email().transform(v => v.toLowerCase()).optional(),
      bio: z.union([z.string(), z.object({ es: z.string(), en: z.string() })]).optional(),
      skills: z.array(z.string()).max(50).optional(),
      categories: z.array(z.string()).max(50).optional(),
      githubUrl: optionalUrl,
      portfolioUrl: optionalUrl,
      available: z.boolean().optional(),
      gameTypes: z.array(z.string()).max(50).optional(),
      languages: z.array(z.string()).max(50).optional(),
      favoriteGenres: z.array(z.string()).max(50).optional(),
      disciplines: z.array(z.string()).max(50).optional(),
      featuredProjectIds: z.array(uuid).max(5).optional()
    }),
    params: z.object({ id: uuid })
  }),

  toggleAvailability: idParams,
  saveProfileFeatured: z.object({
    body: z.object({ projectIds: z.array(uuid).max(5) }),
    params: z.object({ id: uuid })
  }),

  listProfiles: z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      available: queryBoolean.optional()
    })
  }),

  searchProfiles: z.object({
    query: z.object({
      q: z.string().trim().min(1).max(100),
      limit: z.coerce.number().int().min(1).max(50).default(20)
    })
  }),

  availablePeople: z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().max(100).optional(),
      gameTypes: z.string().optional(),
      languages: z.string().optional(),
      favoriteGenres: z.string().optional(),
      disciplines: z.string().optional(),
      completed: z.string().optional(),
      rating: z.string().optional(),
      sortBy: z.enum(['recent', 'rating', 'projects']).default('recent')
    })
  }),

  idParams,
  userIdParams,
  projectIdParams,
  usernameParams,

  // Proyectos
  createProject: z.object({
    body: z.object({
      title: z.object({ es: z.string().min(1), en: z.string().min(1) }),
      category: z.string().min(1).max(60),
      slots: z.number().int().min(1).max(100),
      tech: z.array(z.string()).max(50).optional(),
      description: z.object({ es: z.string().min(1), en: z.string().min(1) }),
      minRating: z.number().min(0).max(5).optional(),
      deadline: z.string().date().optional().nullable(),
      repo: optionalUrl,
      image: optionalUrl,
      roles: z.array(z.string()).max(50).optional(),
      groupId: uuid.optional().nullable()
    })
  }),

  updateProject: z.object({
    body: z.object({
      title: z.object({ es: z.string().min(1), en: z.string().min(1) }).optional(),
      category: z.string().max(60).optional(),
      slots: z.number().int().min(1).max(100).optional(),
      tech: z.array(z.string()).max(50).optional(),
      description: z.object({ es: z.string().min(1), en: z.string().min(1) }).optional(),
      minRating: z.number().min(0).max(5).optional(),
      deadline: z.string().date().optional().nullable(),
      repo: optionalUrl,
      image: optionalUrl,
      roles: z.array(z.string()).max(50).optional(),
      groupId: uuid.optional().nullable()
    }),
    params: z.object({ id: uuid })
  }),

  changeProjectStatus: z.object({
    body: z.object({ status: z.enum(['open', 'in-progress', 'completed', 'closed']) }),
    params: z.object({ id: uuid })
  }),

  listProjects: z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(['open', 'in-progress', 'completed', 'closed']).optional(),
      category: z.string().optional(),
      groupId: uuid.optional(),
      ownerId: uuid.optional(),
      tech: z.string().optional(), // comma-separated
      search: z.string().max(100).optional(),
      sortBy: z.enum(['created_at', 'title', 'status', 'category']).default('created_at'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      globalOnly: queryBoolean.default(false)
    })
  }),

  saveProjectFeatured: z.object({
    body: z.object({ projectIds: z.array(uuid).max(5) }),
    params: z.object({ userId: uuid })
  }),

  canRateProjectUser: z.object({
    params: z.object({ id: uuid, ratedId: uuid })
  }),

  // Postulaciones
  applyToProject: z.object({
    body: z.object({
      projectId: uuid,
      message: z.string().max(1000).optional()
    })
  }),

  sendInvite: z.object({
    body: z.object({
      projectId: uuid,
      targetUserId: uuid,
      message: z.string().max(1000).optional()
    })
  }),

  handleApplication: z.object({
    body: z.object({
      status: z.enum(['accepted', 'rejected']),
      projectRole: z.string().max(100).optional()
    }),
    params: z.object({ id: uuid })
  }),

  respondInvite: z.object({
    body: z.object({ action: z.enum(['accepted', 'rejected']) }),
    params: z.object({ id: uuid })
  }),

  // Calificaciones
  saveRatings: z.object({
    body: z.object({
      ratings: z.record(z.string().uuid(), z.number().int().min(1).max(5))
    }),
    params: z.object({ projectId: uuid })
  }),

  ratingProjectUserParams: z.object({
    params: z.object({ projectId: uuid, userId: uuid })
  }),
  ratingUserParams: z.object({ params: z.object({ userId: uuid }) }),
  ratingCanRateParams: z.object({
    params: z.object({ projectId: uuid, ratedId: uuid })
  }),

  // Grupos
  createGroup: z.object({
    body: z.object({
      name: z.string().trim().min(1).max(100),
      description: z.string().max(2000).optional(),
      isPrivate: z.boolean().default(true)
    })
  }),

  updateGroup: z.object({
    body: z.object({
      name: z.string().trim().min(1).max(100).optional(),
      description: z.string().max(2000).optional(),
      isPrivate: z.boolean().optional()
    }),
    params: z.object({ id: uuid })
  }),

  listGroups: z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().max(100).optional()
    })
  }),

  requestToJoinGroup: z.object({ params: z.object({ id: uuid }) }),

  decideGroupRequest: z.object({
    body: z.object({ accepted: z.boolean() }),
    params: z.object({ id: uuid, requestId: uuid })
  }),

  setGroupMemberRole: z.object({
    body: z.object({ role: z.enum(['admin', 'member']) }),
    params: z.object({ id: uuid, memberId: uuid })
  }),

  groupMemberParams: z.object({
    params: z.object({ id: uuid, memberId: uuid })
  }),

  listGroupProjects: z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(['open', 'in-progress', 'completed', 'closed']).optional()
    }),
    params: z.object({ id: uuid })
  }),

  createGroupProject: z.object({
    body: z.object({
      title: z.object({ es: z.string().min(1), en: z.string().min(1) }),
      category: z.string().min(1).max(60),
      slots: z.number().int().min(1).max(100),
      tech: z.array(z.string()).max(50).optional(),
      description: z.object({ es: z.string().min(1), en: z.string().min(1) }),
      minRating: z.number().min(0).max(5).optional(),
      deadline: z.string().date().optional().nullable(),
      repo: optionalUrl,
      image: optionalUrl,
      roles: z.array(z.string()).max(50).optional()
    }),
    params: z.object({ id: uuid })
  }),

  // Paginación
  pagination: z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20)
    })
  })
};