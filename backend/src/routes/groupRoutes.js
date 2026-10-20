// backend/src/routes/groupRoutes.js
// Rutas de grupos/equipos

import { Router } from 'express';
import { groupController } from '../controllers/groupController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// GET /api/groups - listar grupos
router.get('/', requireAuth, groupController.listGroups);

// GET /api/groups/user - mis grupos
router.get('/user', requireAuth, groupController.getUserGroups);

// GET /api/groups/:id - obtener grupo
router.get('/:id', requireAuth, validate(schemas.updateGroup), groupController.getGroup);

// POST /api/groups - crear grupo
router.post('/', requireAuth, validate(schemas.createGroup), groupController.createGroup);

// PUT /api/groups/:id - actualizar grupo
router.put('/:id', requireAuth, validate(schemas.updateGroup), groupController.updateGroup);

// DELETE /api/groups/:id - eliminar grupo
router.delete('/:id', requireAuth, validate(schemas.updateGroup), groupController.deleteGroup);

// GET /api/groups/:id/members - miembros
router.get('/:id/members', requireAuth, validate(schemas.updateGroup), groupController.getGroupMembers);

// PUT /api/groups/:id/members/:memberId - cambiar rol
router.put('/:id/members/:memberId', requireAuth, validate(schemas.setGroupMemberRole), groupController.setGroupMemberRole);

// DELETE /api/groups/:id/members/:memberId - eliminar miembro
router.delete('/:id/members/:memberId', requireAuth, validate(schemas.setGroupMemberRole), groupController.removeGroupMember);

// POST /api/groups/:id/join - solicitar ingreso
router.post('/:id/join', requireAuth, validate(schemas.requestToJoinGroup), groupController.requestToJoinGroup);

// PUT /api/groups/:id/requests/:requestId - decidir solicitud
router.put('/:id/requests/:requestId', requireAuth, validate(schemas.decideGroupRequest), groupController.decideGroupRequest);

// GET /api/groups/:id/requests - solicitudes pendientes
router.get('/:id/requests', requireAuth, validate(schemas.updateGroup), groupController.getGroupRequests);

// GET /api/groups/:id/projects - proyectos del grupo
router.get('/:id/projects', requireAuth, validate(schemas.pagination), groupController.listGroupProjects);

// POST /api/groups/:id/projects - crear proyecto en grupo
router.post('/:id/projects', requireAuth, validate(schemas.createGroupProject), groupController.createGroupProject);

export default router;