import { useEffect } from 'preact/hooks';
import { useRegisterSW } from 'virtual:pwa-register/preact';
import { t, toast } from '../state/store.ts';

/** Registers the service worker and surfaces update / offline-ready states. */
export function PwaPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Check for a new version every hour and whenever the connection comes back.
      setInterval(() => void registration.update().catch(() => {}), 3_600_000);
      window.addEventListener('online', () => void registration.update().catch(() => {}));
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast(t.peek()('status.offlineReady'), 'success');
      setOfflineReady(false);
    }
  }, [offlineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast(t.peek()('status.updateReady'), 'info', {
      sticky: true,
      action: { label: t.peek()('status.reload'), run: () => void updateServiceWorker(true) },
    });
    setNeedRefresh(false);
  }, [needRefresh]);

  return null;
}
