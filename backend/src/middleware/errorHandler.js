// backend/src/middleware/errorHandler.js
// Middleware de manejo de errores centralizado

import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(details) {
    super('Validación fallida', 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Prohibido') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto') {
    super(message, 409, 'CONFLICT');
  }
}

// Mapear mensajes de triggers de PostgreSQL (RAISE EXCEPTION)
function mapTriggerMessage(message = '') {
  if (/No hay cupos disponibles/i.test(message)) {
    return new AppError('No hay cupos disponibles', 400, 'SLOTS_FULL');
  }
  if (/No puedes calificarte a ti mismo/i.test(message)) {
    return new AppError('No puedes calificarte a ti mismo', 400, 'SELF_RATING');
  }
  if (/Solo el owner puede calificar/i.test(message)) {
    return new ForbiddenError('Solo el owner puede calificar participantes aceptados de proyectos completados');
  }
  if (/La solicitud ya fue resuelta/i.test(message)) {
    return new AppError('La solicitud ya fue resuelta', 409, 'ALREADY_RESPONDED');
  }
  if (/No hay participantes aceptados/i.test(message)) {
    return new AppError(
      'No hay participantes aceptados para completar el proyecto',
      400,
      'NO_PARTICIPANTS'
    );
  }
  return null;
}

// Mapear errores de Prisma a AppError
export function mapPrismaError(error) {
  const triggerError = mapTriggerMessage(error?.message);
  if (triggerError) return triggerError;

  if (error instanceof Prisma.PrismaClientKnownRequestError || error?.name === 'PrismaClientKnownRequestError') {
    switch (error.code) {
      case 'P2002': {
        const target = error.meta?.target;
        const text = Array.isArray(target) ? target.join(',') : String(target || '');

        if (/username/i.test(text)) {
          return new ConflictError('Ese nombre de usuario ya está en uso');
        }
        if (/email/i.test(text)) {
          return new ConflictError('Ya existe una cuenta con ese correo');
        }
        if (/rated_by|rated_user_id/i.test(text)) {
          return new ConflictError('Ya existe una calificación para este usuario en este proyecto');
        }
        if (/project_id/i.test(text) && /user_id/i.test(text)) {
          return new ConflictError('Ya te has postulado o has sido invitado a este proyecto');
        }
        if (/group_requests|grouprequest|pending/i.test(text)) {
          return new ConflictError('Ya tienes una solicitud pendiente');
        }
        if (/group_members|groupmember/i.test(text)) {
          return new ConflictError('El usuario ya es miembro de este grupo');
        }
        return new ConflictError('Ya existe un registro con esos datos');
      }

      case 'P2003':
        return new AppError(
          'Referencia inválida: el recurso relacionado no existe',
          400,
          'FOREIGN_KEY_VIOLATION'
        );

      case 'P2000':
        return new ValidationError({ value: ['El valor es demasiado largo para la columna'] });

      case 'P2011':
        return new ValidationError({ value: ['Falta un campo requerido'] });

      case 'P2014':
        return new AppError(
          'La operación viola una relación requerida',
          400,
          'RELATION_VIOLATION'
        );

      case 'P2023':
        return new ValidationError({ value: ['Datos con formato inválido'] });

      case 'P2025':
        return new NotFoundError();

      default:
        return null;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError || error?.name === 'PrismaClientValidationError') {
    return new ValidationError({ body: ['Datos inválidos para la operación'] });
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error?.name === 'PrismaClientInitializationError'
  ) {
    return new AppError(
      'No se pudo conectar a la base de datos',
      503,
      'DATABASE_UNAVAILABLE'
    );
  }

  return null;
}

// Mapear errores de Supabase/Postgres a AppError
export function mapSupabaseError(error) {
  // Unique violation (23505)
  if (error.code === '23505') {
    if (error.message.includes('username')) {
      return new ConflictError('Ese nombre de usuario ya está en uso');
    }
    if (error.message.includes('email')) {
      return new ConflictError('Ya existe una cuenta con ese correo');
    }
    if (error.message.includes('project_id') && error.message.includes('user_id')) {
      return new ConflictError('Ya te has postulado o has sido invitado a este proyecto');
    }
    if (error.message.includes('group_members')) {
      return new ConflictError('El usuario ya es miembro de este grupo');
    }
    return new ConflictError('Ya existe un registro con esos datos');
  }
  
  // Foreign key violation (23503)
  if (error.code === '23503') {
    return new AppError('Referencia inválida: el recurso relacionado no existe', 400, 'FOREIGN_KEY_VIOLATION');
  }
  
  // Check violation (23514)
  if (error.code === '23514') {
    return new AppError('Datos inválidos: no cumplen las restricciones', 400, 'CHECK_VIOLATION');
  }
  
  // Trigger RAISE EXCEPTION (P0001)
  if (error.code === 'P0001') {
    const message = error.message;
    if (message.includes('cupos')) return new ConflictError('No hay cupos disponibles');
    if (message.includes('calificarte')) return new ForbiddenError('No puedes calificarte a ti mismo');
    if (message.includes('Solo el owner')) return new ForbiddenError(message);
    if (message.includes('participantes aceptados')) return new ForbiddenError(message);
    if (message.includes('proyectos completados')) return new ForbiddenError(message);
    return new AppError(message, 400, 'BUSINESS_RULE_VIOLATION');
  }
  
  // Not found (PGRST116)
  if (error.code === 'PGRST116') {
    return new NotFoundError();
  }
  
  // JWT/Auth errors
  if (error.message?.includes('JWT') || error.message?.includes('token')) {
    return new UnauthorizedError('Token inválido o expirado');
  }
  
  return null;
}

// Middleware principal de manejo de errores
export function errorHandler(err, req, res, _next) {
  console.error('[Error]', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });
  
  // Si es un error operativo conocido, usar su statusCode y mensaje
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details
    });
  }
  
  // Intentar mapear errores de Prisma
  const mappedPrisma = mapPrismaError(err);
  if (mappedPrisma) {
    return res.status(mappedPrisma.statusCode).json({
      error: mappedPrisma.code,
      message: mappedPrisma.message,
      details: mappedPrisma.details
    });
  }

  // Intentar mapear errores de Supabase
  const mapped = mapSupabaseError(err);
  if (mapped) {
    return res.status(mapped.statusCode).json({
      error: mapped.code,
      message: mapped.message,
      details: mapped.details
    });
  }
  
  // Error interno no controlado
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
  
  // En desarrollo, mostrar detalles
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: err.message,
    stack: err.stack
  });
}

// Wrapper para async handlers (evita try/catch repetitivo)
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}