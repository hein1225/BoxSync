import { Router } from 'express';
import { getRedisClient, getIsMemoryMode } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

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

// 诊断接口 - 检查当前数据状态（仅管理员可访问）
router.get('/debug', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const redisClient = getRedisClient();

    // 获取所有 keys
    const allKeys = await redisClient.keys('boxsync:*');

    // 获取 admin 数据
    const adminData = await redisClient.hGetAll('boxsync:admin');

    // 获取 users 数据
    const usersData = await redisClient.hGetAll('boxsync:users');
    const users = Object.entries(usersData).map(([id, data]) => {
      try {
        return { id, ...JSON.parse(data) };
      } catch {
        return { id, raw: data };
      }
    });

    res.json({
      success: true,
      redis: {
        mode: getIsMemoryMode() ? 'memory' : 'redis',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
      keys: {
        total: allKeys.length,
        list: allKeys.slice(0, 20), // 只显示前20个
      },
      admin: adminData,
      users: {
        count: users.length,
        list: users,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
