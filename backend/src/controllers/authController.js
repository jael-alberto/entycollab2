// backend/src/controllers/authController.js
// Controlador de autenticación

import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, UnauthorizedError, ConflictError } from '../middleware/errorHandler.js';

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, username, email, password, bio, skills = [] } = req.validated.body;
  
  // Verificar si email/username ya existen en profiles
  const { data: existingEmail } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
  
  if (existingEmail) throw new ConflictError('Ya existe una cuenta con ese correo');
  
  const { data: existingUsername } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();
  
  if (existingUsername) throw new ConflictError('Ese nombre de usuario ya está en uso');
  
  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, username }
  });
  
  if (authError) throw new Error(authError.message);
  
  const userId = authData.user.id;
  
  // Crear perfil (el trigger handle_new_user ya crea uno básico, lo actualizamos)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      name,
      username,
      bio: bio || { es: '', en: '' },
      skills,
      categories: []
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (profileError) throw new Error(profileError.message);
  
  // Crear sesión para devolver token
  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email
  });
  
  // Alternative: sign in to get session
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });
  
  res.status(201).json({
    message: 'Cuenta creada exitosamente',
    user: profile,
    session: signInData.session
  });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.validated.body;
  
  // Buscar usuario por email o username
  const isEmail = identifier.includes('@');
  
  let { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq(isEmail ? 'email' : 'username', identifier)
    .single();
  
  if (error || !profile) {
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
  const { data: fullProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', profile.id)
    .single();
  
  res.json({
    message: 'Inicio de sesión exitoso',
    user: fullProfile,
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
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();
  
  if (error) throw new Error(error.message);
  
  res.json({ user: profile });
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