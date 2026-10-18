// backend/src/middleware/auth.js
// Middleware de autenticación JWT

import { verifyAuthToken } from '../config/supabase.js';

// Middleware: requiere autenticación (inyecta req.user)
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No autorizado', 
        message: 'Token de acceso requerido' 
      });
    }
    
    const token = authHeader.substring(7);
    const user = await verifyAuthToken(token);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'No autorizado', 
        message: 'Token inválido o expirado' 
      });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Error interno', 
      message: 'Error verificando autenticación' 
    });
  }
}

// Middleware: autenticación opcional (inyecta req.user si hay token válido)
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await verifyAuthToken(token);
      if (user) {
        req.user = user;
        req.token = token;
      }
    }
    next();
  } catch {
    next(); // Ignorar errores en auth opcional
  }
}

// Middleware: verificar que el usuario es owner de un recurso
export function requireOwnership(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      const resourceOwnerId = await getResourceOwnerId(req);
      if (resourceOwnerId !== req.user.id) {
        return res.status(403).json({ 
          error: 'Prohibido', 
          message: 'No tienes permisos para esta acción' 
        });
      }
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ 
        error: 'Error interno', 
        message: 'Error verificando permisos' 
      });
    }
  };
}

// Middleware: verificar rol en grupo
export function requireGroupRole(groupIdParam, allowedRoles = ['owner', 'admin']) {
  return async (req, res, next) => {
    try {
      const groupId = req.params[groupIdParam] || req.body[groupIdParam];
      if (!groupId) {
        return res.status(400).json({ 
          error: 'Bad Request', 
          message: 'groupId requerido' 
        });
      }
      
      const { data: membership, error } = await supabaseAdmin
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', req.user.id)
        .single();
      
      if (error || !membership || !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ 
          error: 'Prohibido', 
          message: 'No tienes permisos en este grupo' 
        });
      }
      
      req.groupMembership = membership;
      next();
    } catch (error) {
      console.error('Group role check error:', error);
      return res.status(500).json({ 
        error: 'Error interno', 
        message: 'Error verificando rol en grupo' 
      });
    }
  };
}

// Importar supabaseAdmin aquí para evitar dependencias circulares
import { supabaseAdmin } from '../config/supabase.js';