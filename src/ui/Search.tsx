import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  activeTab,
  collectibles,
  cycleMarkers,
  focusMarker,
  mapCommand,
  pinsDoc,
  searchIndex,
  selectedMarkerId,
  selectedPinId,
  settings,
  sidebarOpen,
  t,
  updateSettings,
  type SearchHit,
} from '../state/store.ts';
import { Glyph, Icon } from './common.tsx';

export const searchInputId = 'global-search';

export function Search() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const tr = t.value;
  const results = useMemo(() => searchIndex.value.search(query, 12), [query, searchIndex.value]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const choose = (hit: SearchHit) => {
    setOpen(false);
    inputRef.current?.blur();
    if (hit.kind === 'item') {
      const markers = cycleMarkers.value.filter((m) => m.itemId === hit.itemId);
      const first = markers[0];
      if (first) {
        const cat = first.category;
        if (settings.value.hiddenCategories.includes(cat))
          updateSettings({ hiddenCategories: settings.value.hiddenCategories.filter((c) => c !== cat) });
        if (settings.value.markerFilter !== 'all') updateSettings({ markerFilter: 'all' });
        if (markers.length > 1) {
          selectedMarkerId.value = first.id;
          mapCommand.value = { type: 'fit', points: markers.map((m) => [m.lat, m.lng]) };
        } else focusMarker(first);
      } else {
        activeTab.value = 'collection';
        sidebarOpen.value = true;
      }
    } else if (hit.kind === 'category') {
      updateSettings({ hiddenCategories: settings.value.hiddenCategories.filter((c) => c !== hit.categoryId) });
      const pts = cycleMarkers.value.filter((m) => m.category === hit.categoryId).map((m): [number, number] => [m.lat, m.lng]);
      if (pts.length) mapCommand.value = { type: 'fit', points: pts };
    } else if (hit.kind === 'place') {
      mapCommand.value = { type: 'fly', lat: hit.lat, lng: hit.lng, zoom: hit.zoom };
    } else {
      const pin = pinsDoc.value.pins.find((p) => p.id === hit.pinId);
      if (pin) {
        selectedMarkerId.value = null;
        selectedPinId.value = pin.id;
        mapCommand.value = { type: 'fly', lat: pin.lat, lng: pin.lng, zoom: 5 };
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      const hit = results[active];
      if (hit) choose(hit.value);
    } else if (e.key === 'Escape') {
      setOpen(false);
      if (!query) inputRef.current?.blur();
      setQuery('');
    }
  };

  const data = collectibles.value;
  const todayItems = new Set(cycleMarkers.value.map((m) => m.itemId));
  const showList = open && query.trim().length > 0;

  return (
    <div class="search" role="search">
      <label class="sr-only" for={searchInputId}>
        {tr('search.label')}
      </label>
      <span class="search-icon">
        <Icon name="search" size={18} />
      </span>
      <input
        id={searchInputId}
        ref={inputRef}
        type="search"
        autocomplete="off"
        spellcheck={false}
        placeholder={tr('search.placeholder')}
        value={query}
        role="combobox"
        list={undefined}
        aria-expanded={showList}
        aria-controls="search-results"
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `search-opt-${active}` : undefined}
        onInput={(e) => {
          setQuery(e.currentTarget.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {query && (
        <button type="button" class="icon-btn icon-btn-small search-clear" aria-label={tr('search.clear')} onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
          <Icon name="close" size={16} />
        </button>
      )}
      {showList && (
        <ul id="search-results" class="search-results" role="listbox" aria-label={tr('search.label')}>
          {results.length === 0 && <li class="search-empty">{tr('search.noResults')}</li>}
          {results.map((r, i) => {
            const hit = r.value;
            let kind: string;
            let glyph: string;
            let note = '';
            if (hit.kind === 'item') {
              kind = tr('search.kind.item');
              const it = data?.items.find((x) => x.id === hit.itemId);
              glyph = it ? (data?.categories.find((c) => c.itemIds.includes(it.id))?.id ?? 'random') : 'random';
              if (!todayItems.has(hit.itemId)) note = tr('search.notToday');
            } else if (hit.kind === 'category') {
              kind = tr('search.kind.category');
              glyph = hit.categoryId;
            } else if (hit.kind === 'place') {
              kind = tr('search.kind.place');
              glyph = 'fastTravel';
            } else {
              kind = tr('search.kind.pin');
              glyph = 'pin';
            }
            return (
              <li
                key={`${r.label}-${i}`}
                id={`search-opt-${i}`}
                role="option"
                aria-selected={i === active}
                class={`search-opt ${i === active ? 'is-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(hit)}
              >
                <Glyph name={glyph} size={18} />
                <span class="search-opt-label">
                  {r.label}
                  {note && <small class="muted"> · {note}</small>}
                </span>
                <span class="search-opt-kind">{kind}</span>
              </li>
            );
          })}
        </ul>
      )}
      <span class="sr-only" aria-live="polite">
        {showList ? `${results.length}` : ''}
      </span>
    </div>
  );
}
