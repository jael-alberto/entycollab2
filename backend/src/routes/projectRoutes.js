// backend/src/routes/projectRoutes.js
// Rutas de proyectos

import { Router } from 'express';
import {
  listProjects, getProject, createProject, updateProject,
  changeProjectStatus, deleteProject, getUserProjects,
  getFeaturedProjects, saveFeaturedProjects, canRateUser
} from '../controllers/projectController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// GET /api/projects - listar proyectos
router.get('/', optionalAuth, validate(schemas.listProjects), listProjects);

// Static /user/:userId routes MUST come before dynamic /:id to avoid conflicts
// GET /api/projects/user/:userId - proyectos de un usuario
router.get('/user/:userId', optionalAuth, getUserProjects);

// GET /api/projects/user/:userId/featured - proyectos destacados
router.get('/user/:userId/featured', optionalAuth, getFeaturedProjects);

// PUT /api/projects/user/:userId/featured - guardar destacados
router.put('/user/:userId/featured', requireAuth, saveFeaturedProjects);

// GET /api/projects/:id - obtener proyecto
router.get('/:id', optionalAuth, validate(schemas.updateProject), getProject);

// POST /api/projects - crear proyecto
router.post('/', requireAuth, validate(schemas.createProject), createProject);

// PUT /api/projects/:id - actualizar proyecto
router.put('/:id', requireAuth, validate(schemas.updateProject), updateProject);

// PUT /api/projects/:id/status - cambiar estado
router.put('/:id/status', requireAuth, validate(schemas.updateProject), changeProjectStatus);

// DELETE /api/projects/:id - eliminar proyecto
router.delete('/:id', requireAuth, validate(schemas.updateProject), deleteProject);

// GET /api/projects/:id/can-rate/:ratedId - verificar si puede calificar
router.get('/:id/can-rate/:ratedId', requireAuth, validate(schemas.updateProject), canRateUser);

export default router;