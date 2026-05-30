import { create } from 'zustand';
import type { LogEntry } from '@/types';

const LOGS_STORAGE_KEY = 'boxsync_logs';

const defaultLogs: LogEntry[] = [];

function loadLogs(): LogEntry[] {
  try {
    const saved = localStorage.getItem(LOGS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return [...defaultLogs];
}

function saveLogs(logs: LogEntry[]) {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('save logs failed:', e);
  }
}

interface LogState {
  logs: LogEntry[];
  setLogs: (logs: LogEntry[]) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  logs: loadLogs(),

  setLogs: (logs) => {
    saveLogs(logs);
    set({ logs });
  },

  addLog: (log) => {
    set((state) => {
      const updated = [log, ...state.logs];
      saveLogs(updated);
      return { logs: updated };
    });
  },

  clearLogs: () => {
    saveLogs([]);
    set({ logs: [] });
  },
}));
