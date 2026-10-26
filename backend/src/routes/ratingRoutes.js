// backend/src/routes/ratingRoutes.js
// Rutas de calificaciones

import { Router } from 'express';
import {
  saveRatings, getProjectRatings, getUserReceivedRatings, getUserGivenRatings,
  getUserAvgRating, getUserRatingCount, getUserRatingDistribution,
  getUserProjectRating, checkCanRate
} from '../controllers/ratingController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// POST /api/ratings/project/:projectId - guardar calificaciones
router.post('/project/:projectId', requireAuth, validate(schemas.saveRatings), saveRatings);

// GET /api/ratings/project/:projectId - calificaciones de un proyecto
router.get('/project/:projectId', optionalAuth, getProjectRatings);

// GET /api/ratings/user/:userId/received - calificaciones recibidas
router.get('/user/:userId/received', optionalAuth, getUserReceivedRatings);

// GET /api/ratings/user/:userId/given - calificaciones dadas
router.get('/user/:userId/given', optionalAuth, getUserGivenRatings);

// GET /api/ratings/user/:userId/average - promedio
router.get('/user/:userId/average', optionalAuth, getUserAvgRating);

// GET /api/ratings/user/:userId/count - conteo
router.get('/user/:userId/count', optionalAuth, getUserRatingCount);

// GET /api/ratings/user/:userId/distribution - distribución
router.get('/user/:userId/distribution', optionalAuth, getUserRatingDistribution);

// GET /api/ratings/project/:projectId/user/:userId - calificación específica
router.get('/project/:projectId/user/:userId', optionalAuth, getUserProjectRating);

// GET /api/ratings/project/:projectId/can-rate/:ratedId - verificar si puede calificar
router.get('/project/:projectId/can-rate/:ratedId', requireAuth, checkCanRate);

export default router;