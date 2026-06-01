import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getRedisClient } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { createError } from '../middleware/error.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

interface UserResponse {
  userId: string;
  username: string;
  role: string;
  createdAt: number;
  updatedAt: number;
  status: string;
}

function sanitizeUser(user: Record<string, unknown>): UserResponse {
  return {
    userId: String(user.userId),
    username: String(user.username),
    role: String(user.role),
    createdAt: Number(user.createdAt),
    updatedAt: Number(user.updatedAt),
    status: String(user.status),
  };
}

// Get all users (admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const usersData = await redisClient.hGetAll('boxsync:users');
    const users = Object.values(usersData).map((u) => {
      const user = JSON.parse(u);
      return sanitizeUser(user);
    });

    // Add admin user
    const adminData = await redisClient.hGetAll('boxsync:admin');
    const admin: UserResponse = {
      userId: adminData.userId || 'admin',
      username: adminData.username || 'admin',
      role: 'admin',
      createdAt: parseInt(adminData.createdAt || '0') || Date.now(),
      updatedAt: parseInt(adminData.updatedAt || '0') || Date.now(),
      status: adminData.status || 'active',
    };

    res.json({
      success: true,
      users: [admin, ...users],
    });
  } catch (error) {
    next(error);
  }
});

// Create user (admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const { username, password, role = 'user' } = req.body;
    if (!username || !password) {
      throw createError('Username and password are required', 400, 'INVALID_INPUT');
    }

    const usersData = await redisClient.hGetAll('boxsync:users');
    const users = Object.values(usersData).map((u) => JSON.parse(u));
    if (users.some((u) => u.username === username)) {
      throw createError('Username already exists', 409, 'USERNAME_EXISTS');
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      userId,
      username,
      password: hashedPassword,
      role,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
    };

    await redisClient.hSet('boxsync:users', userId, JSON.stringify(user));

    // Create storage partition
    await redisClient.hSet('boxsync:partitions', userId, JSON.stringify({
      userId,
      username,
      appPartitions: [],
      createdAt: Date.now(),
    }));

    res.json({
      success: true,
      message: 'User created successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// Update user (admin only)
router.put('/:userId', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const userId = req.params.userId as string;
    const { username, role, status } = req.body;

    const userData = await redisClient.hGet('boxsync:users', userId);
    if (!userData) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = JSON.parse(userData);
    if (username) user.username = username;
    if (role) user.role = role;
    if (status) user.status = status;
    user.updatedAt = Date.now();

    await redisClient.hSet('boxsync:users', userId, JSON.stringify(user));

    res.json({
      success: true,
      message: 'User updated successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// Toggle user status (admin only)
router.patch('/:userId/status', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const userId = req.params.userId as string;

    const userData = await redisClient.hGet('boxsync:users', userId);
    if (!userData) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = JSON.parse(userData);
    user.status = user.status === 'active' ? 'disabled' : 'active';
    user.updatedAt = Date.now();

    await redisClient.hSet('boxsync:users', userId, JSON.stringify(user));

    res.json({
      success: true,
      message: 'User status updated',
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:userId', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const userId = req.params.userId as string;

    const userData = await redisClient.hGet('boxsync:users', userId);
    if (!userData) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    await redisClient.hDel('boxsync:users', userId);
    await redisClient.hDel('boxsync:partitions', userId);

    // Clean up user data
    const keys = await redisClient.keys(`boxsync:data:${userId}:*`);
    if (keys.length > 0) {
      for (const key of keys) {
        await redisClient.del(key);
      }
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get user storage partition
router.get('/:userId/partition', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const redisClient = getRedisClient();
    const userId = req.params.userId as string;
    const currentUser = req.user!;

    if (currentUser.role !== 'admin' && currentUser.userId !== userId) {
      throw createError('Access denied', 403, 'FORBIDDEN');
    }

    const partitionData = await redisClient.hGet('boxsync:partitions', userId);
    if (!partitionData) {
      throw createError('Partition not found', 404, 'PARTITION_NOT_FOUND');
    }

    const partition = JSON.parse(partitionData);

    // Get actual storage stats
    const dataKeys = await redisClient.keys(`boxsync:data:${userId}:*`);
    partition.keyCount = dataKeys.length;

    res.json({
      success: true,
      partition,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
