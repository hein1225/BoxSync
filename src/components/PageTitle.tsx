import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

export default function PageTitle() {
  const serverName = useSettingsStore((state) => state.settings.serverName);

  useEffect(() => {
    const title = serverName?.trim() || 'BoxSync';
    if (document.title !== title) {
      document.title = title;
    }
  }, [serverName]);

  return null;
}
