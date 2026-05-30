import { create } from 'zustand';

export interface ServerSettings {
  serverName: string;
  serverPort: number;
  logRetentionDays: number;
  logMaxCount: number;
  autoCleanupEnabled: boolean;
  cleanupTime: string;
  maxUsers: number;
  maxDataPerUser: number;
  requireAuth: boolean;
  allowRegistration: boolean;
}

const STORAGE_KEY = 'boxsync_server_settings';

const defaultSettings: ServerSettings = {
  serverName: 'BoxSync',
  serverPort: 9390,
  logRetentionDays: 30,
  logMaxCount: 50000,
  autoCleanupEnabled: true,
  cleanupTime: '02:00',
  maxUsers: 100,
  maxDataPerUser: 100,
  requireAuth: true,
  allowRegistration: false,
};

function loadSettings(): ServerSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch {
    // ignore parse error
  }
  return { ...defaultSettings };
}

interface SettingsState {
  settings: ServerSettings;
  updateSettings: (partial: Partial<ServerSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: loadSettings(),

  updateSettings: (partial) => {
    set((state) => {
      const updated = { ...state.settings, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('localStorage save failed:', e);
      }
      return { settings: updated };
    });
  },

  resetSettings: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
    set({ settings: { ...defaultSettings } });
  },

  exportSettings: () => {
    return JSON.stringify(get().settings, null, 2);
  },

  importSettings: (json) => {
    try {
      const parsed = JSON.parse(json);
      const merged = { ...defaultSettings, ...parsed };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      set({ settings: merged });
      return true;
    } catch {
      return false;
    }
  },
}));
