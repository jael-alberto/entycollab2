// backend/src/routes/storageRoutes.js
// Rutas de subida de archivos

import { Router } from 'express';
import multer from 'multer';
import { storageController } from '../controllers/storageController.js';
import { requireAuth } from '../middleware/auth.js';

// Configurar multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

const router = Router();

// POST /api/storage/avatar - subir avatar
router.post('/avatar', requireAuth, upload.single('avatar'), storageController.uploadAvatar);

// DELETE /api/storage/avatar - eliminar avatar
router.delete('/avatar', requireAuth, storageController.deleteAvatar);

// POST /api/storage/project-image - subir imagen de proyecto
router.post('/project-image', requireAuth, upload.single('image'), storageController.uploadProjectImage);

// DELETE /api/storage/project-image - eliminar imagen de proyecto
router.delete('/project-image', requireAuth, storageController.deleteProjectImage);

export default router;