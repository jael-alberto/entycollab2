// backend/src/controllers/authController.js
// Controlador de autenticación
// Supabase Auth gestiona credenciales/sesiones; Prisma gestiona public.profiles.

import { supabaseAdmin } from '../config/supabase.js';
import { prisma } from '../config/prisma.js';
import { serializeProfile, profileInputToPrisma } from '../utils/serializers.js';
import { asyncHandler, UnauthorizedError, ConflictError } from '../middleware/errorHandler.js';

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const {
    name, username, email, password, bio, skills = [],
    categories = [], gameTypes = [], languages = [], favoriteGenres = [], disciplines = []
  } = req.validated.body;

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
      categories,
      gameTypes,
      languages,
      favoriteGenres,
      disciplines
    },
    create: {
      id: userId,
      name,
      username,
      email,
      bio: bio || { es: '', en: '' },
      skills,
      categories,
      gameTypes,
      languages,
      favoriteGenres,
      disciplines
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

  // Intentar autenticar con Supabase Auth
  let authData, authError;
  try {
    ({ data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email,
      password
    }));
  } catch (e) {
    authError = e;
  }

  // Verificar si Supabase está configurado con credenciales reales
  const isSupabaseConfigured = !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SECRET_KEY &&
    !process.env.SUPABASE_URL.includes('tu-proyecto') &&
    !process.env.SUPABASE_SECRET_KEY.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
  );

  // Con Supabase configurado, las credenciales deben ser válidas: no se emiten
  // tokens sintéticos. Un token falso rompería las rutas protegidas (401).
  if (isSupabaseConfigured && (authError || !authData?.session)) {
    throw new UnauthorizedError('Correo o contraseña incorrectos');
  }

  // Si Supabase no está configurado, modo demo directo
  if (!isSupabaseConfigured) {
    const fullProfile = await prisma.profile.findUnique({
      where: { id: profile.id }
    });

    // Generar tokens sintéticos para modo demo
    const demoAccessToken = 'demo-local-' + profile.id;
    const demoRefreshToken = 'demo-refresh-' + profile.id;

    res.json({
      message: 'Inicio de sesión exitoso (modo local)',
      user: serializeProfile(fullProfile, { includeEmail: true }),
      session: {
        access_token: demoAccessToken,
        refresh_token: demoRefreshToken
      }
    });
    return;
  }

  // Ruta normal de Supabase: perfil y sesión válidos
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

// PUT /api/auth/password
// Cambia la contraseña del usuario autenticado en Supabase Auth.
export const updatePassword = asyncHandler(async (req, res) => {
  const { password } = req.validated.body;

  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
    password
  });

  if (error) throw new Error(error.message);

  res.json({ message: 'Contraseña actualizada' });
});

// POST /api/auth/ensure-profile
// Crea o actualiza el perfil del usuario autenticado. Se usa, por ejemplo,
// después del login con OAuth para asegurar que exista la fila en profiles.
export const ensureProfile = asyncHandler(async (req, res) => {
  const id = req.user.id;
  const body = req.validated.body || {};
  const data = profileInputToPrisma(body);

  const existing = await prisma.profile.findUnique({ where: { id } });

  if (existing) {
    const profile = Object.keys(data).length > 0
      ? await prisma.profile.update({ where: { id }, data })
      : existing;

    return res.json({ user: serializeProfile(profile, { includeEmail: true }) });
  }

  const meta = req.user.user_metadata || {};
  const email = req.user.email || null;
  const fallbackName = meta.full_name || meta.name || (email ? email.split('@')[0] : 'Usuario');
  const fallbackUsername = (meta.user_name || meta.preferred_username || `user_${id.replace(/-/g, '').slice(0, 10)}`)
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 30) || `user_${id.replace(/-/g, '').slice(0, 10)}`;

  const baseData = {
    id,
    name: data.name || fallbackName,
    username: data.username || fallbackUsername,
    email,
    avatar: data.avatar ?? meta.avatar_url ?? meta.picture ?? null,
    bio: data.bio ?? { es: '', en: '' },
    skills: data.skills ?? [],
    categories: data.categories ?? [],
    gameTypes: data.gameTypes ?? [],
    languages: data.languages ?? [],
    favoriteGenres: data.favoriteGenres ?? [],
    disciplines: data.disciplines ?? []
  };

  let profile;
  try {
    profile = await prisma.profile.create({ data: baseData });
  } catch (error) {
    // Si el username ya existe, agregamos un sufijo único y reintentamos.
    if (error?.code === 'P2002') {
      const suffix = id.replace(/-/g, '').slice(0, 6);
      profile = await prisma.profile.create({
        data: { ...baseData, username: `${baseData.username.slice(0, 23)}_${suffix}` }
      });
    } else {
      throw error;
    }
  }

  res.json({ user: serializeProfile(profile, { includeEmail: true }) });
});
