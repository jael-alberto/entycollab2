// backend/src/routes/authRoutes.js
// Rutas de autenticación

import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validate(schemas.register), authController.register);

// POST /api/auth/login
router.post('/login', validate(schemas.login), authController.login);

// POST /api/auth/logout
router.post('/logout', requireAuth, authController.logout);

// GET /api/auth/me
router.get('/me', requireAuth, authController.me);

// POST /api/auth/refresh
router.post('/refresh', authController.refresh);

export default router;