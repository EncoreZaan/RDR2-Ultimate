import 'leaflet/dist/leaflet.css';
import { effect, untracked } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import type { UiKey } from '../core/i18n.ts';
import { planRoute } from '../core/route.ts';
import {
  basemap,
  categoryColor,
  gameStrings,
  isViewingToday,
  mapCommand,
  markerIsCollected,
  nameOfMarker,
  nazarLocation,
  pinsDoc,
  progress,
  route,
  selectedMarkerId,
  selectedPinId,
  settings,
  shownMarkers,
  sidebarOpen,
  t,
  toast,
  updateSettings,
  weeklyItems,
  world,
} from '../state/store.ts';
import { pinDraft } from '../ui/PinEditor.tsx';
import { MapController } from './controller.ts';

/** Exposed for the route planner and tests. */
export let mapController: MapController | null = null;

export function MapView() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctrl = new MapController(ref.current, settings.peek().mapView, {
      onMarkerClick: (m) => {
        selectedPinId.value = null;
        selectedMarkerId.value = m.id;
      },
      onPinClick: (p) => {
        selectedMarkerId.value = null;
        selectedPinId.value = p.id;
      },
      onMapContext: (lat, lng) => {
        pinDraft.value = { lat, lng };
      },
      onViewChange: (v) => updateSettings({ mapView: v }),
      onTilesFailing: () => toast(t.peek()('map.tilesFailed'), 'warning'),
      name: (m) => nameOfMarker(m),
      label: (key) => t.peek()(key as UiKey),
    });
    mapController = ctrl;
    const anim = () => !settings.peek().reducedMotion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const disposers = [
      effect(() => {
        const s = settings.value;
        ctrl.setBasemap(s.basemap, s.customTileUrl);
      }),
      effect(() => {
        const s = settings.value;
        const w = world.value;
        const g = gameStrings.value;
        const towns = (w?.fastTravel ?? []).map((f) => ({ name: g[`${f.id}.name`] ?? '', lat: f.lat, lng: f.lng }));
        ctrl.setSchematic(basemap.value, s.overlays.roads && s.basemap !== 'schematic', towns);
      }),
      effect(() => {
        const list = shownMarkers.value;
        const s = settings.value;
        // Re-read names when the language changes.
        void gameStrings.value;
        ctrl.setMarkers(
          list,
          { color: categoryColor, size: s.markerSize, opacity: s.markerOpacity, toolBadges: s.showToolBadges },
          untracked(markerState),
        );
      }),
      effect(() => {
        void progress.value;
        void selectedMarkerId.value;
        void weeklyItems.value;
        ctrl.updateMarkerStates(markerState());
      }),
      effect(() => {
        const s = settings.value.overlays;
        const w = world.value;
        const g = gameStrings.value;
        const name = (id: string) => g[`${id}.name`] ?? g[id] ?? id;
        ctrl.setTreasures(s.treasures && w ? w.treasures : null, name);
        ctrl.setLegendary(s.legendary && w ? w.legendaryAnimals : null, name);
        ctrl.setFastTravel(s.fastTravel && w ? w.fastTravel : null, name);
      }),
      effect(() => {
        ctrl.setNazar(settings.value.overlays.nazar ? nazarLocation.value : null, t.value('map.nazar'));
      }),
      effect(() => {
        ctrl.setPins(settings.value.overlays.pins ? pinsDoc.value.pins : null);
      }),
      effect(() => {
        const r = route.value;
        ctrl.setRoute(r, r ? routeStart : null);
      }),
      effect(() => {
        const cmd = mapCommand.value;
        if (!cmd) return;
        if (cmd.type === 'fly') ctrl.flyTo(cmd.lat, cmd.lng, cmd.zoom, anim());
        else if (cmd.type === 'fit') ctrl.fit(cmd.points, anim());
        else ctrl.resetView();
        mapCommand.value = null;
      }),
      effect(() => {
        void sidebarOpen.value;
        setTimeout(() => ctrl.invalidate(), 320);
      }),
    ];
    const onResize = () => ctrl.invalidate();
    window.addEventListener('resize', onResize);
    return () => {
      disposers.forEach((d) => d());
      window.removeEventListener('resize', onResize);
      ctrl.destroy();
      mapController = null;
    };
  }, []);

  return <div ref={ref} id="map" class="map" role="application" aria-label={t.value('nav.map')} />;
}

function markerState() {
  return {
    collected: (id: string) => markerIsCollected(id),
    weekly: (m: { itemId: string | null }) => m.itemId !== null && weeklyItems.peek().has(m.itemId),
    hideCollected: settings.peek().collectedDisplay === 'hide',
    selectedId: selectedMarkerId.peek(),
  };
}

let routeStart: { lat: number; lng: number } | null = null;

/** Plans a route through visible, uncollected markers starting from the map centre. */
export function planRouteFromCenter(): number {
  if (!mapController) return 0;
  const start = mapController.center();
  const todo = shownMarkers.peek().filter((m) => !markerIsCollected(m.id));
  if (todo.length === 0 || !isViewingToday.peek()) {
    route.value = null;
    return 0;
  }
  routeStart = start;
  route.value = planRoute(start, todo);
  return todo.length;
}
