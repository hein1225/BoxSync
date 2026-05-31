import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function useSessionTimeout() {
  const checkSessionTimeout = useAuthStore((state) => state.checkSessionTimeout);

  useEffect(() => {
    const updateActivity = () => {
      const token = localStorage.getItem('boxsync_token');
      if (token) {
        localStorage.setItem('boxsync_session_time', String(Date.now()));
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    const interval = setInterval(() => {
      const token = localStorage.getItem('boxsync_token');
      if (token) {
        const isValid = checkSessionTimeout();
        if (!isValid) {
          window.location.href = '/admin/login';
        }
      }
    }, 60000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [checkSessionTimeout]);
}
