// backend/src/routes/projectRoutes.js
// Rutas de proyectos

import { Router } from 'express';
import { projectController } from '../controllers/projectController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// GET /api/projects - listar proyectos
router.get('/', optionalAuth, validate(schemas.listProjects), projectController.listProjects);

// GET /api/projects/:id - obtener proyecto
router.get('/:id', optionalAuth, validate(schemas.updateProject), projectController.getProject);

// POST /api/projects - crear proyecto
router.post('/', requireAuth, validate(schemas.createProject), projectController.createProject);

// PUT /api/projects/:id - actualizar proyecto
router.put('/:id', requireAuth, validate(schemas.updateProject), projectController.updateProject);

// PUT /api/projects/:id/status - cambiar estado
router.put('/:id/status', requireAuth, validate(schemas.updateProject), projectController.changeProjectStatus);

// DELETE /api/projects/:id - eliminar proyecto
router.delete('/:id', requireAuth, validate(schemas.updateProject), projectController.deleteProject);

// GET /api/projects/user/:userId - proyectos de un usuario
router.get('/user/:userId', optionalAuth, projectController.getUserProjects);

// GET /api/projects/user/:userId/featured - proyectos destacados
router.get('/user/:userId/featured', optionalAuth, projectController.getFeaturedProjects);

// PUT /api/projects/user/:userId/featured - guardar destacados
router.put('/user/:userId/featured', requireAuth, projectController.saveFeaturedProjects);

// GET /api/projects/:id/can-rate/:ratedId - verificar si puede calificar
router.get('/:id/can-rate/:ratedId', requireAuth, validate(schemas.updateProject), projectController.canRateUser);

export default router;