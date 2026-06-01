import { create } from 'zustand';
import type { UserStoragePartition, AppPartition } from '@/types';

interface UserPartitionsState {
  partitions: UserStoragePartition[];
  loading: boolean;
  error: string | null;
  fetchPartitions: () => Promise<void>;
  createPartition: (userId: string, username: string) => void;
  addAppPartition: (userId: string, appId: string, appName: string) => void;
  updateAppPartition: (userId: string, appId: string, updates: Partial<AppPartition>) => void;
  deletePartition: (userId: string) => void;
  getPartitionByUserId: (userId: string) => UserStoragePartition | undefined;
}

function getToken(): string | null {
  return localStorage.getItem('boxsync_token');
}

export const useUserPartitionsStore = create<UserPartitionsState>((set, get) => ({
  partitions: [],
  loading: false,
  error: null,

  fetchPartitions: async () => {
    try {
      set({ loading: true, error: null });
      const token = getToken();
      const response = await fetch('/api/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.users) {
          // Build partitions from users data
          const partitions: UserStoragePartition[] = data.users.map((user: any) => ({
            userId: user.userId,
            username: user.username,
            appPartitions: [],
            createdAt: user.createdAt,
          }));
          set({ partitions, loading: false });
        }
      } else {
        set({ error: 'Failed to fetch partitions', loading: false });
      }
    } catch (e) {
      set({ error: 'Network error', loading: false });
    }
  },

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
    set({ partitions: [...state.partitions, newPartition] });
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
    set({ partitions: updated });
  },

  deletePartition: (userId) => {
    const state = get();
    const updated = state.partitions.filter((p) => p.userId !== userId);
    set({ partitions: updated });
  },

  getPartitionByUserId: (userId) => {
    return get().partitions.find((p) => p.userId === userId);
  },
}));
