import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { formatDate } from '../core/i18n.ts';
import { BackupError, parseBackup, type CollectedDisplay, type Language } from '../core/storage.ts';
import {
  catName,
  categoryColor,
  collectibles,
  corruptBackups,
  downloadBackup,
  liveBusy,
  loadGameStrings,
  meta,
  refreshLive,
  resetProgress,
  restoreBackup,
  settings,
  storageIsPersistent,
  t,
  toast,
  updateSettings,
} from '../state/store.ts';
import { Icon, Section, Switch, confirmAction } from './common.tsx';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export const installPrompt = signal<BeforeInstallPromptEvent | null>(null);
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt.value = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => (installPrompt.value = null));
}

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} Mo`;
  return `${(n / 1024 ** 3).toFixed(1)} Go`;
}

export function SettingsPanel() {
  const tr = t.value;
  const s = settings.value;
  const data = collectibles.value;
  const fileRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    const sm = navigator.storage;
    if (!sm) return;
    sm.persisted?.().then(setPersisted).catch(() => {});
    sm.estimate?.()
      .then((e) => e.usage !== undefined && e.quota !== undefined && setUsage({ used: e.usage, quota: e.quota }))
      .catch(() => {});
  }, []);

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches;

  const onImport = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      restoreBackup(backup);
      await loadGameStrings(backup.settings.language);
      toast(tr('settings.importDone'), 'success');
    } catch (err) {
      toast(err instanceof BackupError ? tr('settings.importError') : String(err), 'error');
    }
  };

  const reset = async (kind: 'collected' | 'inventory' | 'all') => {
    if (await confirmAction(tr('settings.confirmReset'))) {
      resetProgress(kind);
      toast(tr('settings.done'), 'success');
    }
  };

  const m = meta.value;

  return (
    <div class="settings">
      {!standalone && (
        <Section title={tr('settings.install')}>
          {installPrompt.value ? (
            <button
              type="button"
              class="btn btn-primary"
              onClick={async () => {
                const p = installPrompt.value;
                if (!p) return;
                await p.prompt();
                await p.userChoice;
                installPrompt.value = null;
              }}
            >
              <Icon name="download" size={16} /> {tr('settings.install')}
            </button>
          ) : (
            <p class="muted small">{isIos ? tr('settings.installIos') : tr('settings.installOther')}</p>
          )}
        </Section>
      )}

      <Section title={tr('settings.language')}>
        <div class="segmented" role="radiogroup" aria-label={tr('settings.language')}>
          {(['fr', 'en'] as Language[]).map((l) => (
            <label key={l} class={s.language === l ? 'is-checked' : ''}>
              <input
                type="radio"
                name="lang"
                checked={s.language === l}
                onChange={() => {
                  updateSettings({ language: l });
                  document.documentElement.lang = l;
                  void loadGameStrings(l);
                }}
              />
              <span>{l === 'fr' ? 'Français' : 'English'}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title={tr('settings.display')}>
        <label class="field">
          <span>
            {tr('settings.markerSize')} <output>{Math.round(s.markerSize * 100)}%</output>
          </span>
          <input type="range" min={0.6} max={1.8} step={0.1} value={s.markerSize} onInput={(e) => updateSettings({ markerSize: Number(e.currentTarget.value) })} />
        </label>
        <label class="field">
          <span>
            {tr('settings.markerOpacity')} <output>{Math.round(s.markerOpacity * 100)}%</output>
          </span>
          <input type="range" min={0.2} max={1} step={0.05} value={s.markerOpacity} onInput={(e) => updateSettings({ markerOpacity: Number(e.currentTarget.value) })} />
        </label>
        <label class="field">
          <span>{tr('settings.collectedDisplay')}</span>
          <select value={s.collectedDisplay} onChange={(e) => updateSettings({ collectedDisplay: e.currentTarget.value as CollectedDisplay })}>
            <option value="fade">{tr('settings.collectedDisplay.fade')}</option>
            <option value="hide">{tr('settings.collectedDisplay.hide')}</option>
          </select>
        </label>
        <Switch id="set-badges" label={tr('settings.toolBadges')} checked={s.showToolBadges} onChange={(v) => updateSettings({ showToolBadges: v })} />
        <Switch id="set-motion" label={tr('settings.reducedMotion')} checked={s.reducedMotion} onChange={(v) => updateSettings({ reducedMotion: v })} />
        <details class="colors">
          <summary>{tr('settings.categoryColors')}</summary>
          <div class="color-grid">
            {data?.categories.map((c) => (
              <label key={c.id}>
                <input
                  type="color"
                  value={categoryColor(c.id)}
                  onChange={(e) => updateSettings({ categoryColors: { ...s.categoryColors, [c.id]: e.currentTarget.value } })}
                />
                <span>{catName(c.id)}</span>
              </label>
            ))}
          </div>
          {Object.keys(s.categoryColors).length > 0 && (
            <button type="button" class="btn btn-small" onClick={() => updateSettings({ categoryColors: {} })}>
              {tr('settings.resetColors')}
            </button>
          )}
        </details>
      </Section>

      <Section title={tr('settings.progress')}>
        <Switch id="set-daily" label={tr('settings.resetDaily')} checked={s.resetCollectedDaily} onChange={(v) => updateSettings({ resetCollectedDaily: v })} />
        <Switch id="set-autoinv" label={tr('settings.autoInventory')} checked={s.autoInventory} onChange={(v) => updateSettings({ autoInventory: v })} />
        <label class="field">
          <span>{tr('settings.stackSize')}</span>
          <input
            type="number"
            min={1}
            max={99}
            value={s.stackSize}
            onChange={(e) => {
              const v = Math.round(Number(e.currentTarget.value));
              if (v >= 1 && v <= 99) updateSettings({ stackSize: v });
            }}
          />
        </label>
      </Section>

      <Section title={tr('settings.data')}>
        <Switch id="set-live" label={tr('settings.liveData')} hint={tr('settings.liveDataHint')} checked={s.liveData} onChange={(v) => updateSettings({ liveData: v })} />
        {s.liveData && (
          <button type="button" class="btn btn-small" disabled={liveBusy.value} onClick={() => void refreshLive(true)}>
            <Icon name="refresh" size={16} /> {tr('settings.refresh')}
          </button>
        )}
        {m && (
          <p class="muted small">
            {tr('settings.dataVersion', { commit: m.upstreamCommit.slice(0, 7), date: formatDate(m.syncedAt.slice(0, 10), s.language, { day: 'numeric', month: 'short', year: 'numeric' }) })}
          </p>
        )}
      </Section>

      <Section title={tr('settings.backup')}>
        <div class="row-actions">
          <button type="button" class="btn btn-small" onClick={() => downloadBackup()}>
            <Icon name="download" size={16} /> {tr('settings.export')}
          </button>
          <button type="button" class="btn btn-small" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> {tr('settings.import')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="import-file"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void onImport(f);
              e.currentTarget.value = '';
            }}
          />
        </div>
      </Section>

      <Section title={tr('settings.storage')}>
        <p class="muted small">
          {!storageIsPersistent ? tr('settings.storageMemory') : persisted ? tr('settings.storagePersistent') : tr('settings.storageBestEffort')}
        </p>
        {usage && <p class="muted small">{tr('settings.storageUsage', { used: formatBytes(usage.used), quota: formatBytes(usage.quota) })}</p>}
        {corruptBackups.value.length > 0 && <p class="notice notice-warning">{tr('settings.corruptBackups', { n: corruptBackups.value.length })}</p>}
      </Section>

      <Section title={tr('settings.danger')}>
        <div class="row-actions column">
          <button type="button" class="btn btn-small btn-ghost-danger" onClick={() => void reset('collected')}>
            {tr('settings.resetCollected')}
          </button>
          <button type="button" class="btn btn-small btn-ghost-danger" onClick={() => void reset('inventory')}>
            {tr('settings.resetInventory')}
          </button>
          <button type="button" class="btn btn-small btn-danger" onClick={() => void reset('all')}>
            <Icon name="trash" size={16} /> {tr('settings.resetAll')}
          </button>
        </div>
      </Section>

      <Section title={tr('settings.about')}>
        <p class="small">{tr('settings.aboutText')}</p>
        <p class="muted small">{tr('settings.shortcuts')}</p>
        <p class="muted small">{tr('settings.version', { v: __APP_VERSION__ })}</p>
      </Section>
    </div>
  );
}
