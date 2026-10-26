// backend/src/routes/authRoutes.js
// Rutas de autenticación

import { Router } from 'express';
import { register, login, logout, me, refresh } from '../controllers/authController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validate(schemas.register), register);

// POST /api/auth/login
router.post('/login', validate(schemas.login), login);

// POST /api/auth/logout
router.post('/logout', requireAuth, logout);

// GET /api/auth/me
router.get('/me', requireAuth, me);

// POST /api/auth/refresh
router.post('/refresh', refresh);

export default router;