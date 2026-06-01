import express from 'express';
import jwt from 'jsonwebtoken';
import { getRedisClient } from '../db.js';
import { createError } from './error.js';

const JWT_SECRET = process.env.JWT_SECRET || 'boxsync-secret-key-change-in-production';
const SESSION_PREFIX = 'boxsync:session:';

export interface AuthRequest extends express.Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

export function generateToken(userId: string, username: string, role: string): string {
  return jwt.sign({ userId, username, role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; username: string; role: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: string };
}

export async function authMiddleware(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Check if session exists in Redis
    const redisClient = getRedisClient();
    const sessionData = await redisClient.get(`${SESSION_PREFIX}${token}`);
    if (!sessionData) {
      throw createError('Session expired or logged out', 401, 'SESSION_EXPIRED');
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(createError('Invalid or expired token', 401, 'UNAUTHORIZED'));
  }
}

export function adminMiddleware(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    next(createError('Admin access required', 403, 'FORBIDDEN'));
    return;
  }
  next();
}
