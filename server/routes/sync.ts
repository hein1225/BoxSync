import { Router } from 'express';
import { getRedisClient } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { createError } from '../middleware/error.js';
import { logSync } from '../utils/logger.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();
const DATA_PREFIX = 'boxsync:data:';
const META_SUFFIX = ':_meta';
const SETTINGS_KEY = 'boxsync:settings';

// Helper function to get user data usage in bytes
async function getUserDataUsage(userId: string): Promise<number> {
  const redisClient = getRedisClient();
  const pattern = `${DATA_PREFIX}${userId}:*`;
  const keys = await redisClient.keys(pattern);
  let totalBytes = 0;
  for (const key of keys) {
    const value = await redisClient.get(key);
    if (value) {
      totalBytes += Buffer.byteLength(value, 'utf8');
    }
  }
  return totalBytes;
}

// Helper function to check if user exceeds data limit
async function checkDataLimit(userId: string, newDataSize: number): Promise<{ allowed: boolean; limit: number; current: number }> {
  const redisClient = getRedisClient();
  const settingsData = await redisClient.get(SETTINGS_KEY);
  const settings = settingsData ? JSON.parse(settingsData) : { maxDataPerUser: 100 };
  const limitBytes = (settings.maxDataPerUser || 100) * 1024 * 1024; // Convert MB to bytes
  const currentUsage = await getUserDataUsage(userId);
  const allowed = currentUsage + newDataSize <= limitBytes;
  return { allowed, limit: settings.maxDataPerUser || 100, current: Math.round(currentUsage / 1024 / 1024 * 100) / 100 };
}

// Write data
router.post('/write', authMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const user = req.user!;

  try {
    const redisClient = getRedisClient();
    const { appId, key, value, timestamp } = req.body;
    const userId = user.userId;

    if (!appId || !key || value === undefined) {
      await logSync('write', `写入数据失败：缺少必要参数`, userId, user.username, ip, false, undefined, '缺少 appId、key 或 value');
      throw createError('appId, key and value are required', 400, 'INVALID_INPUT');
    }

    const dataKey = `${DATA_PREFIX}${userId}:${appId}:${key}`;
    const metaKey = `${DATA_PREFIX}${userId}:${appId}${META_SUFFIX}`;

    const data = {
      value,
      timestamp: timestamp || Date.now(),
      version: Date.now(),
    };

    const dataString = JSON.stringify(data);
    const dataSize = Buffer.byteLength(dataString, 'utf8');

    // Check data limit
    const limitCheck = await checkDataLimit(userId, dataSize);
    if (!limitCheck.allowed) {
      await logSync('write', `写入数据失败：用户 ${user.username} 超出数据上限`, userId, user.username, ip, false, appId, `数据上限 ${limitCheck.limit}MB，当前使用 ${limitCheck.current}MB`);
      throw createError(`Data limit exceeded. Limit: ${limitCheck.limit}MB, Current: ${limitCheck.current}MB`, 413, 'DATA_LIMIT_EXCEEDED');
    }

    await redisClient.set(dataKey, dataString);

    // Update meta
    const metaData = await redisClient.get(metaKey);
    const meta = metaData ? JSON.parse(metaData) : { appId, appName: appId, keys: [] };
    if (!meta.keys.includes(key)) {
      meta.keys.push(key);
      meta.keyCount = meta.keys.length;
    }
    meta.lastSyncTime = Date.now();
    await redisClient.set(metaKey, JSON.stringify(meta));

    await logSync('write', `用户 ${user.username} 写入数据：${appId}/${key}`, userId, user.username, ip, true, req.headers['user-agent']);

    res.json({
      success: true,
      message: 'Data written successfully',
      key,
      timestamp: data.timestamp,
      version: data.version,
    });
  } catch (error) {
    next(error);
  }
});

// Read data
router.get('/read', authMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const user = req.user!;

  try {
    const redisClient = getRedisClient();
    const { appId, key } = req.query as { appId: string; key: string };
    const userId = user.userId;

    if (!appId || !key) {
      await logSync('read', `读取数据失败：缺少必要参数`, userId, user.username, ip, false, undefined, '缺少 appId 或 key');
      throw createError('appId and key are required', 400, 'INVALID_INPUT');
    }

    const dataKey = `${DATA_PREFIX}${userId}:${appId}:${key}`;
    const data = await redisClient.get(dataKey);

    if (!data) {
      await logSync('read', `读取数据失败：${appId}/${key} 不存在`, userId, user.username, ip, false, undefined, '数据不存在');
      throw createError('Data not found', 404, 'DATA_NOT_FOUND');
    }

    await logSync('read', `读取数据：${appId}/${key}`, userId, user.username, ip, true, appId);

    res.json({
      success: true,
      ...JSON.parse(data),
      key,
    });
  } catch (error) {
    next(error);
  }
});

// Batch sync
router.post('/batch', authMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const user = req.user!;

  try {
    const redisClient = getRedisClient();
    const { appId, changes } = req.body;
    const userId = user.userId;

    if (!appId || !Array.isArray(changes)) {
      await logSync('batch', `批量同步失败：缺少必要参数`, userId, user.username, ip, false, undefined, '缺少 appId 或 changes');
      throw createError('appId and changes array are required', 400, 'INVALID_INPUT');
    }

    // Calculate total data size first
    let totalNewSize = 0;
    const dataItems = [];
    for (const change of changes) {
      const { key, value, timestamp } = change;
      const data = {
        value,
        timestamp: timestamp || Date.now(),
        version: Date.now(),
      };
      const dataString = JSON.stringify(data);
      totalNewSize += Buffer.byteLength(dataString, 'utf8');
      dataItems.push({ key, dataString, data });
    }

    // Check data limit
    const limitCheck = await checkDataLimit(userId, totalNewSize);
    if (!limitCheck.allowed) {
      await logSync('batch', `批量同步失败：用户 ${user.username} 超出数据上限`, userId, user.username, ip, false, appId, `数据上限 ${limitCheck.limit}MB，当前使用 ${limitCheck.current}MB`);
      throw createError(`Data limit exceeded. Limit: ${limitCheck.limit}MB, Current: ${limitCheck.current}MB`, 413, 'DATA_LIMIT_EXCEEDED');
    }

    const results = [];
    const metaKey = `${DATA_PREFIX}${userId}:${appId}${META_SUFFIX}`;

    for (const item of dataItems) {
      const { key, dataString, data } = item;
      const dataKey = `${DATA_PREFIX}${userId}:${appId}:${key}`;

      await redisClient.set(dataKey, dataString);
      results.push({ key, timestamp: data.timestamp, version: data.version });
    }

    // Update meta
    const metaData = await redisClient.get(metaKey);
    const meta = metaData ? JSON.parse(metaData) : { appId, appName: appId, keys: [] };
    for (const change of changes) {
      if (!meta.keys.includes(change.key)) {
        meta.keys.push(change.key);
      }
    }
    meta.keyCount = meta.keys.length;
    meta.lastSyncTime = Date.now();
    await redisClient.set(metaKey, JSON.stringify(meta));

    await logSync('batch', `用户 ${user.username} 批量同步：${appId}，${changes.length} 条数据`, userId, user.username, ip, true, req.headers['user-agent']);

    res.json({
      success: true,
      message: 'Batch sync completed',
      results,
    });
  } catch (error) {
    next(error);
  }
});

// Get changes
router.get('/changes', authMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const user = req.user!;

  try {
    const redisClient = getRedisClient();
    const { appId, since } = req.query as { appId: string; since: string };
    const userId = user.userId;

    if (!appId) {
      await logSync('sync', `获取变更列表失败：缺少 appId`, userId, user.username, ip, false, undefined, '缺少 appId');
      throw createError('appId is required', 400, 'INVALID_INPUT');
    }

    // Fix: handle invalid since parameter
    let sinceTime = 0;
    if (since && since !== 'undefined' && since !== 'null') {
      const parsed = parseInt(since);
      if (!isNaN(parsed)) {
        sinceTime = parsed;
      }
    }

    const pattern = `${DATA_PREFIX}${userId}:${appId}:*`;
    const keys = await redisClient.keys(pattern);

    const changes = [];
    for (const key of keys) {
      if (key.endsWith(META_SUFFIX)) continue;

      const data = await redisClient.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.timestamp > sinceTime) {
          const keyName = key.split(':').pop()!;
          changes.push({
            key: keyName,
            value: parsed.value,
            timestamp: parsed.timestamp,
            version: parsed.version,
          });
        }
      }
    }

    await logSync('sync', `获取变更列表：${appId}，${changes.length} 条变更`, userId, user.username, ip, true, appId);

    res.json({
      success: true,
      changes,
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
});

// Delete data
router.delete('/delete', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const redisClient = getRedisClient();
    const { appId, key } = req.query as { appId: string; key: string };
    const userId = req.user!.userId;

    if (!appId || !key) {
      throw createError('appId and key are required', 400, 'INVALID_INPUT');
    }

    const dataKey = `${DATA_PREFIX}${userId}:${appId}:${key}`;
    await redisClient.del(dataKey);

    // Update meta
    const metaKey = `${DATA_PREFIX}${userId}:${appId}${META_SUFFIX}`;
    const metaData = await redisClient.get(metaKey);
    if (metaData) {
      const meta = JSON.parse(metaData);
      meta.keys = meta.keys.filter((k: string) => k !== key);
      meta.keyCount = meta.keys.length;
      await redisClient.set(metaKey, JSON.stringify(meta));
    }

    res.json({
      success: true,
      message: 'Data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// List app partitions
router.get('/apps', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const redisClient = getRedisClient();
    const userId = req.user!.userId;
    const pattern = `${DATA_PREFIX}${userId}:*${META_SUFFIX}`;
    const keys = await redisClient.keys(pattern);

    const apps = [];
    for (const key of keys) {
      const metaData = await redisClient.get(key);
      if (metaData) {
        const meta = JSON.parse(metaData);
        apps.push({
          appId: meta.appId,
          appName: meta.appName || meta.appId,
          keyCount: meta.keyCount || 0,
          lastSyncTime: meta.lastSyncTime || 0,
        });
      }
    }

    res.json({
      success: true,
      apps,
    });
  } catch (error) {
    next(error);
  }
});

// Create app partition
router.post('/apps', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const redisClient = getRedisClient();
    const { appId, appName } = req.body;
    const userId = req.user!.userId;

    if (!appId) {
      throw createError('appId is required', 400, 'INVALID_INPUT');
    }

    const metaKey = `${DATA_PREFIX}${userId}:${appId}${META_SUFFIX}`;
    const existing = await redisClient.get(metaKey);
    if (existing) {
      throw createError('App partition already exists', 409, 'APP_EXISTS');
    }

    const meta = {
      appId,
      appName: appName || appId,
      keys: [],
      keyCount: 0,
      lastSyncTime: Date.now(),
    };

    await redisClient.set(metaKey, JSON.stringify(meta));

    res.json({
      success: true,
      message: 'App partition created',
      app: meta,
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all users' storage stats
router.get('/admin/stats', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();

    // Get all users
    const usersData = await redisClient.hGetAll('boxsync:users');
    const adminData = await redisClient.hGetAll('boxsync:admin');

    const allUsers = [
      {
        userId: adminData.userId || 'admin',
        username: adminData.username || 'admin',
        role: 'admin',
      },
      ...Object.values(usersData).map((u) => {
        const user = JSON.parse(u);
        return {
          userId: user.userId,
          username: user.username,
          role: user.role,
        };
      }),
    ];

    // Get storage stats for each user
    const userStats = [];
    for (const user of allUsers) {
      const pattern = `${DATA_PREFIX}${user.userId}:*${META_SUFFIX}`;
      const metaKeys = await redisClient.keys(pattern);

      let keyCount = 0;
      let memoryUsage = 0;
      let lastSyncTime = 0;
      const apps: Array<{ appId: string; appName: string; keyCount: number }> = [];

      for (const metaKey of metaKeys) {
        const metaData = await redisClient.get(metaKey);
        if (metaData) {
          const meta = JSON.parse(metaData);
          keyCount += meta.keyCount || 0;
          if (meta.lastSyncTime > lastSyncTime) {
            lastSyncTime = meta.lastSyncTime;
          }
          apps.push({
            appId: meta.appId,
            appName: meta.appName || meta.appId,
            keyCount: meta.keyCount || 0,
          });
        }
      }

      // Calculate memory usage by scanning data keys
      const dataPattern = `${DATA_PREFIX}${user.userId}:*`;
      const dataKeys = await redisClient.keys(dataPattern);
      for (const key of dataKeys) {
        if (!key.endsWith(META_SUFFIX)) {
          const value = await redisClient.get(key);
          if (value) {
            memoryUsage += Buffer.byteLength(value, 'utf8');
          }
        }
      }

      userStats.push({
        userId: user.userId,
        username: user.username,
        role: user.role,
        keyCount,
        memoryUsage,
        lastSyncTime,
        apps,
      });
    }

    res.json({
      success: true,
      stats: userStats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
