// backend/src/controllers/storageController.js
// Controlador de subida de archivos a Supabase Storage

import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

// POST /api/storage/avatar
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No se subió ningún archivo', 400, 'NO_FILE');
  
  const file = req.file;
  const userId = req.user.id;
  
  // Validar tipo
  if (!file.mimetype.startsWith('image/')) {
    throw new AppError('El archivo debe ser una imagen', 400, 'INVALID_FILE_TYPE');
  }
  
  // Validar tamaño (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new AppError('La imagen no puede superar 5MB', 400, 'FILE_TOO_LARGE');
  }
  
  const fileExt = file.originalname.split('.').pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const path = `${userId}/${fileName}`;
  
  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw new Error(error.message);
  
  // Obtener URL pública
  const { data: urlData } = supabaseAdmin.storage
    .from('avatars')
    .getPublicUrl(data.path);
  
  res.json({ 
    url: urlData.publicUrl,
    path: data.path
  });
});

// DELETE /api/storage/avatar
export const deleteAvatar = asyncHandler(async (req, res) => {
  const { path } = req.body;
  const userId = req.user.id;
  
  if (!path) throw new AppError('path requerido', 400, 'MISSING_PATH');
  
  // Verificar que el archivo pertenece al usuario
  if (!path.startsWith(`${userId}/`)) {
    throw new AppError('No tienes permisos para eliminar este archivo', 403, 'FORBIDDEN');
  }
  
  const { error } = await supabaseAdmin.storage
    .from('avatars')
    .remove([path]);
  
  if (error) throw new Error(error.message);
  
  res.json({ message: 'Avatar eliminado' });
});

// POST /api/storage/project-image
export const uploadProjectImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No se subió ningún archivo', 400, 'NO_FILE');
  
  const file = req.file;
  const { projectId } = req.body;
  
  if (!projectId) throw new AppError('projectId requerido', 400, 'MISSING_PROJECT_ID');
  
  // Verificar permisos en el proyecto
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('owner_id, group_id')
    .eq('id', projectId)
    .single();
  
  if (!project) throw new AppError('Proyecto no encontrado', 404, 'PROJECT_NOT_FOUND');
  
  const isOwner = project.owner_id === req.user.id;
  let isGroupAdmin = false;
  
  if (project.group_id) {
    const { data: membership } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', project.group_id)
      .eq('user_id', req.user.id)
      .single();
    
    isGroupAdmin = membership && ['owner', 'admin'].includes(membership.role);
  }
  
  if (!isOwner && !isGroupAdmin) {
    throw new AppError('No tienes permisos para subir imágenes a este proyecto', 403, 'FORBIDDEN');
  }
  
  // Validar tipo
  if (!file.mimetype.startsWith('image/')) {
    throw new AppError('El archivo debe ser una imagen', 400, 'INVALID_FILE_TYPE');
  }
  
  // Validar tamaño (10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new AppError('La imagen no puede superar 10MB', 400, 'FILE_TOO_LARGE');
  }
  
  const fileExt = file.originalname.split('.').pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const path = `${projectId}/${fileName}`;
  
  const { data, error } = await supabaseAdmin.storage
    .from('project-images')
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw new Error(error.message);
  
  // Obtener URL pública
  const { data: urlData } = supabaseAdmin.storage
    .from('project-images')
    .getPublicUrl(data.path);
  
  res.json({ 
    url: urlData.publicUrl,
    path: data.path
  });
});

// DELETE /api/storage/project-image
export const deleteProjectImage = asyncHandler(async (req, res) => {
  const { path } = req.body;
  
  if (!path) throw new AppError('path requerido', 400, 'MISSING_PATH');
  
  const { error } = await supabaseAdmin.storage
    .from('project-images')
    .remove([path]);
  
  if (error) throw new Error(error.message);
  
  res.json({ message: 'Imagen de proyecto eliminada' });
});