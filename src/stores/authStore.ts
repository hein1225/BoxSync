import { create } from 'zustand';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  showPasswordChangeModal: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  dismissPasswordChange: () => void;
  checkSessionTimeout: () => boolean;
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

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('boxsync_token'),
  isAuthenticated: !!localStorage.getItem('boxsync_token'),
  showPasswordChangeModal: false,

  login: async (username: string, password: string) => {
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
        set({
          token: data.token,
          isAuthenticated: true,
          showPasswordChangeModal: data.isDefault === true,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  logout: () => {
    // Optionally call backend to invalidate session
    const token = localStorage.getItem('boxsync_token');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // ignore
      });
    }
    localStorage.removeItem('boxsync_token');
    clearSession();
    set({ token: null, isAuthenticated: false, showPasswordChangeModal: false });
  },

  dismissPasswordChange: () => {
    set({ showPasswordChangeModal: false });
  },

  checkSessionTimeout: () => {
    const sessionTime = getSessionTime();
    if (!sessionTime) return true;

    // Use default timeout since settings are now server-side
    const timeoutMinutes = 30;
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
