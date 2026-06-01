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

    // 1. Export settings
    const settingsData = await redisClient.get(SETTINGS_KEY);
    const settings = settingsData ? JSON.parse(settingsData) : {};

    // 2. Export users (with password)
    const usersData = await redisClient.hGetAll('boxsync:users');
    const users = Object.values(usersData).map((u) => JSON.parse(u));

    // 3. Export user partitions
    const partitionsData = await redisClient.hGetAll('boxsync:partitions');
    const partitions: Record<string, unknown[]> = {};
    for (const [userId, data] of Object.entries(partitionsData)) {
      partitions[userId] = JSON.parse(data);
    }

    // 4. Export sync data
    const syncData: Record<string, unknown> = {};
    const dataKeys = await redisClient.keys('boxsync:data:*');
    for (const key of dataKeys) {
      const data = await redisClient.get(key);
      if (data) {
        syncData[key] = JSON.parse(data);
      }
    }

    const exportData = {
      version: '1.1',
      exportTime: new Date().toISOString(),
      settings: { ...defaultSettings, ...settings },
      users,
      partitions,
      syncData,
    };

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    next(error);
  }
});

// Import settings (admin only) - 完全覆盖模式
router.post('/import', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const currentUser = req.user!;

  try {
    const redisClient = getRedisClient();
    const { settings, users, partitions, syncData } = req.body;

    // Step 1: 清除所有现有数据（完全覆盖模式）
    // 1.1 清除所有用户数据
    await redisClient.del('boxsync:users');
    // 1.2 清除所有分区数据
    await redisClient.del('boxsync:partitions');
    // 1.3 清除所有同步数据
    const existingDataKeys = await redisClient.keys('boxsync:data:*');
    for (const key of existingDataKeys) {
      await redisClient.del(key);
    }
    // 1.4 清除所有会话（强制所有用户重新登录）
    const sessionKeys = await redisClient.keys('boxsync:session:*');
    for (const key of sessionKeys) {
      await redisClient.del(key);
    }

    // Step 2: 恢复设置
    if (settings) {
      await redisClient.set(SETTINGS_KEY, JSON.stringify(settings));
    }

    // Step 3: 恢复用户（包含密码）
    if (users && Array.isArray(users)) {
      for (const user of users) {
        if (user.userId && user.username) {
          await redisClient.hSet('boxsync:users', user.userId, JSON.stringify(user));
        }
      }
    }

    // Step 4: 恢复分区数据
    if (partitions && typeof partitions === 'object') {
      for (const [userId, data] of Object.entries(partitions)) {
        if (Array.isArray(data)) {
          await redisClient.hSet('boxsync:partitions', userId, JSON.stringify(data));
        }
      }
    }

    // Step 5: 恢复同步数据
    if (syncData && typeof syncData === 'object') {
      for (const [key, data] of Object.entries(syncData)) {
        await redisClient.set(key, JSON.stringify(data));
      }
    }

    await logAdmin('import', `管理员 ${currentUser.username} 恢复备份，覆盖所有数据：${users?.length || 0} 个用户`, currentUser.userId, currentUser.username, ip, true);

    res.json({
      success: true,
      message: 'Backup restored successfully. All existing data has been replaced.',
    });
  } catch (error) {
    await logAdmin('import', `管理员 ${currentUser.username} 恢复备份失败`, currentUser.userId, currentUser.username, ip, false, (error as Error).message);
    next(error);
  }
});

// Clear all data (admin only) - resets everything to default state
router.post('/clear-all', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const user = req.user!;

  try {
    const redisClient = getRedisClient();

    // 1. Reset settings to default
    await redisClient.set(SETTINGS_KEY, JSON.stringify(defaultSettings));

    // 2. Clear all users (except admin)
    await redisClient.del('boxsync:users');

    // 3. Clear all logs
    await redisClient.del('boxsync:logs');

    // 4. Clear all user data (sync data)
    const dataKeys = await redisClient.keys('boxsync:data:*');
    for (const key of dataKeys) {
      await redisClient.del(key);
    }

    // 5. Clear all partitions
    await redisClient.del('boxsync:partitions');

    // 6. Clear all sessions
    const sessionKeys = await redisClient.keys('boxsync:session:*');
    for (const key of sessionKeys) {
      await redisClient.del(key);
    }

    // Log the action
    await logAdmin('clear_all', `管理员 ${user.username} 清空了所有数据`, user.userId, user.username, ip, true);

    res.json({
      success: true,
      message: 'All data cleared successfully. Server has been reset to default state.',
    });
  } catch (error) {
    await logAdmin('clear_all', `管理员 ${user.username} 清空数据失败`, user.userId, user.username, ip, false, (error as Error).message);
    next(error);
  }
});

export default router;
