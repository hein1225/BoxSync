import { Router } from 'express';
import { getRedisClient } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { logAdmin } from '../utils/logger.js';
import { createError } from '../middleware/error.js';
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

// Import settings (admin only) - 完全覆盖模式（清除所有数据包括当前管理员）
router.post('/import', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const currentUser = req.user!;

  try {
    const redisClient = getRedisClient();
    const { settings, users, partitions, syncData } = req.body;

    // Step 1: 清除所有现有数据（完全覆盖模式）- 使用 Promise.allSettled 确保即使部分删除失败也能继续
    const deleteOperations: Promise<unknown>[] = [];

    // 1.1 清除所有用户数据
    deleteOperations.push(redisClient.del('boxsync:users').catch(err => {
      console.warn('[Import] Failed to delete users:', err);
      return null;
    }));

    // 1.2 清除所有分区数据
    deleteOperations.push(redisClient.del('boxsync:partitions').catch(err => {
      console.warn('[Import] Failed to delete partitions:', err);
      return null;
    }));

    // 1.3 清除所有同步数据
    const existingDataKeys = await redisClient.keys('boxsync:data:*');
    for (const key of existingDataKeys) {
      deleteOperations.push(redisClient.del(key).catch(err => {
        console.warn(`[Import] Failed to delete sync data ${key}:`, err);
        return null;
      }));
    }

    // 1.4 清除所有会话（包括当前管理员的会话，强制重新登录）
    const sessionKeys = await redisClient.keys('boxsync:session:*');
    for (const key of sessionKeys) {
      deleteOperations.push(redisClient.del(key).catch(err => {
        console.warn(`[Import] Failed to delete session ${key}:`, err);
        return null;
      }));
    }

    await Promise.allSettled(deleteOperations);

    // Step 2: 恢复设置
    if (settings) {
      await redisClient.set(SETTINGS_KEY, JSON.stringify(settings));
    }

    // Step 3: 恢复用户（包含密码）- 使用 Map 去重，以 userId 为准
    const restoredUsers: Record<string, unknown> = {};

    // 添加备份中的用户
    if (users && Array.isArray(users) && users.length > 0) {
      for (const user of users) {
        if (user.userId && user.username) {
          restoredUsers[user.userId] = user;
        }
      }
    }

    // 检查是否有用户数据，如果没有则拒绝导入
    if (Object.keys(restoredUsers).length === 0) {
      throw createError('备份文件中没有有效的用户数据，导入已取消', 400, 'NO_USERS_IN_BACKUP');
    }

    // 写入用户数据
    for (const user of Object.values(restoredUsers)) {
      const u = user as { userId: string };
      await redisClient.hSet('boxsync:users', u.userId, JSON.stringify(user));
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

    const userCount = Object.keys(restoredUsers).length;
    const partitionCount = partitions ? Object.keys(partitions).length : 0;
    const syncDataCount = syncData ? Object.keys(syncData).length : 0;

    // 记录恢复操作到日志（系统级别，因为当前管理员会话已被清除）
    await logAdmin('import', `备份恢复完成：${userCount} 个用户, ${partitionCount} 个分区, ${syncDataCount} 条同步数据`, 'system', 'system', ip, true);

    res.json({
      success: true,
      message: 'Backup restored successfully. All existing data has been replaced. Please login again.',
      stats: {
        users: userCount,
        partitions: partitionCount,
        syncData: syncDataCount,
      },
      requireRelogin: true,
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
