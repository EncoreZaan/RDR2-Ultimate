import { useState } from 'preact/hooks';
import type { Category } from '../data/types.ts';
import type { MarkerFilter } from '../core/storage.ts';
import {
  catName,
  categoryColor,
  changeInventory,
  collectibles,
  cycleMarkers,
  focusMarker,
  isViewingToday,
  markerIsCollected,
  nameOfItem,
  nameOfMarker,
  progress,
  resolved,
  setAllCategories,
  setCategoryCollected,
  settings,
  t,
  toggleCategory,
  toggleMarker,
  updateSettings,
  weeklyItems,
} from '../state/store.ts';
import { CyclePanel } from './CyclePanel.tsx';
import { Glyph, Icon, IconButton, ProgressBar } from './common.tsx';

export function CollectionPanel() {
  const tr = t.value;
  const data = collectibles.value;
  if (!data) return null;
  const s = settings.value;
  const hidden = new Set(s.hiddenCategories);
  void progress.value; // re-render on progress changes

  return (
    <div class="collection">
      <CyclePanel />
      <div class="toolbar">
        <label class="inline-field">
          <span>{tr('collection.filter')}</span>
          <select value={s.markerFilter} onChange={(e) => updateSettings({ markerFilter: e.currentTarget.value as MarkerFilter })}>
            <option value="all">{tr('collection.filter.all')}</option>
            <option value="weekly">{tr('collection.filter.weekly')}</option>
            <option value="missing">{tr('collection.filter.missing')}</option>
          </select>
        </label>
        <div class="toolbar-actions">
          <button type="button" class="btn btn-small" onClick={() => setAllCategories(true)}>
            {tr('collection.showAll')}
          </button>
          <button type="button" class="btn btn-small" onClick={() => setAllCategories(false)}>
            {tr('collection.hideAll')}
          </button>
        </div>
      </div>
      <ul class="category-list">
        {data.categories.map((c) => (
          <CategoryRow key={c.id} category={c} visible={!hidden.has(c.id)} />
        ))}
      </ul>
    </div>
  );
}

function CategoryRow({ category, visible }: { category: Category; visible: boolean }) {
  const tr = t.value;
  const [open, setOpen] = useState(false);
  const name = catName(category.id);
  const markers = cycleMarkers.value.filter((m) => m.category === category.id);
  const done = markers.filter((m) => markerIsCollected(m.id)).length;
  const cycle = resolved.value.cycles[category.cycleGroup];
  const color = categoryColor(category.id);
  const inv = progress.value.inventory;
  const canMark = isViewingToday.value;

  return (
    <li class={`category ${visible ? '' : 'is-off'}`} style={{ '--c': color }}>
      <div class="category-row">
        <button
          type="button"
          class="cat-toggle"
          aria-pressed={visible}
          aria-label={tr('collection.toggleCategory', { name })}
          title={tr('collection.toggleCategory', { name })}
          onClick={() => toggleCategory(category.id)}
        >
          <span class="cat-icon">
            <Glyph name={category.id} size={18} />
          </span>
        </button>
        <button type="button" class="cat-main" aria-expanded={open} aria-label={tr('collection.expand', { name })} onClick={() => setOpen(!open)}>
          <span class="cat-name">{name}</span>
          <span class="cat-meta">
            <span class="badge" title={tr('collection.cycle', { n: cycle })}>
              {tr('collection.cycle', { n: cycle })}
            </span>
            <span class={`cat-count ${markers.length > 0 && done === markers.length ? 'is-done' : ''}`}>
              {done}/{markers.length}
            </span>
          </span>
          <Icon name="chevronDown" size={16} />
        </button>
      </div>
      <ProgressBar value={done} max={markers.length} label={tr('collection.spotsToday', { done, total: markers.length })} />
      {open && (
        <div class="category-body">
          {markers.length > 0 && canMark && (
            <div class="row-actions">
              <button type="button" class="btn btn-small" onClick={() => setCategoryCollected(category.id, done < markers.length)}>
                {done < markers.length ? tr('collection.markAllCategory') : tr('collection.unmarkAllCategory')}
              </button>
            </div>
          )}
          {markers.length === 0 && <p class="muted small">{tr('collection.noMarkersToday')}</p>}
          <ul class="spot-list">
            {markers.map((m) => {
              const collected = markerIsCollected(m.id);
              const label = nameOfMarker(m);
              return (
                <li key={m.id} class={`spot ${collected ? 'is-collected' : ''} ${m.itemId && weeklyItems.value.has(m.itemId) ? 'is-weekly' : ''}`}>
                  <label class="check">
                    <input type="checkbox" checked={collected} disabled={!canMark} onChange={() => toggleMarker(m)} />
                    <span>{label}</span>
                  </label>
                  {m.itemId && <span class="qty" title={tr('marker.inInventory')}>×{inv[m.itemId] ?? 0}</span>}
                  <IconButton icon="target" size={16} class="icon-btn-small" label={`${tr('collection.locate')} — ${label}`} onClick={() => focusMarker(m)} />
                </li>
              );
            })}
          </ul>
          {category.itemIds.length > 0 && (
            <>
              <h4 class="subhead">{tr('collection.inventory')}</h4>
              <ul class="inventory-list">
                {category.itemIds.map((id) => {
                  const n = inv[id] ?? 0;
                  const itemLabel = nameOfItem(id);
                  return (
                    <li key={id} class={`${n > 0 ? 'has-item' : ''} ${weeklyItems.value.has(id) ? 'is-weekly' : ''}`}>
                      <span class="inv-name">{itemLabel}</span>
                      <span class="stepper">
                        <IconButton icon="minus" size={14} class="icon-btn-small" label={tr('collection.decrease', { name: itemLabel })} disabled={n <= 0} onClick={() => changeInventory(id, -1)} />
                        <output aria-live="polite">{n}</output>
                        <IconButton
                          icon="plus"
                          size={14}
                          class="icon-btn-small"
                          label={tr('collection.increase', { name: itemLabel })}
                          disabled={n >= settings.value.stackSize}
                          onClick={() => changeInventory(id, 1)}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </li>
  );
}
