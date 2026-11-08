// backend/src/routes/profileRoutes.js
// Rutas de perfiles

import { Router } from 'express';
import {
  listProfiles, searchProfiles, getAvailablePeople,
  getProfile, getProfileByUsername, updateProfile,
  toggleAvailability, saveFeaturedProjects,
  getProfileStats, getProfileHistory, getProfileRatings
} from '../controllers/profileController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// GET /api/profiles - listar perfiles (público)
router.get('/', optionalAuth, validate(schemas.listProfiles), listProfiles);

// GET /api/profiles/search - buscar perfiles
// IMPORTANT: static routes must be declared before /:id
router.get('/search', optionalAuth, validate(schemas.searchProfiles), searchProfiles);

// GET /api/profiles/available - personas disponibles (buscador People)
router.get('/available', optionalAuth, validate(schemas.availablePeople), getAvailablePeople);

// GET /api/profiles/by-username/:username - obtener perfil por username
// IMPORTANT: must be before /:id to avoid being captured as a UUID param
router.get('/by-username/:username', optionalAuth, validate(schemas.usernameParams), getProfileByUsername);

// GET /api/profiles/:id - obtener perfil
router.get('/:id', optionalAuth, validate(schemas.idParams), getProfile);

// PUT /api/profiles/:id - actualizar perfil
router.put('/:id', requireAuth, validate(schemas.updateProfile), updateProfile);

// PUT /api/profiles/:id/availability - toggle disponibilidad
router.put('/:id/availability', requireAuth, validate(schemas.toggleAvailability), toggleAvailability);

// PUT /api/profiles/:id/featured - guardar proyectos destacados
router.put('/:id/featured', requireAuth, validate(schemas.saveProfileFeatured), saveFeaturedProjects);

// GET /api/profiles/:id/stats - estadísticas del perfil
router.get('/:id/stats', optionalAuth, validate(schemas.idParams), getProfileStats);

// GET /api/profiles/:id/history - historial de proyectos
router.get('/:id/history', optionalAuth, validate(schemas.idParams), getProfileHistory);

// GET /api/profiles/:id/ratings - calificaciones recibidas
router.get('/:id/ratings', optionalAuth, validate(schemas.idParams), getProfileRatings);

export default router;