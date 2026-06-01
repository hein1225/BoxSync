import { createClient, type RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface MemoryStore {
  strings: Map<string, string>;
  hashes: Map<string, Map<string, string>>;
  lists: Map<string, string[]>;
}

const memoryStore: MemoryStore = {
  strings: new Map(),
  hashes: new Map(),
  lists: new Map(),
};

class MemoryRedisClient {
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
    console.log('[MemoryDB] Connected (fallback mode)');
  }

  async quit(): Promise<void> {
    this.connected = false;
    console.log('[MemoryDB] Disconnected');
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    return memoryStore.strings.get(key) || null;
  }

  async set(key: string, value: string): Promise<string> {
    memoryStore.strings.set(key, value);
    return 'OK';
  }

  async setEx(key: string, seconds: number, value: string): Promise<string> {
    memoryStore.strings.set(key, value);
    setTimeout(() => memoryStore.strings.delete(key), seconds * 1000);
    return 'OK';
  }

  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    let count = 0;
    for (const k of keys) {
      if (memoryStore.strings.delete(k)) count++;
    }
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return Array.from(memoryStore.strings.keys()).filter((k) => regex.test(k));
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    const hash = memoryStore.hashes.get(key);
    if (!hash) return {};
    const result: Record<string, string> = {};
    hash.forEach((value, field) => {
      result[field] = value;
    });
    return result;
  }

  async hGet(key: string, field: string): Promise<string | null> {
    const hash = memoryStore.hashes.get(key);
    return hash?.get(field) || null;
  }

  async hSet(key: string, field: string, value: string): Promise<number>;
  async hSet(key: string, value: Record<string, string>): Promise<number>;
  async hSet(key: string, fieldOrValue: string | Record<string, string>, value?: string): Promise<number> {
    let hash = memoryStore.hashes.get(key);
    if (!hash) {
      hash = new Map();
      memoryStore.hashes.set(key, hash);
    }

    if (typeof fieldOrValue === 'string' && value !== undefined) {
      hash.set(fieldOrValue, value);
      return 1;
    } else if (typeof fieldOrValue === 'object') {
      let count = 0;
      for (const [field, val] of Object.entries(fieldOrValue)) {
        hash.set(field, val);
        count++;
      }
      return count;
    }
    return 0;
  }

  async hDel(key: string, field: string): Promise<number> {
    const hash = memoryStore.hashes.get(key);
    if (!hash) return 0;
    return hash.delete(field) ? 1 : 0;
  }

  async lPush(key: string, element: string): Promise<number> {
    let list = memoryStore.lists.get(key);
    if (!list) {
      list = [];
      memoryStore.lists.set(key, list);
    }
    list.unshift(element);
    return list.length;
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    const list = memoryStore.lists.get(key);
    if (!list) return [];
    const end = stop < 0 ? list.length : stop + 1;
    return list.slice(start, end);
  }

  async lTrim(key: string, start: number, stop: number): Promise<string> {
    const list = memoryStore.lists.get(key);
    if (list) {
      const end = stop < 0 ? list.length : stop + 1;
      memoryStore.lists.set(key, list.slice(start, end));
    }
    return 'OK';
  }

  async exists(key: string): Promise<number> {
    return memoryStore.strings.has(key) || memoryStore.hashes.has(key) || memoryStore.lists.has(key) ? 1 : 0;
  }

  on(_event: string, _listener: (...args: unknown[]) => void): void {
    // No-op for memory client
  }
}

export type UnifiedRedisClient = RedisClientType | MemoryRedisClient;

let redisClient: UnifiedRedisClient;
let isMemoryMode = false;

export async function initRedis(): Promise<UnifiedRedisClient> {
  // Check if running in Docker (Docker sets container-specific env vars)
  const isDocker = process.env.CONTAINER === 'true' || process.env.DOCKER_CONTAINER === 'true';

  // Try connecting to Redis with a timeout
  const connectPromise = new Promise<UnifiedRedisClient>(async (resolve, reject) => {
    const realClient = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: () => false,
      },
    });

    const timeout = setTimeout(() => {
      realClient.disconnect().catch(() => {});
      reject(new Error('Connection timeout'));
    }, 15000);

    realClient.on('error', () => {
      // Silently ignore errors, we'll handle them via connect/reject
    });

    try {
      await realClient.connect();
      const pingResult = await realClient.ping();
      clearTimeout(timeout);
      if (pingResult === 'PONG') {
        console.log('Redis connected successfully');
        resolve(realClient);
        return;
      }
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
      return;
    }
  });

  try {
    redisClient = await connectPromise;
    isMemoryMode = false;
    return redisClient;
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error('Redis connection failed:', errorMsg);

    // In Docker, Redis is required - do not fall back to memory mode
    if (isDocker) {
      console.error('[FATAL] Redis connection is required in Docker. Exiting.');
      process.exit(1);
    }

    console.warn('Falling back to memory mode - data will be lost on restart');
  }

  // Fallback to memory client (local development only)
  const memoryClient = new MemoryRedisClient();
  await memoryClient.connect();
  redisClient = memoryClient;
  isMemoryMode = true;
  return redisClient;
}

export function getRedisClient(): UnifiedRedisClient {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redisClient;
}

export function getIsMemoryMode(): boolean {
  return isMemoryMode;
}
