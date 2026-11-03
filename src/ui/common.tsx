import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { glyphSvg } from '../map/icons.ts';
import { t } from '../state/store.ts';

/** Inline SVG glyph (trusted, static markup from icons.ts). */
export function Glyph({ name, size = 18, color = 'currentColor', class: cls }: { name: string; size?: number; color?: string; class?: string }) {
  return <span class={`glyph ${cls ?? ''}`} dangerouslySetInnerHTML={{ __html: glyphSvg(name, size, color) }} />;
}

const ICONS = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
  eyeOff: 'M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1 M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.9 0 3.6-.6 5-1.4 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  target: 'M12 3v4M12 17v4M3 12h4M17 12h4 M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z',
  home: 'M4 11l8-7 8 7v9H4z M10 20v-6h4v6',
  wifiOff: 'M3 3l18 18 M8.5 16.4a5 5 0 0 1 7 0 M5 12.9a10 10 0 0 1 5.2-2.7 M14.5 10.4A10 10 0 0 1 19 12.9 M12 20h.01',
  wifi: 'M5 12.9a10 10 0 0 1 14 0 M8.5 16.4a5 5 0 0 1 7 0 M2 9.3a15 15 0 0 1 20 0 M12 20h.01',
  download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  upload: 'M12 20V9 M7 14l5-5 5 5 M5 4h14',
  route: 'M6 19a2 2 0 1 0 0-.01z M18 5a2 2 0 1 0 0-.01z M6 17V9a3 3 0 0 1 3-3h3 M18 7v8a3 3 0 0 1-3 3h-3',
  layers: 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  refresh: 'M20 11a8 8 0 0 0-14.3-4.9L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14.3 4.9L20 16 M20 20v-4h-4',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16z',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      class="icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      stroke-linecap="round"
      stroke-linejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  class: cls,
  pressed,
  disabled,
  size,
}: {
  icon: IconName;
  label: string;
  onClick: (e: MouseEvent) => void;
  class?: string;
  pressed?: boolean;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <button
      type="button"
      class={`icon-btn ${cls ?? ''}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={size ?? 20} />
    </button>
  );
}

export function Switch({ checked, onChange, label, hint, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; id: string }) {
  return (
    <label class="switch-row" for={id}>
      <span class="switch-text">
        <span>{label}</span>
        {hint && <small class="muted">{hint}</small>}
      </span>
      <input id={id} type="checkbox" role="switch" class="switch" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
    </label>
  );
}

export function Section({ title, children, actions }: { title: string; children: ComponentChildren; actions?: ComponentChildren }) {
  return (
    <section class="panel-section">
      <header class="section-head">
        <h3>{title}</h3>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div class="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

// ------------------------------------------------------------------ confirm

interface ConfirmState {
  text: string;
  resolve: (v: boolean) => void;
}
const confirmState = signal<ConfirmState | null>(null);

export function confirmAction(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState.value = { text, resolve };
  });
}

export function ConfirmDialog() {
  const state = confirmState.value;
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (state) okRef.current?.focus();
  }, [state]);
  if (!state) return null;
  const close = (v: boolean) => {
    state.resolve(v);
    confirmState.value = null;
  };
  return (
    <div class="modal-backdrop" onClick={() => close(false)}>
      <div
        class="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-text"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && close(false)}
      >
        <p id="confirm-text">{state.text}</p>
        <div class="modal-actions">
          <button type="button" class="btn" onClick={() => close(false)}>
            {t.value('settings.cancel')}
          </button>
          <button type="button" class="btn btn-danger" ref={okRef} onClick={() => close(true)}>
            {t.value('settings.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
