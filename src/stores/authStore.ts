import { create } from 'zustand';

const AUTH_STORAGE_KEY = 'boxsync_auth_config';

interface AuthConfig {
  username: string;
  password: string;
}

function getDefaultAuthConfig(): AuthConfig {
  const envUsername = import.meta.env.VITE_ADMIN_USERNAME;
  const envPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  if (envUsername && envPassword) {
    return { username: envUsername, password: envPassword };
  }

  return { username: 'admin', password: 'admin123' };
}

function loadAuthConfig(): AuthConfig {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return getDefaultAuthConfig();
}

function saveAuthConfig(config: AuthConfig) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('save auth config failed:', e);
  }
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  showPasswordChangeModal: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  dismissPasswordChange: () => void;
  updateCredentials: (username: string, password: string) => void;
  checkSessionTimeout: () => boolean;
}

function getCurrentAuthConfig(): AuthConfig {
  return loadAuthConfig();
}

const SESSION_KEY = 'boxsync_session_time';

function updateSessionTime() {
  localStorage.setItem(SESSION_KEY, String(Date.now()));
}

function getSessionTime(): number | null {
  const saved = localStorage.getItem(SESSION_KEY);
  return saved ? parseInt(saved, 10) : null;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function hasStoredData(): boolean {
  return !!(
    localStorage.getItem('boxsync_auth_config') ||
    localStorage.getItem('boxsync_server_settings') ||
    localStorage.getItem('boxsync_users')
  );
}

export const useAuthStore = create<AuthState>((set) => ({
  token: hasStoredData() ? localStorage.getItem('boxsync_token') : null,
  isAuthenticated: hasStoredData() ? !!localStorage.getItem('boxsync_token') : false,
  showPasswordChangeModal: false,

  login: async (username: string, password: string) => {
    const currentConfig = getCurrentAuthConfig();
    if (username === currentConfig.username && password === currentConfig.password) {
      const demoToken = 'demo-jwt-token-' + Date.now();
      localStorage.setItem('boxsync_token', demoToken);
      updateSessionTime();
      const isDefault = username === 'admin' && password === 'admin123';
      set({ token: demoToken, isAuthenticated: true, showPasswordChangeModal: isDefault });
      return true;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('boxsync_token', data.token);
        updateSessionTime();
        set({ token: data.token, isAuthenticated: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('boxsync_token');
    clearSession();
    set({ token: null, isAuthenticated: false, showPasswordChangeModal: false });
  },

  dismissPasswordChange: () => {
    set({ showPasswordChangeModal: false });
  },

  updateCredentials: (username: string, password: string) => {
    saveAuthConfig({ username, password });
  },

  checkSessionTimeout: () => {
    const sessionTime = getSessionTime();
    if (!sessionTime) return true;

    const settingsStr = localStorage.getItem('boxsync_server_settings');
    let timeoutMinutes = 30;
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        timeoutMinutes = settings.sessionTimeout ?? 30;
      } catch {
        // ignore
      }
    }

    const elapsed = Date.now() - sessionTime;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    if (elapsed > timeoutMs) {
      localStorage.removeItem('boxsync_token');
      clearSession();
      set({ token: null, isAuthenticated: false, showPasswordChangeModal: false });
      return false;
    }

    return true;
  },
}));
