/**
 * Imperative Leaflet controller. Owns the map, layers and markers; the Preact
 * layer only calls its update methods from signal effects.
 */
import L from 'leaflet';
import type { AreaOfInterest, BasemapFile, MarkerData, NazarLocation, PointOfInterest } from '../data/types.ts';
import type { BasemapId, MapView, Pin } from '../core/storage.ts';
import { glyphSvg, markerHtml } from './icons.ts';

export const MAP_BOUNDS: L.LatLngBoundsLiteral = [
  [-144, 0],
  [0, 176],
];
/** Extent of the playable land (used for the first view and the "recenter" button). */
export const LAND_BOUNDS: L.LatLngBoundsLiteral = [
  [-130, 12],
  [-22, 165],
];
export const DEFAULT_VIEW: MapView = { lat: -70, lng: 111.75, zoom: 3 };
export const ROCKSTAR_TILES = 'https://s.rsg.sc/sc/images/games/RDR2/map/game/{z}/{x}/{y}.jpg';
const TRANSPARENT_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export interface MarkerStyle {
  color: (category: string) => string;
  size: number;
  opacity: number;
  toolBadges: boolean;
}

export interface MarkerState {
  collected: (id: string) => boolean;
  weekly: (m: MarkerData) => boolean;
  hideCollected: boolean;
  selectedId: string | null;
}

export interface ControllerCallbacks {
  onMarkerClick: (m: MarkerData) => void;
  onPinClick: (p: Pin) => void;
  onMapContext: (lat: number, lng: number) => void;
  onViewChange: (v: MapView) => void;
  onTilesFailing: () => void;
  name: (m: MarkerData) => string;
  label: (key: string) => string;
}

export class MapController {
  readonly map: L.Map;
  private baseLayer: L.TileLayer | null = null;
  private schematic: L.LayerGroup | null = null;
  private schematicData: BasemapFile | null = null;
  private schematicOnTop = false;
  private readonly markerLayer = L.layerGroup();
  private readonly markers = new Map<string, { leaflet: L.Marker; data: MarkerData }>();
  private readonly overlayLayers = {
    treasures: L.layerGroup(),
    legendary: L.layerGroup(),
    fastTravel: L.layerGroup(),
    nazar: L.layerGroup(),
    pins: L.layerGroup(),
  };
  private routeLayer: L.Polyline | null = null;
  private tileStats = { loaded: 0, failed: 0, warned: false };

  constructor(
    container: HTMLElement,
    view: MapView | null,
    private readonly cb: ControllerCallbacks,
  ) {
    const v = view ?? DEFAULT_VIEW;
    const firstVisit = view === null;
    this.map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: 2,
      maxZoom: 7,
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
      maxBounds: L.latLngBounds([-200, -80], [40, 260]),
      maxBoundsViscosity: 0.6,
      preferCanvas: false,
      tapHold: true,
    }).setView([v.lat, v.lng], v.zoom);
    this.map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
    this.map.attributionControl.addAttribution(cb.label('map.attribution'));

    this.map.createPane('schematic').style.zIndex = '150';
    this.map.createPane('roadsTop').style.zIndex = '390';
    this.map.createPane('areas').style.zIndex = '395';

    if (firstVisit) this.map.fitBounds(LAND_BOUNDS, { padding: [10, 10] });
    this.markerLayer.addTo(this.map);
    this.map.on('contextmenu', (e: L.LeafletMouseEvent) => cb.onMapContext(e.latlng.lat, e.latlng.lng));
    this.map.on('moveend', () => {
      const c = this.map.getCenter();
      cb.onViewChange({ lat: round(c.lat), lng: round(c.lng), zoom: this.map.getZoom() });
    });
  }

  destroy(): void {
    this.map.remove();
  }

  // ---------------------------------------------------------------- base map

  setBasemap(id: BasemapId, customUrl: string): void {
    if (this.baseLayer) {
      this.baseLayer.remove();
      this.baseLayer = null;
    }
    this.map.getContainer().dataset['basemap'] = id;
    const url = id === 'rockstar' ? ROCKSTAR_TILES : id === 'custom' && customUrl ? customUrl : null;
    if (!url) return;
    this.tileStats = { loaded: 0, failed: 0, warned: false };
    const attribution =
      id === 'rockstar' ? '<a href="https://www.rockstargames.com/" target="_blank" rel="noopener noreferrer">© Rockstar Games</a>' : '';
    const layer = L.tileLayer(url, {
      noWrap: true,
      bounds: L.latLngBounds(MAP_BOUNDS),
      minZoom: 2,
      maxZoom: 7,
      maxNativeZoom: 7,
      errorTileUrl: TRANSPARENT_GIF,
      attribution,
      keepBuffer: 3,
      updateWhenIdle: true,
    });
    layer.on('tileload', () => this.tileStats.loaded++);
    layer.on('tileerror', () => {
      this.tileStats.failed++;
      if (!this.tileStats.warned && this.tileStats.failed >= 6 && this.tileStats.failed > this.tileStats.loaded) {
        this.tileStats.warned = true;
        this.cb.onTilesFailing();
      }
    });
    layer.addTo(this.map);
    this.baseLayer = layer;
  }

  /** Vector road network drawn under the tiles (offline fallback) or above them when requested. */
  setSchematic(data: BasemapFile | null, onTop: boolean, townLabels: { name: string; lat: number; lng: number }[]): void {
    if (data === this.schematicData && onTop === this.schematicOnTop && this.schematic) return;
    this.schematicData = data;
    this.schematicOnTop = onTop;
    this.schematic?.remove();
    this.schematic = null;
    if (!data) return;
    const pane = onTop ? 'roadsTop' : 'schematic';
    const renderer = L.canvas({ pane, padding: 0.5 });
    const group = L.layerGroup();
    const toLatLngs = (flat: number[]): L.LatLngTuple[] => {
      const out: L.LatLngTuple[] = [];
      for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i]!, flat[i + 1]!]);
      return out;
    };
    const roadStyle: L.PolylineOptions = onTop
      ? { renderer, color: '#f4e4c1', weight: 1.6, opacity: 0.75, interactive: false }
      : { renderer, color: '#a08259', weight: 1.4, opacity: 0.9, interactive: false };
    for (const region of data.regions) {
      L.polyline(region.lines.map(toLatLngs), roadStyle).addTo(group);
    }
    L.polyline(data.railroads.map(toLatLngs), {
      renderer,
      color: onTop ? '#ffffff' : '#6b5a45',
      weight: 2,
      dashArray: '2 5',
      opacity: 0.85,
      interactive: false,
    }).addTo(group);
    if (!onTop) {
      for (const region of data.regions) {
        L.marker(region.label, {
          pane,
          interactive: false,
          keyboard: false,
          icon: L.divIcon({ className: 'schem-region', html: escapeHtml(this.cb.label(`region.${region.id}`)), iconSize: [160, 24], iconAnchor: [80, 12] }),
        }).addTo(group);
      }
      for (const town of townLabels) {
        L.marker([town.lat, town.lng], {
          pane,
          interactive: false,
          keyboard: false,
          icon: L.divIcon({ className: 'schem-town', html: `<span>${escapeHtml(town.name)}</span>`, iconSize: [120, 18], iconAnchor: [60, -4] }),
        }).addTo(group);
      }
    }
    group.addTo(this.map);
    this.schematic = group;
  }

  // ----------------------------------------------------------------- markers

  setMarkers(list: readonly MarkerData[], style: MarkerStyle, state: MarkerState): void {
    this.markerLayer.clearLayers();
    this.markers.clear();
    const w = Math.round(30 * style.size);
    const h = Math.round(40 * style.size);
    const root = this.map.getContainer();
    root.style.setProperty('--mk-opacity', String(style.opacity));
    for (const m of list) {
      const badges: string[] = [];
      if (style.toolBadges && m.tool > 0) badges.push(`<span class="mk-badge mk-tool">${glyphSvg(m.tool === 1 ? 'shovel' : 'detector', 11, '#1a120b', 2.4)}</span>`);
      if (style.toolBadges && m.height !== 0) badges.push(`<span class="mk-badge mk-height">${m.height === 1 ? '▲' : '▼'}</span>`);
      const icon = L.divIcon({
        className: 'mk',
        html: markerHtml(m.category, style.color(m.category)) + badges.join(''),
        iconSize: [w, h],
        iconAnchor: [w / 2, h],
      });
      const marker = L.marker([m.lat, m.lng], { icon, title: this.cb.name(m), alt: this.cb.name(m), riseOnHover: true, keyboard: true });
      marker.on('click', () => this.cb.onMarkerClick(m));
      marker.addTo(this.markerLayer);
      this.markers.set(m.id, { leaflet: marker, data: m });
    }
    this.updateMarkerStates(state);
  }

  updateMarkerStates(state: MarkerState): void {
    for (const [id, { leaflet, data }] of this.markers) {
      const el = leaflet.getElement();
      if (!el) continue;
      const collected = state.collected(id);
      el.classList.toggle('is-collected', collected);
      el.classList.toggle('is-hidden', collected && state.hideCollected);
      el.classList.toggle('is-weekly', state.weekly(data));
      el.classList.toggle('is-selected', state.selectedId === id);
      el.setAttribute('aria-pressed', String(collected));
      if (state.selectedId === id) leaflet.setZIndexOffset(1000);
      else leaflet.setZIndexOffset(0);
    }
  }

  // ---------------------------------------------------------------- overlays

  setTreasures(list: readonly AreaOfInterest[] | null, name: (id: string) => string): void {
    this.setAreas(this.overlayLayers.treasures, list, 'treasure', '#d9b44a', name, true);
  }

  setLegendary(list: readonly AreaOfInterest[] | null, name: (id: string) => string): void {
    this.setAreas(this.overlayLayers.legendary, list, 'legendary', '#c0392b', name, false);
  }

  private setAreas(
    layer: L.LayerGroup,
    list: readonly AreaOfInterest[] | null,
    glyph: string,
    color: string,
    name: (id: string) => string,
    showLocations: boolean,
  ): void {
    layer.clearLayers();
    if (!list) {
      layer.remove();
      return;
    }
    for (const a of list) {
      L.circle([a.lat, a.lng], { radius: a.radius, color, weight: 1.5, fillOpacity: 0.12, pane: 'areas', interactive: false }).addTo(layer);
      L.marker([a.lat, a.lng], {
        icon: L.divIcon({ className: 'poi', html: `<span class="poi-dot" style="--c:${color}">${glyphSvg(glyph, 16, '#fff8ec', 2)}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
        title: name(a.id),
        keyboard: false,
      })
        .bindTooltip(escapeHtml(name(a.id)), { direction: 'top', offset: [0, -12] })
        .addTo(layer);
      if (showLocations) {
        for (const l of a.locations) {
          L.circleMarker([l.lat, l.lng], { radius: 3, color, weight: 1, fillOpacity: 0.8, interactive: false }).addTo(layer);
        }
      }
    }
    layer.addTo(this.map);
  }

  setFastTravel(list: readonly PointOfInterest[] | null, name: (id: string) => string): void {
    const layer = this.overlayLayers.fastTravel;
    layer.clearLayers();
    if (!list) {
      layer.remove();
      return;
    }
    for (const f of list) {
      L.marker([f.lat, f.lng], {
        icon: L.divIcon({ className: 'poi', html: `<span class="poi-dot" style="--c:#5d9bd6">${glyphSvg('fastTravel', 15, '#fff8ec', 2)}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }),
        title: name(f.id),
        keyboard: false,
      })
        .bindTooltip(escapeHtml(name(f.id)), { direction: 'top', offset: [0, -10] })
        .addTo(layer);
    }
    layer.addTo(this.map);
  }

  setNazar(loc: NazarLocation | null, label: string): void {
    const layer = this.overlayLayers.nazar;
    layer.clearLayers();
    if (!loc) {
      layer.remove();
      return;
    }
    L.marker([loc.lat, loc.lng], {
      icon: L.divIcon({ className: 'poi poi-nazar', html: `<span class="poi-dot" style="--c:#a55fd1">${glyphSvg('nazar', 20, '#fff8ec', 2)}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] }),
      title: label,
      zIndexOffset: 500,
    })
      .bindTooltip(escapeHtml(label), { direction: 'top', offset: [0, -16] })
      .addTo(layer);
    layer.addTo(this.map);
  }

  setPins(list: readonly Pin[] | null): void {
    const layer = this.overlayLayers.pins;
    layer.clearLayers();
    if (!list) {
      layer.remove();
      return;
    }
    for (const p of list) {
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: 'mk mk-user', html: markerHtml('pin', p.color), iconSize: [28, 37], iconAnchor: [14, 37] }),
        title: p.title,
        zIndexOffset: 400,
      });
      m.on('click', () => this.cb.onPinClick(p));
      if (p.title) m.bindTooltip(escapeHtml(p.title), { direction: 'top', offset: [0, -34] });
      m.addTo(layer);
    }
    layer.addTo(this.map);
  }

  setRoute(points: readonly { lat: number; lng: number }[] | null, start: { lat: number; lng: number } | null): void {
    this.routeLayer?.remove();
    this.routeLayer = null;
    if (!points || points.length === 0) return;
    const latlngs: L.LatLngTuple[] = [...(start ? [[start.lat, start.lng] as L.LatLngTuple] : []), ...points.map((p) => [p.lat, p.lng] as L.LatLngTuple)];
    this.routeLayer = L.polyline(latlngs, { color: '#f0c674', weight: 3, opacity: 0.9, dashArray: '8 6', interactive: false, pane: 'areas' }).addTo(this.map);
  }

  // --------------------------------------------------------------- commands

  flyTo(lat: number, lng: number, zoom: number | undefined, animate: boolean): void {
    const z = Math.max(this.map.getZoom(), zoom ?? this.map.getZoom());
    if (animate) this.map.flyTo([lat, lng], z, { duration: 0.6 });
    else this.map.setView([lat, lng], z);
  }

  fit(points: [number, number][], animate: boolean): void {
    if (points.length === 0) return;
    this.map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 6, animate });
  }

  resetView(): void {
    this.map.fitBounds(LAND_BOUNDS, { padding: [10, 10] });
  }

  center(): { lat: number; lng: number } {
    const c = this.map.getCenter();
    return { lat: c.lat, lng: c.lng };
  }

  invalidate(): void {
    this.map.invalidateSize({ pan: false });
  }
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
