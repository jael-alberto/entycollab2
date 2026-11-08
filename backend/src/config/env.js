// backend/src/config/env.js
// Configuración centralizada de variables de entorno con validación

import { config } from 'dotenv';
config();

const isProduction = process.env.NODE_ENV === 'production';
let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
let supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const jwtSecret = process.env.JWT_SECRET || 'devcollab-secret-key-change-in-production';
const databaseUrl = process.env.DATABASE_URL || '';
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL || '';

const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseSecretKey && 
  !supabaseUrl.includes('tu-proyecto') &&
  !supabaseSecretKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
);

if (!supabaseUrl) {
  if (isProduction) {
    throw new Error('Variable de entorno requerida faltante: SUPABASE_URL (o VITE_SUPABASE_URL)');
  }
  supabaseUrl = 'https://placeholder.supabase.co';
}
if (!supabaseSecretKey) {
  if (isProduction) {
    throw new Error('Variable de entorno requerida faltante: SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY)');
  }
  supabaseSecretKey = 'placeholder-secret-key';
}

if (!isSupabaseConfigured && !isProduction) {
  console.warn('\n⚠️  [BACKEND] ADVERTENCIA: Credenciales de Supabase no configuradas o usando valores por defecto en backend/.env.');
  console.warn('⚠️  El servidor backend iniciará en modo desarrollo, pero las consultas a la base de datos requerirán credenciales válidas.\n');
}

if (!databaseUrl) {
  if (isProduction) {
    throw new Error('Variable de entorno requerida faltante: DATABASE_URL');
  }
  console.warn('\n⚠️  [BACKEND] ADVERTENCIA: DATABASE_URL no está configurada. Prisma no podrá conectar a PostgreSQL.\n');
}

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  supabase: {
    url: supabaseUrl,
    serviceRoleKey: supabaseSecretKey,
    anonKey: supabaseAnonKey || '',
    jwksUrl: process.env.SUPABASE_JWKS_URL || `${supabaseUrl}/auth/v1/.well-known/jwks.json`
  },

  prisma: {
    databaseUrl,
    shadowDatabaseUrl
  },
  
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  
  isProduction: process.env.NODE_ENV === 'production'
};