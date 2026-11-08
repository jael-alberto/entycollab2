// backend/src/routes/bootstrapRoutes.js
// Ruta de carga inicial del frontend.

import { Router } from 'express';
import { getBootstrap } from '../controllers/bootstrapController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/bootstrap', optionalAuth, getBootstrap);

export default router;
