import { getRedisClient } from '../db.js';

const LOGS_KEY = 'boxsync:logs';
const LOG_MAX_COUNT = 50000;

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'auth' | 'sync' | 'admin' | 'system';
  action: string;
  userId: string;
  username: string;
  ip: string;
  device?: string;
  detail: string;
  success: boolean;
  errorMsg?: string;
}

export async function addLog(
  type: LogEntry['type'],
  action: string,
  detail: string,
  userId: string,
  username: string,
  ip: string,
  options: {
    success?: boolean;
    errorMsg?: string;
    device?: string;
  } = {}
): Promise<void> {
  try {
    const redisClient = getRedisClient();

    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
      type,
      action,
      userId,
      username,
      ip,
      device: options.device,
      detail,
      success: options.success ?? true,
      errorMsg: options.errorMsg,
    };

    await redisClient.lPush(LOGS_KEY, JSON.stringify(logEntry));
    await redisClient.lTrim(LOGS_KEY, 0, LOG_MAX_COUNT - 1);
  } catch (error) {
    console.error('Failed to add log:', error);
  }
}

// Helper functions for common log types
export async function logAuth(
  action: string,
  detail: string,
  userId: string,
  username: string,
  ip: string,
  success: boolean,
  errorMsg?: string
): Promise<void> {
  await addLog('auth', action, detail, userId, username, ip, { success, errorMsg });
}

export async function logAdmin(
  action: string,
  detail: string,
  userId: string,
  username: string,
  ip: string,
  success: boolean,
  errorMsg?: string
): Promise<void> {
  await addLog('admin', action, detail, userId, username, ip, { success, errorMsg });
}

export async function logSync(
  action: string,
  detail: string,
  userId: string,
  username: string,
  ip: string,
  success: boolean,
  device?: string,
  errorMsg?: string
): Promise<void> {
  await addLog('sync', action, detail, userId, username, ip, { success, device, errorMsg });
}

export async function logSystem(
  action: string,
  detail: string,
  ip: string = 'system',
  success: boolean = true
): Promise<void> {
  await addLog('system', action, detail, 'system', 'system', ip, { success });
}
