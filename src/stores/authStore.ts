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
}

const authConfig = loadAuthConfig();

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('boxsync_token'),
  isAuthenticated: !!localStorage.getItem('boxsync_token'),
  showPasswordChangeModal: false,

  login: async (username: string, password: string) => {
    if (username === authConfig.username && password === authConfig.password) {
      const demoToken = 'demo-jwt-token-' + Date.now();
      localStorage.setItem('boxsync_token', demoToken);
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
    set({ token: null, isAuthenticated: false, showPasswordChangeModal: false });
  },

  dismissPasswordChange: () => {
    set({ showPasswordChangeModal: false });
  },

  updateCredentials: (username: string, password: string) => {
    saveAuthConfig({ username, password });
  },
}));
