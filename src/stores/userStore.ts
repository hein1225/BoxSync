import { create } from 'zustand';
import type { User } from '@/types';

const USERS_STORAGE_KEY = 'boxsync_users';

const defaultUsers: User[] = [
  {
    userId: 'user-001',
    username: 'admin',
    role: 'admin',
    createdAt: 1717000000000,
    updatedAt: 1717000000000,
    status: 'active',
  },
];

function loadUsers(): User[] {
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return [...defaultUsers];
}

function saveUsers(users: User[]) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('save users failed:', e);
  }
}

interface UserState {
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  toggleStatus: (userId: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: loadUsers(),

  setUsers: (users) => {
    saveUsers(users);
    set({ users });
  },

  addUser: (user) => {
    set((state) => {
      const updated = [...state.users, user];
      saveUsers(updated);
      return { users: updated };
    });
  },

  updateUser: (userId, updates) => {
    set((state) => {
      const updated = state.users.map((u) =>
        u.userId === userId ? { ...u, ...updates, updatedAt: Date.now() } : u
      );
      saveUsers(updated);
      return { users: updated };
    });
  },

  deleteUser: (userId) => {
    set((state) => {
      const updated = state.users.filter((u) => u.userId !== userId);
      saveUsers(updated);
      return { users: updated };
    });
  },

  toggleStatus: (userId) => {
    set((state) => {
      const updated = state.users.map((u) =>
        u.userId === userId
          ? { ...u, status: u.status === 'active' ? 'disabled' : 'active' as 'active' | 'disabled' }
          : u
      );
      saveUsers(updated);
      return { users: updated };
    });
  },
}));
