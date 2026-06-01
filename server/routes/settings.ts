import { Router } from 'express';
import { getRedisClient } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { logAdmin } from '../utils/logger.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();
const SETTINGS_KEY = 'boxsync:settings';

const defaultSettings = {
  serverName: 'BoxSync',
  serverPort: 9390,
  logRetentionDays: 30,
  logMaxCount: 50000,
  autoCleanupEnabled: true,
  cleanupTime: '02:00',
  maxUsers: 100,
  maxDataPerUser: 100,
  requireAuth: true,
  allowRegistration: false,
  sessionTimeout: 30,
};

// Get settings
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const settingsData = await redisClient.get(SETTINGS_KEY);
    const settings = settingsData
      ? { ...defaultSettings, ...JSON.parse(settingsData) }
      : { ...defaultSettings };

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
});

// Update settings (admin only)
router.put('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const currentUser = req.user!;

  try {
    const redisClient = getRedisClient();
    const settingsData = await redisClient.get(SETTINGS_KEY);
    const current = settingsData ? JSON.parse(settingsData) : {};
    const updated = { ...current, ...req.body };

    await redisClient.set(SETTINGS_KEY, JSON.stringify(updated));

    // Log which settings were changed
    const changedKeys = Object.keys(req.body);
    await logAdmin('update_settings', `管理员 ${currentUser.username} 修改设置：${changedKeys.join(', ')}`, currentUser.userId, currentUser.username, ip, true);

    res.json({
      success: true,
      message: 'Settings updated',
      settings: { ...defaultSettings, ...updated },
    });
  } catch (error) {
    next(error);
  }
});

// Reset settings (admin only)
router.post('/reset', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    await redisClient.set(SETTINGS_KEY, JSON.stringify(defaultSettings));

    res.json({
      success: true,
      message: 'Settings reset to default',
      settings: { ...defaultSettings },
    });
  } catch (error) {
    next(error);
  }
});

// Export settings (admin only)
router.get('/export', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const settingsData = await redisClient.get(SETTINGS_KEY);
    const settings = settingsData ? JSON.parse(settingsData) : {};
    const usersData = await redisClient.hGetAll('boxsync:users');
    const users = Object.values(usersData).map((u) => {
      const user = JSON.parse(u);
      delete (user as Record<string, unknown>).password;
      return user;
    });

    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      settings: { ...defaultSettings, ...settings },
      users,
    };

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    next(error);
  }
});

// Import settings (admin only)
router.post('/import', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const { settings, users } = req.body;

    if (settings) {
      await redisClient.set(SETTINGS_KEY, JSON.stringify(settings));
    }

    if (users && Array.isArray(users)) {
      for (const user of users) {
        if (user.userId && user.username) {
          await redisClient.hSet('boxsync:users', user.userId, JSON.stringify(user));
        }
      }
    }

    res.json({
      success: true,
      message: 'Settings imported successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
