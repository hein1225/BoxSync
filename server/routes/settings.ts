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

// Export all Redis data (admin only) - 导出所有 Redis 数据
router.get('/export', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();

    // 导出所有 Redis 数据，按 key 类型分类
    const exportData: Record<string, unknown> = {
      version: '2.0',
      exportTime: new Date().toISOString(),
    };

    // 1. String 类型数据
    const allKeys = await redisClient.keys('boxsync:*');
    const stringKeys = allKeys.filter(k => 
      !k.includes(':users') && 
      !k.includes(':partitions') && 
      !k.includes(':logs')
    );
    
    for (const key of stringKeys) {
      const value = await redisClient.get(key);
      if (value) {
        try {
          exportData[key] = JSON.parse(value);
        } catch {
          exportData[key] = value; // 非 JSON 字符串直接存储
        }
      }
    }

    // 2. Hash 类型数据 - users
    const usersData = await redisClient.hGetAll('boxsync:users');
    if (Object.keys(usersData).length > 0) {
      exportData['boxsync:users'] = {};
      for (const [field, value] of Object.entries(usersData)) {
        try {
          (exportData['boxsync:users'] as Record<string, unknown>)[field] = JSON.parse(value);
        } catch {
          (exportData['boxsync:users'] as Record<string, unknown>)[field] = value;
        }
      }
    }

    // 3. Hash 类型数据 - partitions
    const partitionsData = await redisClient.hGetAll('boxsync:partitions');
    if (Object.keys(partitionsData).length > 0) {
      exportData['boxsync:partitions'] = {};
      for (const [field, value] of Object.entries(partitionsData)) {
        try {
          (exportData['boxsync:partitions'] as Record<string, unknown>)[field] = JSON.parse(value);
        } catch {
          (exportData['boxsync:partitions'] as Record<string, unknown>)[field] = value;
        }
      }
    }

    // 4. List 类型数据 - logs
    const logsData = await redisClient.lRange('boxsync:logs', 0, -1);
    if (logsData.length > 0) {
      exportData['boxsync:logs'] = logsData.map(log => {
        try {
          return JSON.parse(log);
        } catch {
          return log;
        }
      });
    }

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    next(error);
  }
});

// Import all Redis data (admin only) - 完全覆盖模式，导入所有 Redis 数据
router.post('/import', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const currentUser = req.user!;

  try {
    const redisClient = getRedisClient();
    const backupData = req.body;

    // 验证备份数据格式
    if (!backupData || typeof backupData !== 'object') {
      throw createError('无效的备份数据格式', 400, 'INVALID_BACKUP_FORMAT');
    }

    // Step 1: 清除所有现有数据（完全覆盖模式）
    const allKeys = await redisClient.keys('boxsync:*');
    const deleteOperations: Promise<unknown>[] = [];

    for (const key of allKeys) {
      deleteOperations.push(redisClient.del(key).catch(err => {
        console.warn(`[Import] Failed to delete ${key}:`, err);
        return null;
      }));
    }

    await Promise.allSettled(deleteOperations);

    // Step 2: 恢复所有数据
    let stringCount = 0;
    let hashCount = 0;
    let listCount = 0;

    for (const [key, value] of Object.entries(backupData)) {
      // 跳过元数据字段
      if (key === 'version' || key === 'exportTime') continue;

      if (key === 'boxsync:users' || key === 'boxsync:partitions') {
        // Hash 类型数据
        if (value && typeof value === 'object') {
          for (const [field, fieldValue] of Object.entries(value as Record<string, unknown>)) {
            await redisClient.hSet(key, field, JSON.stringify(fieldValue));
          }
          hashCount++;
        }
      } else if (key === 'boxsync:logs') {
        // List 类型数据 - 日志项在导出时已经解析为对象，需要重新序列化
        if (Array.isArray(value)) {
          for (const item of value) {
            // 如果 item 是对象，序列化为字符串；如果已经是字符串，直接使用
            const itemStr = typeof item === 'object' ? JSON.stringify(item) : String(item);
            await redisClient.lPush(key, itemStr);
          }
          listCount++;
        }
      } else {
        // String 类型数据
        await redisClient.set(key, JSON.stringify(value));
        stringCount++;
      }
    }

    // 检查是否有用户数据
    const usersData = await redisClient.hGetAll('boxsync:users');
    if (Object.keys(usersData).length === 0) {
      throw createError('备份文件中没有有效的用户数据，导入已取消', 400, 'NO_USERS_IN_BACKUP');
    }

    const userCount = Object.keys(usersData).length;

    // 记录恢复操作到日志（系统级别，因为当前管理员会话已被清除）
    await logAdmin('import', `备份恢复完成：${userCount} 个用户, ${stringCount} 个字符串键, ${hashCount} 个哈希表, ${listCount} 个列表`, 'system', 'system', ip, true);

    res.json({
      success: true,
      message: 'Backup restored successfully. All existing data has been replaced. Please login again.',
      stats: {
        users: userCount,
        stringKeys: stringCount,
        hashKeys: hashCount,
        listKeys: listCount,
      },
      requireRelogin: true,
    });
  } catch (error) {
    await logAdmin('import', `管理员 ${currentUser.username} 恢复备份失败`, currentUser.userId, currentUser.username, ip, false, (error as Error).message);
    next(error);
  }
});

// Public import endpoint - 无需认证的导入端点（用于导入页面）
router.post('/import-public', async (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    const redisClient = getRedisClient();
    const backupData = req.body;

    // 验证备份数据格式
    if (!backupData || typeof backupData !== 'object') {
      throw createError('无效的备份数据格式', 400, 'INVALID_BACKUP_FORMAT');
    }

    // Step 1: 清除所有现有数据（完全覆盖模式）
    const allKeys = await redisClient.keys('boxsync:*');
    const deleteOperations: Promise<unknown>[] = [];

    for (const key of allKeys) {
      deleteOperations.push(redisClient.del(key).catch(err => {
        console.warn(`[Import] Failed to delete ${key}:`, err);
        return null;
      }));
    }

    await Promise.allSettled(deleteOperations);

    // Step 2: 恢复所有数据
    let stringCount = 0;
    let hashCount = 0;
    let listCount = 0;

    for (const [key, value] of Object.entries(backupData)) {
      // 跳过元数据字段
      if (key === 'version' || key === 'exportTime') continue;

      if (key === 'boxsync:users' || key === 'boxsync:partitions') {
        // Hash 类型数据
        if (value && typeof value === 'object') {
          for (const [field, fieldValue] of Object.entries(value as Record<string, unknown>)) {
            await redisClient.hSet(key, field, JSON.stringify(fieldValue));
          }
          hashCount++;
        }
      } else if (key === 'boxsync:logs') {
        // List 类型数据 - 日志项在导出时已经解析为对象，需要重新序列化
        if (Array.isArray(value)) {
          for (const item of value) {
            // 如果 item 是对象，序列化为字符串；如果已经是字符串，直接使用
            const itemStr = typeof item === 'object' ? JSON.stringify(item) : String(item);
            await redisClient.lPush(key, itemStr);
          }
          listCount++;
        }
      } else {
        // String 类型数据
        await redisClient.set(key, JSON.stringify(value));
        stringCount++;
      }
    }

    // 检查是否有用户数据
    const usersData = await redisClient.hGetAll('boxsync:users');
    if (Object.keys(usersData).length === 0) {
      throw createError('备份文件中没有有效的用户数据，导入已取消', 400, 'NO_USERS_IN_BACKUP');
    }

    const userCount = Object.keys(usersData).length;

    // 记录恢复操作到日志（系统级别）
    await logAdmin('import', `备份恢复完成：${userCount} 个用户, ${stringCount} 个字符串键, ${hashCount} 个哈希表, ${listCount} 个列表`, 'system', 'system', ip, true);

    res.json({
      success: true,
      message: 'Backup restored successfully. All existing data has been replaced. Please login again.',
      stats: {
        users: userCount,
        stringKeys: stringCount,
        hashKeys: hashCount,
        listKeys: listCount,
      },
      requireRelogin: true,
    });
  } catch (error) {
    await logAdmin('import', `恢复备份失败`, 'system', 'system', ip, false, (error as Error).message);
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
