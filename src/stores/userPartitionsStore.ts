import { create } from 'zustand';
import type { UserStoragePartition, AppPartition } from '@/types';

const PARTITIONS_STORAGE_KEY = 'boxsync_user_partitions';

function loadPartitions(): UserStoragePartition[] {
  try {
    const saved = localStorage.getItem(PARTITIONS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return [];
}

function savePartitions(partitions: UserStoragePartition[]) {
  try {
    localStorage.setItem(PARTITIONS_STORAGE_KEY, JSON.stringify(partitions));
  } catch (e) {
    console.error('save partitions failed:', e);
  }
}

interface UserPartitionsState {
  partitions: UserStoragePartition[];
  createPartition: (userId: string, username: string) => void;
  addAppPartition: (userId: string, appId: string, appName: string) => void;
  updateAppPartition: (userId: string, appId: string, updates: Partial<AppPartition>) => void;
  deletePartition: (userId: string) => void;
  getPartitionByUserId: (userId: string) => UserStoragePartition | undefined;
}

export const useUserPartitionsStore = create<UserPartitionsState>((set, get) => ({
  partitions: loadPartitions(),

  createPartition: (userId, username) => {
    const state = get();
    const exists = state.partitions.find((p) => p.userId === userId);
    if (exists) return;

    const newPartition: UserStoragePartition = {
      userId,
      username,
      appPartitions: [],
      createdAt: Date.now(),
    };
    const updated = [...state.partitions, newPartition];
    savePartitions(updated);
    set({ partitions: updated });
  },

  addAppPartition: (userId, appId, appName) => {
    const state = get();
    const updated = state.partitions.map((p) => {
      if (p.userId !== userId) return p;
      const exists = p.appPartitions.find((a) => a.appId === appId);
      if (exists) return p;
      return {
        ...p,
        appPartitions: [
          ...p.appPartitions,
          {
            appId,
            appName,
            keyCount: 0,
            memoryUsage: 0,
            lastSyncTime: Date.now(),
          },
        ],
      };
    });
    savePartitions(updated);
    set({ partitions: updated });
  },

  updateAppPartition: (userId, appId, updates) => {
    const state = get();
    const updated = state.partitions.map((p) => {
      if (p.userId !== userId) return p;
      return {
        ...p,
        appPartitions: p.appPartitions.map((a) =>
          a.appId === appId ? { ...a, ...updates } : a
        ),
      };
    });
    savePartitions(updated);
    set({ partitions: updated });
  },

  deletePartition: (userId) => {
    const state = get();
    const updated = state.partitions.filter((p) => p.userId !== userId);
    savePartitions(updated);
    set({ partitions: updated });
  },

  getPartitionByUserId: (userId) => {
    return get().partitions.find((p) => p.userId === userId);
  },
}));
