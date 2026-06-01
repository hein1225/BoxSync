import { Router } from 'express';
import { getRedisClient } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();
const LOGS_KEY = 'boxsync:logs';
const LOG_MAX_COUNT = 50000;

// Get logs (admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const { type, limit = '100', offset = '0' } = req.query as {
      type?: string;
      limit?: string;
      offset?: string;
    };

    const logsData = await redisClient.lRange(LOGS_KEY, 0, -1);
    let logs = logsData.map((l) => JSON.parse(l));

    if (type) {
      logs = logs.filter((l) => l.type === type);
    }

    const total = logs.length;
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    logs = logs.slice(start, end);

    res.json({
      success: true,
      logs,
      total,
      limit: parseInt(limit),
      offset: start,
    });
  } catch (error) {
    next(error);
  }
});

// Add log entry (internal use)
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const redisClient = getRedisClient();
    const { type, action, detail, success = true, errorMsg, device, ip } = req.body;
    const user = req.user!;

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
      type,
      action,
      userId: user.userId,
      username: user.username,
      ip: ip || req.ip,
      device,
      detail,
      success,
      errorMsg,
    };

    await redisClient.lPush(LOGS_KEY, JSON.stringify(logEntry));
    await redisClient.lTrim(LOGS_KEY, 0, LOG_MAX_COUNT - 1);

    res.json({
      success: true,
      message: 'Log added',
      log: logEntry,
    });
  } catch (error) {
    next(error);
  }
});

// Clear logs (admin only)
router.delete('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    await redisClient.del(LOGS_KEY);

    res.json({
      success: true,
      message: 'All logs cleared',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
