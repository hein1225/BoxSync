import { Router } from 'express';
import { getRedisClient } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { createError } from '../middleware/error.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();
const DATA_PREFIX = 'boxsync:data:';
const META_SUFFIX = ':_meta';

// Write data
router.post('/write', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const redisClient = getRedisClient();
    const { appId, key, value, timestamp } = req.body;
    const userId = req.user!.userId;

    if (!appId || !key || value === undefined) {
      throw createError('appId, key and value are required', 400, 'INVALID_INPUT');
    }

    const dataKey = `${DATA_PREFIX}${userId}:${appId}:${key}`;
    const metaKey = `${DATA_PREFIX}${userId}:${appId}${META_SUFFIX}`;

    const data = {
      value,
      timestamp: timestamp || Date.now(),
      version: Date.now(),
    };

    await redisClient.set(dataKey, JSON.stringify(data));

    // Update meta
    const metaData = await redisClient.get(metaKey);
    const meta = metaData ? JSON.parse(metaData) : { appId, appName: appId, keys: [] };
    if (!meta.keys.includes(key)) {
      meta.keys.push(key);
      meta.keyCount = meta.keys.length;
    }
    meta.lastSyncTime = Date.now();
    await redisClient.set(metaKey, JSON.stringify(meta));

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
  try {
    const redisClient = getRedisClient();
    const { appId, key } = req.query as { appId: string; key: string };
    const userId = req.user!.userId;

    if (!appId || !key) {
      throw createError('appId and key are required', 400, 'INVALID_INPUT');
    }

    const dataKey = `${DATA_PREFIX}${userId}:${appId}:${key}`;
    const data = await redisClient.get(dataKey);

    if (!data) {
      throw createError('Data not found', 404, 'DATA_NOT_FOUND');
    }

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
  try {
    const redisClient = getRedisClient();
    const { appId, changes } = req.body;
    const userId = req.user!.userId;

    if (!appId || !Array.isArray(changes)) {
      throw createError('appId and changes array are required', 400, 'INVALID_INPUT');
    }

    const results = [];
    const metaKey = `${DATA_PREFIX}${userId}:${appId}${META_SUFFIX}`;

    for (const change of changes) {
      const { key, value, timestamp } = change;
      const dataKey = `${DATA_PREFIX}${userId}:${appId}:${key}`;

      const data = {
        value,
        timestamp: timestamp || Date.now(),
        version: Date.now(),
      };

      await redisClient.set(dataKey, JSON.stringify(data));
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
  try {
    const redisClient = getRedisClient();
    const { appId, since } = req.query as { appId: string; since: string };
    const userId = req.user!.userId;

    if (!appId) {
      throw createError('appId is required', 400, 'INVALID_INPUT');
    }

    const sinceTime = since ? parseInt(since) : 0;
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

export default router;
