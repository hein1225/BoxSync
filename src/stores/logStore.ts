import { create } from 'zustand';
import type { LogEntry } from '@/types';

interface LogState {
  logs: LogEntry[];
  loading: boolean;
  error: string | null;
  fetchLogs: () => Promise<void>;
  setLogs: (logs: LogEntry[]) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => Promise<boolean>;
}

function getToken(): string | null {
  return localStorage.getItem('boxsync_token');
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  loading: false,
  error: null,

  fetchLogs: async () => {
    try {
      set({ loading: true, error: null });
      const token = getToken();
      const response = await fetch('/api/logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.logs) {
          set({ logs: data.logs, loading: false });
          return;
        }
      }
      set({ loading: false });
    } catch (e) {
      console.error('Failed to fetch logs:', e);
      set({ error: '获取日志失败', loading: false });
    }
  },

  setLogs: (logs) => {
    set({ logs });
  },

  addLog: (log) => {
    set((state) => ({
      logs: [log, ...state.logs],
    }));
  },

  clearLogs: async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/logs', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        set({ logs: [] });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to clear logs:', e);
      return false;
    }
  },
}));
