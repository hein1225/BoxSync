import { create } from 'zustand';
import type { User } from '@/types';

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  addUser: (user: { username: string; password: string; role: 'admin' | 'user' }) => Promise<boolean>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  toggleStatus: (userId: string) => Promise<boolean>;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    try {
      set({ loading: true, error: null });
      const token = localStorage.getItem('boxsync_token');
      const response = await fetch('/api/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.users) {
          set({ users: data.users, loading: false });
        }
      } else {
        set({ error: 'Failed to fetch users', loading: false });
      }
    } catch (e) {
      set({ error: 'Network error', loading: false });
    }
  },

  addUser: async (userData) => {
    try {
      const token = localStorage.getItem('boxsync_token');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  updateUser: async (userId, updates) => {
    try {
      const token = localStorage.getItem('boxsync_token');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteUser: async (userId) => {
    try {
      const token = localStorage.getItem('boxsync_token');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  toggleStatus: async (userId) => {
    try {
      const token = localStorage.getItem('boxsync_token');
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
