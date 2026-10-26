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
export const schemas = {
  // Auth
  register: z.object({
    body: z.object({
      name: z.string().min(1).max(100),
      username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
      email: z.string().email(),
      password: z.string().min(6).max(100),
      bio: z.string().max(500).optional(),
      skills: z.array(z.string()).max(50).optional()
    })
  }),
  
  login: z.object({
    body: z.object({
      identifier: z.string().min(1), // email o username
      password: z.string().min(1)
    })
  }),
  
  // Profile
  updateProfile: z.object({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
      email: z.string().email().optional(),
      bio: z.union([z.string(), z.object({ es: z.string(), en: z.string() })]).optional(),
      skills: z.array(z.string()).max(50).optional(),
      categories: z.array(z.string()).max(50).optional(),
      githubUrl: z.string().url().optional().nullable(),
      portfolioUrl: z.string().url().optional().nullable(),
      available: z.boolean().optional(),
      gameTypes: z.array(z.string()).max(50).optional(),
      languages: z.array(z.string()).max(50).optional(),
      favoriteGenres: z.array(z.string()).max(50).optional(),
      disciplines: z.array(z.string()).max(50).optional()
    }),
    params: z.object({
      id: z.string().uuid()
    })
  }),
  
  // Projects
  createProject: z.object({
    body: z.object({
      title: z.object({ es: z.string().min(1), en: z.string().min(1) }),
      category: z.string().min(1).max(60),
      slots: z.number().int().min(1).max(100),
      tech: z.array(z.string()).max(50).optional(),
      description: z.object({ es: z.string().min(1), en: z.string().min(1) }),
      minRating: z.number().min(0).max(5).optional(),
      deadline: z.string().date().optional().nullable(),
      repo: z.string().url().optional().nullable(),
      image: z.string().url().optional().nullable(),
      roles: z.array(z.string()).max(50).optional(),
      groupId: z.string().uuid().optional().nullable()
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
      repo: z.string().url().optional().nullable(),
      image: z.string().url().optional().nullable(),
      roles: z.array(z.string()).max(50).optional(),
      status: z.enum(['open', 'in-progress', 'completed', 'closed']).optional()
    }),
    params: z.object({
      id: z.string().uuid()
    })
  }),
  
  listProjects: z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(['open', 'in-progress', 'completed', 'closed']).optional(),
      category: z.string().optional(),
      groupId: z.string().uuid().optional(),
      ownerId: z.string().uuid().optional(),
      tech: z.string().optional(), // comma-separated
      search: z.string().optional(),
      sortBy: z.enum(['created_at', 'title', 'status']).default('created_at'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      globalOnly: z.coerce.boolean().default(false)
    })
  }),
  
  // Applications
  applyToProject: z.object({
    body: z.object({
      projectId: z.string().uuid()
    })
  }),
  
  sendInvite: z.object({
    body: z.object({
      projectId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      message: z.string().max(1000).optional()
    })
  }),
  
  handleApplication: z.object({
    body: z.object({
      status: z.enum(['accepted', 'rejected']),
      projectRole: z.string().max(100).optional()
    }),
    params: z.object({
      id: z.string().uuid()
    })
  }),
  
  respondInvite: z.object({
    body: z.object({
      action: z.enum(['accepted', 'rejected'])
    }),
    params: z.object({
      id: z.string().uuid()
    })
  }),
  
  // Ratings
  saveRatings: z.object({
    body: z.object({
      ratings: z.record(z.string().uuid(), z.number().int().min(1).max(5))
    }),
    params: z.object({
      projectId: z.string().uuid()
    })
  }),
  
  // Groups
  createGroup: z.object({
    body: z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(2000).optional(),
      isPrivate: z.boolean().default(true)
    })
  }),
  
  updateGroup: z.object({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(2000).optional(),
      isPrivate: z.boolean().optional()
    }),
    params: z.object({
      id: z.string().uuid()
    })
  }),
  
  requestToJoinGroup: z.object({
    params: z.object({
      id: z.string().uuid()
    })
  }),
  
  decideGroupRequest: z.object({
    body: z.object({
      accepted: z.boolean()
    }),
    params: z.object({
      id: z.string().uuid(),
      requestId: z.string().uuid()
    })
  }),
  
  setGroupMemberRole: z.object({
    body: z.object({
      role: z.enum(['admin', 'member'])
    }),
    params: z.object({
      id: z.string().uuid(),
      memberId: z.string().uuid()
    })
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
      repo: z.string().url().optional().nullable(),
      image: z.string().url().optional().nullable(),
      roles: z.array(z.string()).max(50).optional()
    }),
    params: z.object({
      id: z.string().uuid()
    })
  }),
  
  // Pagination
  pagination: z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20)
    })
  })
};