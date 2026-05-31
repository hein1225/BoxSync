import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes, { initAdmin } from './routes/auth.js';
import userRoutes from './routes/users.js';
import syncRoutes from './routes/sync.js';
import logRoutes from './routes/logs.js';
import settingsRoutes from './routes/settings.js';
import healthRoutes from './routes/health.js';
import { errorHandler } from './middleware/error.js';
import { initRedis, getRedisClient, getIsMemoryMode } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SERVER_PORT || 9390;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Redis and start server
async function startServer() {
  try {
    await initRedis();
    const redisClient = getRedisClient();

    // Initialize admin after Redis connection
    await initAdmin();

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/sync', syncRoutes);
    app.use('/api/logs', logRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/health', healthRoutes);

    // Serve static files (frontend build)
    const distPath = path.join(__dirname, '..');
    app.use(express.static(distPath));

    // SPA fallback
    app.get(/.*/, (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // Error handler
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`BoxSync server running on port ${PORT}`);
      if (getIsMemoryMode()) {
        console.log('[WARNING] Running in MEMORY mode - data will be lost on restart');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  const client = getRedisClient();
  await client.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  const client = getRedisClient();
  await client.quit();
  process.exit(0);
});

export { getRedisClient };
