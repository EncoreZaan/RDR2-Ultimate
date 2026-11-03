import { useEffect, useRef } from 'preact/hooks';
import { activeTab, sidebarOpen, t, type Tab } from '../state/store.ts';
import { CollectionPanel } from './CollectionPanel.tsx';
import { MapPanel } from './MapPanel.tsx';
import { SettingsPanel } from './SettingsPanel.tsx';
import { StatsPanel } from './StatsPanel.tsx';
import { WeeklyPanel } from './WeeklyPanel.tsx';

const TABS: { id: Tab; key: 'nav.collection' | 'nav.weekly' | 'nav.map' | 'nav.stats' | 'nav.settings' }[] = [
  { id: 'collection', key: 'nav.collection' },
  { id: 'weekly', key: 'nav.weekly' },
  { id: 'map', key: 'nav.map' },
  { id: 'stats', key: 'nav.stats' },
  { id: 'settings', key: 'nav.settings' },
];

export function Sidebar() {
  const tr = t.value;
  const open = sidebarOpen.value;
  const tab = activeTab.value;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      if (e.key === 'm' || e.key === 'M') sidebarOpen.value = !sidebarOpen.value;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onTabKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + TABS.length) % TABS.length;
    activeTab.value = TABS[next]!.id;
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <div class={`scrim ${open ? 'is-visible' : ''}`} onClick={() => (sidebarOpen.value = false)} aria-hidden="true" />
      <aside id="sidebar" class={`sidebar ${open ? 'is-open' : ''}`} aria-label={tr('nav.openMenu')} inert={!open}>
        <div class="tabs" role="tablist" aria-label="Sections">
          {TABS.map((x, i) => (
            <button
              key={x.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${x.id}`}
              aria-selected={tab === x.id}
              aria-controls={`panel-${x.id}`}
              tabIndex={tab === x.id ? 0 : -1}
              class={`tab ${tab === x.id ? 'is-active' : ''}`}
              onClick={() => (activeTab.value = x.id)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {tr(x.key)}
            </button>
          ))}
        </div>
        <div class="panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
          {tab === 'collection' && <CollectionPanel />}
          {tab === 'weekly' && <WeeklyPanel />}
          {tab === 'map' && <MapPanel />}
          {tab === 'stats' && <StatsPanel />}
          {tab === 'settings' && <SettingsPanel />}
        </div>
      </aside>
    </>
  );
}
