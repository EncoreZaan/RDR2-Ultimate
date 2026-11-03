import { mapController } from '../map/MapView.tsx';
import { t } from '../state/store.ts';
import { IconButton } from './common.tsx';

export function MapControls() {
  const tr = t.value;
  return (
    <div class="map-controls" role="group" aria-label={tr('nav.map')}>
      <IconButton icon="plus" label={tr('map.zoomIn')} onClick={() => mapController?.map.zoomIn()} />
      <IconButton icon="minus" label={tr('map.zoomOut')} onClick={() => mapController?.map.zoomOut()} />
      <IconButton icon="home" label={tr('map.resetView')} onClick={() => mapController?.resetView()} />
    </div>
  );
}
