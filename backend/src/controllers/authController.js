// backend/src/controllers/authController.js
// Controlador de autenticación
// Supabase Auth gestiona credenciales/sesiones; Prisma gestiona public.profiles.

import { supabaseAdmin } from '../config/supabase.js';
import { prisma } from '../config/prisma.js';
import { serializeProfile } from '../utils/serializers.js';
import { asyncHandler, UnauthorizedError, ConflictError } from '../middleware/errorHandler.js';

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, username, email, password, bio, skills = [] } = req.validated.body;

  // Verificar si email/username ya existen en profiles
  const [existingEmail, existingUsername] = await Promise.all([
    prisma.profile.findUnique({ where: { email }, select: { id: true } }),
    prisma.profile.findUnique({ where: { username }, select: { id: true } })
  ]);

  if (existingEmail) throw new ConflictError('Ya existe una cuenta con ese correo');
  if (existingUsername) throw new ConflictError('Ese nombre de usuario ya está en uso');

  // Crear usuario en Supabase Auth (el trigger handle_new_user crea el perfil)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, username }
  });

  if (authError) throw new Error(authError.message);

  const userId = authData.user.id;

  // Completar/crear el perfil. Usamos upsert para tolerar instalaciones sin trigger.
  const profile = await prisma.profile.upsert({
    where: { id: userId },
    update: {
      name,
      username,
      email,
      bio: bio || { es: '', en: '' },
      skills,
      categories: []
    },
    create: {
      id: userId,
      name,
      username,
      email,
      bio: bio || { es: '', en: '' },
      skills,
      categories: []
    }
  });

  // Iniciar sesión para obtener token de sesión
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });

  if (signInError || !signInData?.session) {
    // Registration succeeded but auto-login failed — still return the profile
    return res.status(201).json({
      message: 'Cuenta creada exitosamente',
      user: serializeProfile(profile, { includeEmail: true }),
      session: null
    });
  }

  res.status(201).json({
    message: 'Cuenta creada exitosamente',
    user: serializeProfile(profile, { includeEmail: true }),
    session: signInData.session
  });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.validated.body;

  // Buscar usuario por email o username
  const isEmail = identifier.includes('@');

  const profile = await prisma.profile.findUnique({
    where: isEmail ? { email: identifier } : { username: identifier },
    select: { id: true, email: true }
  });

  if (!profile?.email) {
    throw new UnauthorizedError('Correo o contraseña incorrectos');
  }

  // Autenticar con Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
    email: profile.email,
    password
  });

  if (authError || !authData.session) {
    throw new UnauthorizedError('Correo o contraseña incorrectos');
  }

  // Obtener perfil completo
  const fullProfile = await prisma.profile.findUnique({
    where: { id: profile.id }
  });

  res.json({
    message: 'Inicio de sesión exitoso',
    user: serializeProfile(fullProfile, { includeEmail: true }),
    session: authData.session
  });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  // En backend stateless, el logout es solo cliente-side
  // Pero podemos revocar el token si usamos refresh tokens
  const { error } = await supabaseAdmin.auth.admin.signOut(req.user.id);

  if (error) throw new Error(error.message);

  res.json({ message: 'Sesión cerrada' });
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { id: req.user.id }
  });

  if (!profile) {
    throw new UnauthorizedError('Perfil no encontrado');
  }

  res.json({ user: serializeProfile(profile, { includeEmail: true }) });
});

// POST /api/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new UnauthorizedError('Refresh token requerido');
  }

  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token
  });

  if (error) throw new UnauthorizedError('Token de renovación inválido');

  res.json({ session: data.session });
});
