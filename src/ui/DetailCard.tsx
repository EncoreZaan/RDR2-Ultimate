import { useEffect, useRef } from 'preact/hooks';
import { markerDescription, markerHint } from '../core/describe.ts';
import {
  catName,
  categoryColor,
  changeInventory,
  gameStrings,
  isViewingToday,
  markerById,
  markerIsCollected,
  nameOfMarker,
  pinsDoc,
  progress,
  selectedMarkerId,
  selectedPinId,
  settings,
  t,
  toast,
  toggleMarker,
  weeklyItems,
} from '../state/store.ts';
import { Glyph, Icon, IconButton } from './common.tsx';
import { pinEditing } from './PinEditor.tsx';

export function DetailCard() {
  const id = selectedMarkerId.value;
  const pinId = selectedPinId.value;
  const ref = useRef<HTMLDivElement>(null);
  const tr = t.value;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (selectedMarkerId.value || selectedPinId.value)) {
        selectedMarkerId.value = null;
        selectedPinId.value = null;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pin = pinId ? pinsDoc.value.pins.find((p) => p.id === pinId) : null;
  if (pin) {
    return (
      <div class="detail-card" ref={ref} role="dialog" aria-labelledby="detail-title" style={{ '--c': pin.color }}>
        <header class="detail-head">
          <span class="detail-icon">
            <Glyph name="pin" size={20} />
          </span>
          <div class="detail-titles">
            <h2 id="detail-title">{pin.title || tr('pin.defaultTitle')}</h2>
            <span class="detail-sub">{tr('search.kind.pin')}</span>
          </div>
          <IconButton icon="close" label={tr('marker.close')} onClick={() => (selectedPinId.value = null)} />
        </header>
        {pin.note && <p class="detail-desc">{pin.note}</p>}
        <p class="muted small">
          {tr('marker.coords')} : {pin.lat.toFixed(2)}, {pin.lng.toFixed(2)}
        </p>
        <div class="detail-actions">
          <button type="button" class="btn btn-small" onClick={() => (pinEditing.value = pin.id)}>
            <Icon name="edit" size={16} /> {tr('pin.edit')}
          </button>
        </div>
      </div>
    );
  }

  const m = id ? markerById.value.get(id) : null;
  if (!m) return null;
  void progress.value;
  const g = gameStrings.value;
  const collected = markerIsCollected(m.id);
  const desc = markerDescription(g, m);
  const hint = markerHint(g, m);
  const isWeekly = m.itemId !== null && weeklyItems.value.has(m.itemId);
  const inv = m.itemId ? (progress.value.inventory[m.itemId] ?? 0) : null;

  const copyLink = async () => {
    const url = `${location.origin}${location.pathname}#m=${encodeURIComponent(m.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(tr('marker.linkCopied'), 'success');
    } catch {
      history.replaceState(null, '', `#m=${encodeURIComponent(m.id)}`);
    }
  };

  return (
    <div class={`detail-card ${collected ? 'is-collected' : ''}`} ref={ref} role="dialog" aria-labelledby="detail-title" style={{ '--c': categoryColor(m.category) }}>
      <header class="detail-head">
        <span class="detail-icon">
          <Glyph name={m.category} size={20} />
        </span>
        <div class="detail-titles">
          <h2 id="detail-title">{nameOfMarker(m)}</h2>
          <span class="detail-sub">
            {catName(m.category)} · {tr('collection.cycle', { n: m.cycle })}
          </span>
        </div>
        <IconButton icon="close" label={tr('marker.close')} onClick={() => (selectedMarkerId.value = null)} />
      </header>
      <ul class="detail-tags">
        {isWeekly && <li class="tag tag-gold">★ {tr('marker.weekly')}</li>}
        {m.tool > 0 && (
          <li class="tag">
            <Glyph name={m.tool === 1 ? 'shovel' : 'detector'} size={14} /> {tr(m.tool === 1 ? 'marker.tool.1' : 'marker.tool.2')}
          </li>
        )}
        {m.height !== 0 && <li class="tag">{m.height === 1 ? '▲' : '▼'} {tr(m.height === 1 ? 'marker.height.1' : 'marker.height.-1')}</li>}
      </ul>
      {desc && <p class="detail-desc">{desc}</p>}
      {hint && <p class="detail-hint muted small">{hint}</p>}
      {m.itemId && inv !== null && (
        <div class="detail-inv">
          <span>{tr('marker.inInventory')}</span>
          <span class="stepper">
            <IconButton icon="minus" size={14} class="icon-btn-small" label={tr('collection.decrease', { name: nameOfMarker(m) })} disabled={inv <= 0} onClick={() => changeInventory(m.itemId!, -1)} />
            <output aria-live="polite">{inv}</output>
            <IconButton icon="plus" size={14} class="icon-btn-small" label={tr('collection.increase', { name: nameOfMarker(m) })} disabled={inv >= settings.value.stackSize} onClick={() => changeInventory(m.itemId!, 1)} />
          </span>
        </div>
      )}
      <div class="detail-actions">
        <button type="button" class={`btn ${collected ? '' : 'btn-primary'} btn-collect`} aria-pressed={collected} disabled={!isViewingToday.value} onClick={() => toggleMarker(m)}>
          <Icon name="check" size={18} /> {collected ? tr('marker.unmarkCollected') : tr('marker.markCollected')}
        </button>
        {m.video && (
          <a class="btn btn-small" href={m.video} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={16} /> {tr('marker.video')}
          </a>
        )}
        <IconButton icon="link" label={tr('marker.copyLink')} onClick={() => void copyLink()} />
      </div>
    </div>
  );
}
