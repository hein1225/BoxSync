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
  sessionTimeout: number;
}

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
  sessionTimeout: 30,
};

interface SettingsState {
  settings: ServerSettings;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (partial: Partial<ServerSettings>) => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
  exportSettings: () => string;
  importSettings: (json: string) => Promise<boolean>;
}

function getToken(): string | null {
  return localStorage.getItem('boxsync_token');
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...defaultSettings },
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const response = await fetch('/api/settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          set({ settings: { ...defaultSettings, ...data.settings }, loading: false });
          return;
        }
      }
      set({ loading: false });
    } catch (e) {
      console.error('Failed to fetch settings:', e);
      set({ loading: false, error: '获取设置失败' });
    }
  },

  updateSettings: async (partial) => {
    try {
      const token = getToken();
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(partial),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          set({ settings: { ...get().settings, ...data.settings } });
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Failed to update settings:', e);
      return false;
    }
  },

  resetSettings: async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          set({ settings: { ...data.settings } });
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Failed to reset settings:', e);
      return false;
    }
  },

  exportSettings: () => {
    return JSON.stringify(get().settings, null, 2);
  },

  importSettings: async (json) => {
    try {
      const parsed = JSON.parse(json);
      const merged = { ...defaultSettings, ...parsed };
      const token = getToken();
      const response = await fetch('/api/settings/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: merged }),
      });
      if (response.ok) {
        set({ settings: merged });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
