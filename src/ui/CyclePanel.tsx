import { useState } from 'preact/hooks';
import { CYCLE_GROUPS, type CycleGroup, type CycleNumber } from '../data/types.ts';
import { calendarRange } from '../core/cycles.ts';
import { formatDate, type UiKey } from '../core/i18n.ts';
import { calendar, dayOffset, isViewingToday, resolved, selectedDate, settings, t, updateSettings } from '../state/store.ts';
import { Icon, IconButton } from './common.tsx';

export function CyclePanel() {
  const tr = t.value;
  const r = resolved.value;
  const lang = settings.value.language;
  const [manualOpen, setManualOpen] = useState(false);
  const range = calendarRange(calendar.value);
  const manual = settings.value.manualCycles;

  const setManual = (g: CycleGroup, v: CycleNumber) => {
    updateSettings({ manualCycles: { ...r.cycles, ...(manual ?? {}), [g]: v } });
  };

  return (
    <section class="cycle-panel" aria-labelledby="cycle-title">
      <div class="cycle-head">
        <IconButton icon="chevronLeft" label={tr('cycle.prevDay')} onClick={() => (dayOffset.value = Math.max(-7, dayOffset.value - 1))} disabled={dayOffset.value <= -7} />
        <div class="cycle-date">
          <h2 id="cycle-title">{formatDate(selectedDate.value, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {!isViewingToday.value && (
            <button type="button" class="link-btn" onClick={() => (dayOffset.value = 0)}>
              {tr('cycle.today')}
            </button>
          )}
        </div>
        <IconButton icon="chevronRight" label={tr('cycle.nextDay')} onClick={() => (dayOffset.value = Math.min(1, dayOffset.value + 1))} disabled={dayOffset.value >= 1} />
      </div>
      <p class={`cycle-source source-${r.source}`}>{tr(`cycle.source.${r.source}` as UiKey)}</p>
      {!isViewingToday.value && <p class="notice notice-warning">{tr('cycle.viewingOther')}</p>}
      <ul class="cycle-grid" aria-label={tr('cycle.title')}>
        {CYCLE_GROUPS.map((g) => (
          <li key={g} class={r.sameAsYesterday.includes(g) ? 'is-same' : ''} title={r.sameAsYesterday.includes(g) ? tr('cycle.sameAsYesterday') : undefined}>
            <span class="cycle-name">{tr(`cycle.group.${g}` as UiKey)}</span>
            <span class="cycle-num" aria-label={tr('collection.cycle', { n: r.cycles[g] })}>
              {r.cycles[g]}
            </span>
          </li>
        ))}
      </ul>
      {r.sameAsYesterday.length > 0 && <p class="muted small">⚠ {tr('cycle.sameAsYesterday')}</p>}
      <button type="button" class="disclosure" aria-expanded={manualOpen} onClick={() => setManualOpen(!manualOpen)}>
        <Icon name="chevronDown" size={16} /> {tr('cycle.manual')}
      </button>
      {manualOpen && (
        <div class="manual-cycles">
          <p class="muted small">{tr('cycle.manualHint')}</p>
          {range && <p class="muted small">{tr('cycle.calendarRange', { from: formatDate(range.from, lang), to: formatDate(range.to, lang) })}</p>}
          <div class="manual-grid">
            {CYCLE_GROUPS.map((g) => (
              <label key={g}>
                <span>{tr(`cycle.group.${g}` as UiKey)}</span>
                <select value={String(r.cycles[g])} onChange={(e) => setManual(g, Number(e.currentTarget.value) as CycleNumber)}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {manual && (
            <button type="button" class="btn btn-small" onClick={() => updateSettings({ manualCycles: null })}>
              {tr('cycle.clearManual')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
