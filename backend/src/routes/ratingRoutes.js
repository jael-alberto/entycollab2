// backend/src/routes/ratingRoutes.js
// Rutas de calificaciones

import { Router } from 'express';
import { ratingController } from '../controllers/ratingController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// POST /api/ratings/project/:projectId - guardar calificaciones
router.post('/project/:projectId', requireAuth, validate(schemas.saveRatings), ratingController.saveRatings);

// GET /api/ratings/project/:projectId - calificaciones de un proyecto
router.get('/project/:projectId', optionalAuth, ratingController.getProjectRatings);

// GET /api/ratings/user/:userId/received - calificaciones recibidas
router.get('/user/:userId/received', optionalAuth, ratingController.getUserReceivedRatings);

// GET /api/ratings/user/:userId/given - calificaciones dadas
router.get('/user/:userId/given', optionalAuth, ratingController.getUserGivenRatings);

// GET /api/ratings/user/:userId/average - promedio
router.get('/user/:userId/average', optionalAuth, ratingController.getUserAvgRating);

// GET /api/ratings/user/:userId/count - conteo
router.get('/user/:userId/count', optionalAuth, ratingController.getUserRatingCount);

// GET /api/ratings/user/:userId/distribution - distribución
router.get('/user/:userId/distribution', optionalAuth, ratingController.getUserRatingDistribution);

// GET /api/ratings/project/:projectId/user/:userId - calificación específica
router.get('/project/:projectId/user/:userId', optionalAuth, ratingController.getUserProjectRating);

// GET /api/ratings/project/:projectId/can-rate/:ratedId - verificar si puede calificar
router.get('/project/:projectId/can-rate/:ratedId', requireAuth, ratingController.checkCanRate);

export default router;