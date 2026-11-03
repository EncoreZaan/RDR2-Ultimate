import { msUntilUtcMidnight, formatCountdown } from '../core/time.ts';
import { formatDate } from '../core/i18n.ts';
import { now, online, settings, sidebarOpen, t, today } from '../state/store.ts';
import { Icon, IconButton } from './common.tsx';
import { Search } from './Search.tsx';
import logoUrl from '../assets/logo.svg';

export function Header() {
  const tr = t.value;
  const isOnline = online.value;
  return (
    <header class="topbar">
      <IconButton
        icon={sidebarOpen.value ? 'close' : 'menu'}
        label={sidebarOpen.value ? tr('nav.closeMenu') : tr('nav.openMenu')}
        pressed={sidebarOpen.value}
        onClick={() => (sidebarOpen.value = !sidebarOpen.value)}
        class="menu-btn"
      />
      <div class="brand">
        <img src={logoUrl} alt="" width={34} height={34} />
        <div class="brand-text">
          <span class="brand-title">Collector’s</span>
          <span class="brand-sub">Ultimate</span>
        </div>
      </div>
      <Search />
      <div class="topbar-meta">
        <div class="day-chip" title={tr('cycle.reset')}>
          <span class="day-date">{formatDate(today.value, settings.value.language)}</span>
          <span class="day-countdown" aria-label={`${tr('cycle.reset')} ${formatCountdown(msUntilUtcMidnight(now.value))}`}>
            {formatCountdown(msUntilUtcMidnight(now.value))}
          </span>
        </div>
        <span class={`net-badge ${isOnline ? 'is-online' : 'is-offline'}`} role="status" title={isOnline ? tr('status.online') : tr('status.offlineHint')}>
          <Icon name={isOnline ? 'wifi' : 'wifiOff'} size={16} />
          <span class="net-label">{isOnline ? tr('status.online') : tr('status.offline')}</span>
        </span>
      </div>
    </header>
  );
}
