import { useEffect, useState } from 'preact/hooks';
import { isSafeTileTemplate, type BasemapId, type Overlays } from '../core/storage.ts';
import { planRouteFromCenter } from '../map/MapView.tsx';
import {
  deletePin,
  gameStrings,
  mapCommand,
  nazarLocation,
  nazarSource,
  pinsDoc,
  route,
  selectedMarkerId,
  selectedPinId,
  settings,
  t,
  toast,
  updateSettings,
  world,
} from '../state/store.ts';
import { Icon, IconButton, Section, Switch, confirmAction } from './common.tsx';

export const TILE_CACHE = 'rdr2u-tiles';

export function MapPanel() {
  const tr = t.value;
  const s = settings.value;
  const w = world.value;
  const g = gameStrings.value;
  const [customUrl, setCustomUrl] = useState(s.customTileUrl);
  const [tileCount, setTileCount] = useState<number | null>(null);
  const customValid = customUrl === '' || isSafeTileTemplate(customUrl);

  const refreshTileCount = async () => {
    if (!('caches' in window)) return;
    try {
      const cache = await caches.open(TILE_CACHE);
      setTileCount((await cache.keys()).length);
    } catch {
      setTileCount(null);
    }
  };
  useEffect(() => {
    void refreshTileCount();
  }, []);

  const setOverlay = (k: keyof Overlays, v: boolean) => updateSettings({ overlays: { ...s.overlays, [k]: v } });
  const bases: BasemapId[] = ['rockstar', 'schematic', 'custom'];
  /** Upstream only has short ids for Nazar spots: describe them by the nearest fast-travel town. */
  const nazarName = (id: string) => {
    const n = w?.nazar.find((x) => x.id === id);
    if (!n || !w) return id;
    let best = w.fastTravel[0];
    let bestD = Infinity;
    for (const f of w.fastTravel) {
      const d = Math.hypot(f.lat - n.lat, f.lng - n.lng);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    return best ? tr('map.nearTown', { town: g[`${best.id}.name`] ?? best.id }) : id;
  };

  return (
    <div class="map-panel">
      <Section title={tr('map.basemap')}>
        <div class="radio-list" role="radiogroup" aria-label={tr('map.basemap')}>
          {bases.map((b) => (
            <label key={b} class={`radio-card ${s.basemap === b ? 'is-checked' : ''}`}>
              <input type="radio" name="basemap" value={b} checked={s.basemap === b} onChange={() => updateSettings({ basemap: b })} />
              <span>{tr(`map.basemap.${b}`)}</span>
            </label>
          ))}
        </div>
        {s.basemap === 'custom' && (
          <label class="field">
            <span>{tr('map.customUrl')}</span>
            <input
              type="url"
              inputMode="url"
              value={customUrl}
              aria-invalid={!customValid}
              placeholder="https://…/{z}/{x}_{y}.webp"
              onInput={(e) => setCustomUrl(e.currentTarget.value.trim())}
              onChange={() => customValid && updateSettings({ customTileUrl: customUrl })}
            />
            <small class={customValid ? 'muted' : 'error-text'}>{customValid ? tr('map.customUrlHint') : tr('map.customUrlInvalid')}</small>
          </label>
        )}
        {tileCount !== null && (
          <div class="inline-info">
            <span class="muted small">
              {tr('map.cacheTiles')} : {tileCount}
            </span>
            <button
              type="button"
              class="btn btn-small"
              onClick={async () => {
                await caches.delete(TILE_CACHE);
                await refreshTileCount();
                toast(tr('map.tileCacheCleared'), 'success');
              }}
            >
              {tr('map.clearTileCache')}
            </button>
          </div>
        )}
      </Section>

      <Section title={tr('map.overlays')}>
        {(['fastTravel', 'nazar', 'treasures', 'legendary', 'roads', 'pins'] as const).map((k) => (
          <Switch key={k} id={`ov-${k}`} label={tr(`map.overlay.${k}`)} checked={s.overlays[k]} onChange={(v) => setOverlay(k, v)} />
        ))}
      </Section>

      <Section title={tr('map.nazar')}>
        <p class={`notice ${nazarSource.value === 'unknown' ? 'notice-warning' : ''}`}>
          {nazarSource.value === 'unknown' ? tr('map.nazarUnknown') : tr(`map.nazarSource.${nazarSource.value}`)}
        </p>
        <label class="field">
          <span>{tr('map.nazarChoose')}</span>
          <select value={s.nazarOverride ?? ''} onChange={(e) => updateSettings({ nazarOverride: e.currentTarget.value || null })}>
            <option value="">{tr('weekly.auto')}</option>
            {(w?.nazar ?? []).map((n, i) => (
              <option key={n.id} value={n.id}>
                {`#${i + 1} — ${nazarName(n.id)}`}
              </option>
            ))}
          </select>
        </label>
        {nazarLocation.value && (
          <button type="button" class="btn btn-small" onClick={() => (mapCommand.value = { type: 'fly', lat: nazarLocation.value!.lat, lng: nazarLocation.value!.lng, zoom: 5 })}>
            <Icon name="target" size={16} /> {tr('collection.locate')}
          </button>
        )}
      </Section>

      <Section title={tr('map.route')}>
        <p class="muted small">{tr('map.routeHint')}</p>
        <div class="row-actions">
          <button
            type="button"
            class="btn btn-small btn-primary"
            onClick={() => {
              const n = planRouteFromCenter();
              if (n === 0) toast(tr('map.routeEmpty'), 'info');
            }}
          >
            <Icon name="route" size={16} /> {tr('map.routePlan')}
          </button>
          {route.value && (
            <button type="button" class="btn btn-small" onClick={() => (route.value = null)}>
              {tr('map.routeClear')}
            </button>
          )}
        </div>
        {route.value && <p class="muted small">{tr('map.routeInfo', { n: route.value.length })}</p>}
      </Section>

      <Section
        title={tr('map.overlay.pins')}
        actions={
          pinsDoc.value.pins.length > 0 ? (
            <button
              type="button"
              class="btn btn-small btn-ghost-danger"
              onClick={async () => {
                if (await confirmAction(tr('pin.deleteAll') + ' ?')) pinsDoc.value = { pins: [] };
              }}
            >
              {tr('pin.deleteAll')}
            </button>
          ) : undefined
        }
      >
        <p class="muted small">{tr('map.locateHint')}</p>
        <ul class="pin-list">
          {pinsDoc.value.pins.map((p) => (
            <li key={p.id}>
              <span class="pin-dot" style={{ background: p.color }} aria-hidden="true" />
              <span class="pin-title">{p.title || tr('pin.defaultTitle')}</span>
              <IconButton
                icon="target"
                size={16}
                class="icon-btn-small"
                label={`${tr('collection.locate')} — ${p.title}`}
                onClick={() => {
                  selectedMarkerId.value = null;
                  selectedPinId.value = p.id;
                  mapCommand.value = { type: 'fly', lat: p.lat, lng: p.lng, zoom: 5 };
                }}
              />
              <IconButton icon="trash" size={16} class="icon-btn-small" label={`${tr('pin.delete')} — ${p.title}`} onClick={() => deletePin(p.id)} />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
