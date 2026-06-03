import { Router } from 'express';
import { getRedisClient } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { logAdmin } from '../utils/logger.js';
import { createError } from '../middleware/error.js';
import type { AuthRequest } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

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
    console.log('[Export] Starting export...');

    // 导出所有 Redis 数据，按 key 类型分类
    const exportData: Record<string, unknown> = {
      version: '2.0',
      exportTime: new Date().toISOString(),
    };

    // 1. String 类型数据
    console.log('[Export] Fetching all keys...');
    const allKeys = await redisClient.keys('boxsync:*');
    console.log(`[Export] Found ${allKeys.length} keys`);
    
    const stringKeys = allKeys.filter(k => 
      !k.includes(':users') && 
      !k.includes(':partitions') && 
      !k.includes(':logs')
    );
    console.log(`[Export] Processing ${stringKeys.length} string keys`);
    
    for (const key of stringKeys) {
      try {
        const value = await redisClient.get(key);
        if (value) {
          try {
            exportData[key] = JSON.parse(value);
          } catch {
            exportData[key] = value; // 非 JSON 字符串直接存储
          }
        }
      } catch (err) {
        console.error(`[Export] Error reading key ${key}:`, err);
      }
    }

    // 2. Hash 类型数据 - users
    console.log('[Export] Fetching users...');
    try {
      const usersData = await redisClient.hGetAll('boxsync:users');
      const userCount = Object.keys(usersData).length;
      console.log(`[Export] Found ${userCount} users`);
      
      if (userCount > 0) {
        exportData['boxsync:users'] = {};
        for (const [field, value] of Object.entries(usersData)) {
          try {
            const userObj = JSON.parse(value);
            console.log(`[Export] Exporting user: ${userObj.username} (${userObj.userId}), role: ${userObj.role}`);
            (exportData['boxsync:users'] as Record<string, unknown>)[field] = userObj;
          } catch {
            console.log(`[Export] Exporting user (raw): ${field}`);
            (exportData['boxsync:users'] as Record<string, unknown>)[field] = value;
          }
        }
      }
    } catch (err) {
      console.error('[Export] Error reading users:', err);
    }

    // 3. Hash 类型数据 - partitions
    console.log('[Export] Fetching partitions...');
    try {
      const partitionsData = await redisClient.hGetAll('boxsync:partitions');
      console.log(`[Export] Found ${Object.keys(partitionsData).length} partitions`);
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
    } catch (err) {
      console.error('[Export] Error reading partitions:', err);
    }

    // 4. List 类型数据 - logs
    console.log('[Export] Fetching logs...');
    try {
      const logsData = await redisClient.lRange('boxsync:logs', 0, -1);
      console.log(`[Export] Found ${logsData.length} logs`);
      if (logsData.length > 0) {
        exportData['boxsync:logs'] = logsData.map(log => {
          try {
            return JSON.parse(log);
          } catch {
            return log;
          }
        });
      }
    } catch (err) {
      console.error('[Export] Error reading logs:', err);
    }

    console.log('[Export] Export completed successfully');
    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error('[Export] Export failed:', error);
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
          const entries = Object.entries(value as Record<string, unknown>);
          console.log(`[Import] Restoring ${entries.length} entries for ${key}`);
          for (const [field, fieldValue] of entries) {
            if (key === 'boxsync:users') {
              const userObj = fieldValue as Record<string, unknown>;
              console.log(`[Import] Restoring user: ${userObj.username} (${field}), role: ${userObj.role}`);
            }
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

    // 检查是否有用户数据，如果没有则创建初始站长
    let usersData = await redisClient.hGetAll('boxsync:users');

    // 检查是否已存在 admin 用户
    const hasAdmin = Object.values(usersData).some(userStr => {
      try {
        const user = JSON.parse(userStr);
        return user.username === 'admin';
      } catch {
        return false;
      }
    });

    // 如果没有 admin 用户，创建初始站长账号（固定密码 admin123）
    let initialPassword: string | undefined;
    if (!hasAdmin) {
      initialPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(initialPassword, 10);
      const adminUser = {
        userId: 'admin',
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await redisClient.hSet('boxsync:users', 'admin', JSON.stringify(adminUser));
      console.log('[Import] Created initial admin account');

      // 重新读取用户数据
      usersData = await redisClient.hGetAll('boxsync:users');
    }

    const userCount = Object.keys(usersData).length;

    // 记录恢复操作到日志（系统级别，因为当前管理员会话已被清除）
    await logAdmin('import', `备份恢复完成：${userCount} 个用户, ${stringCount} 个字符串键, ${hashCount} 个哈希表, ${listCount} 个列表`, 'system', 'system', ip, true);

    res.json({
      success: true,
      message: initialPassword
        ? '备份恢复完成。已创建初始站长账号，请查看响应中的密码'
        : 'Backup restored successfully. All existing data has been replaced. Please login again.',
      stats: {
        users: userCount,
        stringKeys: stringCount,
        hashKeys: hashCount,
        listKeys: listCount,
      },
      requireRelogin: true,
      initialPassword: initialPassword,
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

    // 检查是否有用户数据，如果没有 admin 用户则创建初始站长
    let usersData = await redisClient.hGetAll('boxsync:users');

    // 检查是否已存在 admin 用户
    const hasAdmin = Object.values(usersData).some(userStr => {
      try {
        const user = JSON.parse(userStr as string);
        return user.username === 'admin';
      } catch {
        return false;
      }
    });

    // 如果没有 admin 用户，创建初始站长账号（固定密码 admin123）
    let initialPassword: string | undefined;
    if (!hasAdmin) {
      initialPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(initialPassword, 10);
      const adminUser = {
        userId: 'admin',
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await redisClient.hSet('boxsync:users', 'admin', JSON.stringify(adminUser));
      console.log('[Import] Created initial admin account');

      // 重新读取用户数据
      usersData = await redisClient.hGetAll('boxsync:users');
    }

    const userCount = Object.keys(usersData).length;

    // 记录恢复操作到日志（系统级别）
    await logAdmin('import', `备份恢复完成：${userCount} 个用户, ${stringCount} 个字符串键, ${hashCount} 个哈希表, ${listCount} 个列表`, 'system', 'system', ip, true);

    res.json({
      success: true,
      message: initialPassword
        ? '备份恢复完成。已创建初始站长账号，请查看响应中的密码'
        : 'Backup restored successfully. All existing data has been replaced. Please login again.',
      stats: {
        users: userCount,
        stringKeys: stringCount,
        hashKeys: hashCount,
        listKeys: listCount,
      },
      requireRelogin: true,
      initialPassword: initialPassword,
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

    // 2. Clear all users
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

    // 7. 重新创建站长账号（固定密码 admin123）
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = {
      userId: 'admin',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await redisClient.hSet('boxsync:users', 'admin', JSON.stringify(adminUser));

    // Log the action
    await logAdmin('clear_all', `管理员 ${user.username} 清空了所有数据并恢复初始站长账号`, user.userId, user.username, ip, true);

    res.json({
      success: true,
      message: 'All data cleared successfully. Server has been reset to default state. Please login with initial admin account.',
    });
  } catch (error) {
    await logAdmin('clear_all', `管理员 ${user.username} 清空数据失败`, user.userId, user.username, ip, false, (error as Error).message);
    next(error);
  }
});

export default router;
