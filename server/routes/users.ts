import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getRedisClient } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { createError } from '../middleware/error.js';
import { logAdmin } from '../utils/logger.js';
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

    // Add admin/owner user
    const adminData = await redisClient.hGetAll('boxsync:admin');
    const admin: UserResponse = {
      userId: adminData.userId || 'admin',
      username: adminData.username || 'admin',
      role: adminData.role || 'admin',
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
router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const currentUser = req.user!;

  try {
    const redisClient = getRedisClient();
    const { username, password, role = 'user' } = req.body;
    if (!username || !password) {
      throw createError('Username and password are required', 400, 'INVALID_INPUT');
    }

    // 禁止创建站长角色
    if (role === 'owner') {
      throw createError('Cannot create owner role', 403, 'FORBIDDEN');
    }

    const usersData = await redisClient.hGetAll('boxsync:users');
    const users = Object.values(usersData).map((u) => JSON.parse(u));
    if (users.some((u) => u.username === username)) {
      await logAdmin('create_user', `创建用户失败：用户名 ${username} 已存在`, currentUser.userId, currentUser.username, ip, false, '用户名已存在');
      throw createError('Username already exists', 409, 'USERNAME_EXISTS');
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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

    await logAdmin('create_user', `管理员 ${currentUser.username} 创建用户 ${username}（角色：${role}）`, currentUser.userId, currentUser.username, ip, true);

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
router.put('/:userId', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const currentUser = req.user!;

  try {
    const redisClient = getRedisClient();
    const userId = req.params.userId as string;
    const { username, role, status } = req.body;

    const userData = await redisClient.hGet('boxsync:users', userId);
    if (!userData) {
      await logAdmin('update_user', `更新用户失败：用户 ${userId} 不存在`, currentUser.userId, currentUser.username, ip, false, '用户不存在');
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = JSON.parse(userData);
    const oldUsername = user.username;

    // 禁止修改站长角色
    if (user.role === 'owner') {
      throw createError('Cannot modify owner user', 403, 'FORBIDDEN');
    }
    // 禁止将用户修改为站长角色
    if (role === 'owner') {
      throw createError('Cannot assign owner role', 403, 'FORBIDDEN');
    }

    if (username) user.username = username;
    if (role) user.role = role;
    if (status) user.status = status;
    user.updatedAt = Date.now();

    await redisClient.hSet('boxsync:users', userId, JSON.stringify(user));

    await logAdmin('update_user', `管理员 ${currentUser.username} 更新用户 ${oldUsername} 的信息`, currentUser.userId, currentUser.username, ip, true);

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
router.patch('/:userId/status', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const currentUser = req.user!;

  try {
    const redisClient = getRedisClient();
    const userId = req.params.userId as string;

    const userData = await redisClient.hGet('boxsync:users', userId);
    if (!userData) {
      await logAdmin('toggle_status', `切换用户状态失败：用户 ${userId} 不存在`, currentUser.userId, currentUser.username, ip, false, '用户不存在');
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = JSON.parse(userData);

    // 禁止禁用站长
    if (user.role === 'owner') {
      throw createError('Cannot toggle owner user status', 403, 'FORBIDDEN');
    }

    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    user.status = newStatus;
    user.updatedAt = Date.now();

    await redisClient.hSet('boxsync:users', userId, JSON.stringify(user));

    await logAdmin('toggle_status', `管理员 ${currentUser.username} ${newStatus === 'active' ? '启用' : '禁用'}用户 ${user.username}`, currentUser.userId, currentUser.username, ip, true);

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
router.delete('/:userId', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const currentUser = req.user!;

  try {
    const redisClient = getRedisClient();
    const userId = req.params.userId as string;

    const userData = await redisClient.hGet('boxsync:users', userId);
    if (!userData) {
      await logAdmin('delete_user', `删除用户失败：用户 ${userId} 不存在`, currentUser.userId, currentUser.username, ip, false, '用户不存在');
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = JSON.parse(userData);

    // 禁止删除站长
    if (user.role === 'owner') {
      throw createError('Cannot delete owner user', 403, 'FORBIDDEN');
    }

    const deletedUsername = user.username;

    await redisClient.hDel('boxsync:users', userId);
    await redisClient.hDel('boxsync:partitions', userId);

    // Clean up user data
    const keys = await redisClient.keys(`boxsync:data:${userId}:*`);
    if (keys.length > 0) {
      for (const key of keys) {
        await redisClient.del(key);
      }
    }

    await logAdmin('delete_user', `管理员 ${currentUser.username} 删除用户 ${deletedUsername}`, currentUser.userId, currentUser.username, ip, true);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Create or update user storage partition
router.post('/:userId/partition', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const redisClient = getRedisClient();
    const userId = req.params.userId as string;
    const currentUser = req.user!;

    if (currentUser.role !== 'admin' && currentUser.userId !== userId) {
      throw createError('Access denied', 403, 'FORBIDDEN');
    }

    const { username } = req.body;
    const partitionData = await redisClient.hGet('boxsync:partitions', userId);

    if (partitionData) {
      const partition = JSON.parse(partitionData);
      if (username) partition.username = username;
      partition.updatedAt = Date.now();
      await redisClient.hSet('boxsync:partitions', userId, JSON.stringify(partition));
      res.json({ success: true, message: 'Partition updated', partition });
    } else {
      const newPartition = {
        userId,
        username: username || userId,
        appPartitions: [],
        createdAt: Date.now(),
      };
      await redisClient.hSet('boxsync:partitions', userId, JSON.stringify(newPartition));
      res.json({ success: true, message: 'Partition created', partition: newPartition });
    }
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
