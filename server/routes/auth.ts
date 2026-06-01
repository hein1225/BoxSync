import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getRedisClient } from '../db.js';
import { generateToken } from '../middleware/auth.js';
import { createError } from '../middleware/error.js';

const router = Router();
const ADMIN_KEY = 'boxsync:admin';
const SESSION_PREFIX = 'boxsync:session:';

// Initialize default admin - called after Redis is connected
export async function initAdmin() {
  try {
    const redisClient = getRedisClient();
    const exists = await redisClient.exists(ADMIN_KEY);
    if (!exists) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(password, 10);
      await redisClient.hSet(ADMIN_KEY, {
        userId: 'admin',
        username,
        password: hashedPassword,
        role: 'admin',
        createdAt: Date.now().toString(),
        updatedAt: Date.now().toString(),
        status: 'active',
        isDefault: 'true',
      });
      console.log(`Default admin created: ${username}`);
    }
  } catch (error) {
    console.error('Failed to init admin:', error);
  }
}

// Login
router.post('/login', async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const { username, password } = req.body;
    if (!username || !password) {
      throw createError('Username and password are required', 400, 'INVALID_INPUT');
    }

    // Check admin first
    const adminData = await redisClient.hGetAll(ADMIN_KEY);
    if (adminData.username === username) {
      const valid = await bcrypt.compare(password, adminData.password);
      if (!valid) {
        throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      const token = generateToken(adminData.userId, adminData.username, adminData.role);
      await redisClient.setEx(`${SESSION_PREFIX}${token}`, 604800, JSON.stringify({
        userId: adminData.userId,
        username: adminData.username,
        role: adminData.role,
      }));

      res.json({
        success: true,
        token,
        userId: adminData.userId,
        username: adminData.username,
        role: adminData.role,
        isDefault: adminData.isDefault === 'true',
      });
      return;
    }

    // Check regular users
    const usersData = await redisClient.hGetAll('boxsync:users');
    const users = Object.values(usersData).map((u) => JSON.parse(u));
    const user = users.find((u) => u.username === username);

    if (!user || user.status === 'disabled') {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken(user.userId, user.username, user.role);
    await redisClient.setEx(`${SESSION_PREFIX}${token}`, 604800, JSON.stringify({
      userId: user.userId,
      username: user.username,
      role: user.role,
    }));

    res.json({
      success: true,
      token,
      userId: user.userId,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
});

// Register
router.post('/register', async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const { username, password } = req.body;
    if (!username || !password) {
      throw createError('Username and password are required', 400, 'INVALID_INPUT');
    }

    // Check if registration is allowed
    const settingsData = await redisClient.get('boxsync:settings');
    const settings = settingsData ? JSON.parse(settingsData) : { allowRegistration: false };
    if (!settings.allowRegistration) {
      throw createError('Registration is disabled', 403, 'REGISTRATION_DISABLED');
    }

    // Check if username exists
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
      role: 'user',
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
      message: 'User registered successfully',
      userId,
      username,
    });
  } catch (error) {
    next(error);
  }
});

// Logout - invalidate session
router.post('/logout', async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await redisClient.del(`${SESSION_PREFIX}${token}`);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Update admin credentials
router.post('/update-credentials', async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    const { username, password } = req.body;
    if (!username || !password) {
      throw createError('Username and password are required', 400, 'INVALID_INPUT');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await redisClient.hSet(ADMIN_KEY, {
      username,
      password: hashedPassword,
      updatedAt: Date.now().toString(),
      isDefault: 'false',
    });

    res.json({
      success: true,
      message: 'Credentials updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
