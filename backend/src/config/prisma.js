// backend/src/config/prisma.js
// Cliente Prisma singleton (conexión directa a PostgreSQL de Supabase)

import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['warn', 'error']
  });

if (!env.isProduction) {
  globalForPrisma.__prisma = prisma;
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
