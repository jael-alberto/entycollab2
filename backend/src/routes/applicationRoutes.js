// backend/src/routes/applicationRoutes.js
// Rutas de postulaciones e invitaciones

import { Router } from 'express';
import {
  applyToProject, sendInvite, handleApplication, respondInvite,
  getUserApplications, getProjectApplications, getPendingInvites,
  checkUserApplication, getAcceptedApplications
} from '../controllers/applicationController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// POST /api/applications/apply - postularse a proyecto
router.post('/apply', requireAuth, validate(schemas.applyToProject), applyToProject);

// POST /api/applications/invite - invitar a proyecto
router.post('/invite', requireAuth, validate(schemas.sendInvite), sendInvite);

// PUT /api/applications/:id - gestionar postulación (owner)
router.put('/:id', requireAuth, validate(schemas.handleApplication), handleApplication);

// PUT /api/applications/:id/respond - responder invitación (invitado)
router.put('/:id/respond', requireAuth, validate(schemas.respondInvite), respondInvite);

// GET /api/applications/user - mis postulaciones
router.get('/user', requireAuth, getUserApplications);

// GET /api/applications/project/:projectId - postulaciones a un proyecto (owner)
router.get('/project/:projectId', requireAuth, getProjectApplications);

// GET /api/applications/invites/pending - invitaciones pendientes
router.get('/invites/pending', requireAuth, getPendingInvites);

// GET /api/applications/check/:projectId - verificar si usuario aplicó
router.get('/check/:projectId', requireAuth, checkUserApplication);

// GET /api/applications/project/:projectId/accepted - participantes aceptados
router.get('/project/:projectId/accepted', requireAuth, getAcceptedApplications);

export default router;