// backend/src/routes/profileRoutes.js
// Rutas de perfiles

import { Router } from 'express';
import { profileController } from '../controllers/profileController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// GET /api/profiles - listar perfiles (público)
router.get('/', optionalAuth, profileController.listProfiles);

// GET /api/profiles/search - buscar perfiles
router.get('/search', optionalAuth, profileController.searchProfiles);

// GET /api/profiles/available - personas disponibles (buscador People)
router.get('/available', optionalAuth, profileController.getAvailablePeople);

// GET /api/profiles/:id - obtener perfil
router.get('/:id', optionalAuth, validate(schemas.updateProfile), profileController.getProfile);

// GET /api/profiles/by-username/:username - obtener perfil por username
router.get('/by-username/:username', optionalAuth, profileController.getProfileByUsername);

// PUT /api/profiles/:id - actualizar perfil
router.put('/:id', requireAuth, validate(schemas.updateProfile), profileController.updateProfile);

// PUT /api/profiles/:id/availability - toggle disponibilidad
router.put('/:id/availability', requireAuth, validate(schemas.updateProfile), profileController.toggleAvailability);

// PUT /api/profiles/:id/featured - guardar proyectos destacados
router.put('/:id/featured', requireAuth, validate(schemas.updateProfile), profileController.saveFeaturedProjects);

// GET /api/profiles/:id/stats - estadísticas del perfil
router.get('/:id/stats', optionalAuth, validate(schemas.updateProfile), profileController.getProfileStats);

// GET /api/profiles/:id/history - historial de proyectos
router.get('/:id/history', optionalAuth, validate(schemas.updateProfile), profileController.getProfileHistory);

// GET /api/profiles/:id/ratings - calificaciones recibidas
router.get('/:id/ratings', optionalAuth, validate(schemas.updateProfile), profileController.getProfileRatings);

export default router;