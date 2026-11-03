import { formatMoney } from '../core/i18n.ts';
import {
  collectibles,
  cycleMarkers,
  focusMarker,
  gameStrings,
  liveBusy,
  nameOfItem,
  progress,
  refreshLive,
  settings,
  t,
  updateSettings,
  weeklySet,
  weeklySource,
  world,
} from '../state/store.ts';
import { Icon, IconButton } from './common.tsx';

export function WeeklyPanel() {
  const tr = t.value;
  const w = world.value;
  const data = collectibles.value;
  if (!w || !data) return null;
  const set = weeklySet.value;
  const g = gameStrings.value;
  const lang = settings.value.language;
  const source = weeklySource.value;
  const inv = progress.value.inventory;
  const known = new Set(data.items.map((i) => i.id));
  const setName = (id: string) => g[`weekly.desc.${id}`] ?? id.replace(/^set_/, '').replace(/_/g, ' ');

  return (
    <div class="weekly">
      <header class="panel-hero">
        <h2>{tr('weekly.title')}</h2>
        <p class="muted small">{tr('weekly.desc')}</p>
      </header>
      <p class={`notice ${source === 'unknown' ? 'notice-warning' : ''}`}>{tr(`weekly.source.${source}`)}</p>
      {set && (
        <article class="weekly-card">
          <h3>{setName(set.id)}</h3>
          {g[`weekly.flavor.${set.id}`] && <p class="flavor">{g[`weekly.flavor.${set.id}`]}</p>}
          <ul class="weekly-items">
            {set.itemIds.map((id) => {
              const owned = inv[id] ?? 0;
              const mapped = known.has(id);
              const marker = cycleMarkers.value.find((m) => m.itemId === id);
              return (
                <li key={id} class={owned > 0 ? 'is-owned' : ''}>
                  <span class="weekly-check" aria-hidden="true">
                    {owned > 0 ? <Icon name="check" size={16} /> : null}
                  </span>
                  <span class="weekly-name">
                    {nameOfItem(id)}
                    {!mapped && <small class="muted"> · {tr('weekly.nonCollectible')}</small>}
                  </span>
                  {mapped && <span class="qty">×{owned}</span>}
                  {marker && <IconButton icon="target" size={16} class="icon-btn-small" label={`${tr('collection.locate')} — ${nameOfItem(id)}`} onClick={() => focusMarker(marker)} />}
                </li>
              );
            })}
          </ul>
          <p class="weekly-value">{tr('weekly.value', { value: formatMoney(set.value, lang) })}</p>
          <button type="button" class="btn btn-small" onClick={() => updateSettings({ markerFilter: 'weekly' })}>
            {tr('collection.filter.weekly')}
          </button>
        </article>
      )}
      <label class="field">
        <span>{tr('weekly.choose')}</span>
        <select value={settings.value.weeklySetOverride ?? ''} onChange={(e) => updateSettings({ weeklySetOverride: e.currentTarget.value || null })}>
          <option value="">{tr('weekly.auto')}</option>
          {[...w.weeklySets]
            .sort((a, b) => setName(a.id).localeCompare(setName(b.id)))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {setName(s.id)}
              </option>
            ))}
        </select>
      </label>
      {settings.value.liveData && (
        <button type="button" class="btn btn-small" disabled={liveBusy.value} onClick={() => void refreshLive(true)}>
          <Icon name="refresh" size={16} /> {tr('settings.refresh')}
        </button>
      )}
    </div>
  );
}
