// backend/src/index.js
// Punto de entrada principal del backend

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import storageRoutes from './routes/storageRoutes.js';

const app = express();

// ==========================================================================
// MIDDLEWARES GLOBALES
// ==========================================================================

// Seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  message: { error: 'Demasiadas peticiones', message: 'Intenta de nuevo más tarde' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ==========================================================================
// RUTAS DE LA API
// ==========================================================================

const API_PREFIX = '/api';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/profiles`, profileRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/applications`, applicationRoutes);
app.use(`${API_PREFIX}/ratings`, ratingRoutes);
app.use(`${API_PREFIX}/groups`, groupRoutes);
app.use(`${API_PREFIX}/storage`, storageRoutes);

// ==========================================================================
// MANEJO DE ERRORES
// ==========================================================================

// 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'NOT_FOUND', 
    message: `Ruta ${req.method} ${req.path} no encontrada` 
  });
});

// Error handler global
app.use(errorHandler);

// ==========================================================================
// INICIAR SERVIDOR
// ==========================================================================

const server = app.listen(env.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ENTYCOLLAB BACKEND                                          ║
║  ─────────────────────────────────────────────────────────  ║
║  Server running on http://localhost:${env.port}                    ║
║  Environment: ${env.nodeEnv}                                     ║
║  API Prefix: ${API_PREFIX}                                          ║
║  Frontend URL: ${env.frontendUrl}                               ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Manejo graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;