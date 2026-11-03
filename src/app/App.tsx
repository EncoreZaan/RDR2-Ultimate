import { useEffect } from 'preact/hooks';
import { MapView } from '../map/MapView.tsx';
import {
  focusMarker,
  loadData,
  loadState,
  markerById,
  now,
  online,
  refreshLive,
  settings,
  t,
  toast,
  flushSettings,
} from '../state/store.ts';
import { ConfirmDialog } from '../ui/common.tsx';
import { DetailCard } from '../ui/DetailCard.tsx';
import { Header } from '../ui/Header.tsx';
import { MapControls } from '../ui/MapControls.tsx';
import { PinEditor } from '../ui/PinEditor.tsx';
import { Sidebar } from '../ui/Sidebar.tsx';
import { Toasts } from '../ui/Toasts.tsx';
import { PwaPrompt } from './PwaPrompt.tsx';

export function App() {
  useEffect(() => {
    void loadData();
    const tick = setInterval(() => (now.value = new Date()), 1000);
    const goOnline = () => {
      online.value = true;
      void refreshLive(true).then(() => toast(t.peek()('status.backOnline'), 'success'));
    };
    const goOffline = () => {
      online.value = false;
      toast(t.peek()('status.offlineHint'), 'warning');
    };
    const onHide = () => document.visibilityState === 'hidden' && flushSettings();
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    document.addEventListener('visibilitychange', onHide);
    // Ask the browser to keep our data (best effort, no prompt on most browsers).
    void navigator.storage?.persist?.().catch(() => {});
    return () => {
      clearInterval(tick);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = settings.value.language;
  }, [settings.value.language]);

  useEffect(() => {
    if (loadState.value !== 'ready') return;
    void refreshLive();
    const deep = /#m=([^&]+)/.exec(location.hash);
    const m = deep?.[1] ? markerById.value.get(decodeURIComponent(deep[1])) : undefined;
    if (m) focusMarker(m);
  }, [loadState.value]);

  const tr = t.value;
  const reduced = settings.value.reducedMotion;

  if (loadState.value === 'error') {
    return (
      <div class="splash" role="alert">
        <p>{tr('app.loadError')}</p>
        <button type="button" class="btn btn-primary" onClick={() => void loadData()}>
          {tr('app.retry')}
        </button>
      </div>
    );
  }

  return (
    <div class={`app ${reduced ? 'reduce-motion' : ''}`}>
      <a class="skip-link" href="#map">
        {tr('app.skip')}
      </a>
      <Header />
      <div class="layout">
        <Sidebar />
        <main class="stage">
          {loadState.value === 'ready' ? (
            <>
              <MapView />
              <MapControls />
              <DetailCard />
            </>
          ) : (
            <div class="splash" aria-busy="true">
              <div class="spinner" />
              <p>{tr('app.loading')}</p>
            </div>
          )}
        </main>
      </div>
      <PinEditor />
      <ConfirmDialog />
      <Toasts />
      <PwaPrompt />
    </div>
  );
}
