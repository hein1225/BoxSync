import { Router } from 'express';
import { getRedisClient, getIsMemoryMode } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const redisClient = getRedisClient();
    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    res.json({
      success: true,
      status: 'healthy',
      redis: {
        connected: true,
        latency: `${latency}ms`,
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        mode: getIsMemoryMode() ? 'memory' : 'redis',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      redis: {
        connected: false,
        error: 'Redis connection failed',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
