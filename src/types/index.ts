export interface User {
  userId: string;
  username: string;
  password?: string;
  role: 'owner' | 'admin' | 'user';
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'disabled';
}

export interface UserStoragePartition {
  userId: string;
  username: string;
  appPartitions: AppPartition[];
  createdAt: number;
}

export interface AppPartition {
  appId: string;
  appName: string;
  keyCount: number;
  memoryUsage: number;
  lastSyncTime: number;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'owner' | 'admin' | 'user';
}

export interface StorageStats {
  username: string;
  keyCount: number;
  memoryUsage: number;
  lastSyncTime: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'auth' | 'sync' | 'error' | 'admin';
  action: string;
  userId: string;
  username: string;
  ip: string;
  device?: string;
  detail: string;
  success: boolean;
  errorMsg?: string;
}

export interface ServerStats {
  onlineUsers: number;
  systemLoad: number;
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  diskUsed: number;
  diskTotal: number;
}

export interface FileTreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FileTreeNode[];
  color?: string;
}
