import { formatMoney } from '../core/i18n.ts';
import { catName, categoryColor, settings, stats, t } from '../state/store.ts';
import { Glyph, ProgressBar } from './common.tsx';

export function StatsPanel() {
  const tr = t.value;
  const st = stats.value;
  if (!st) return null;
  const lang = settings.value.language;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  return (
    <div class="stats">
      <header class="panel-hero">
        <h2>{tr('stats.title')}</h2>
      </header>
      <div class="kpis">
        <div class="kpi">
          <span class="kpi-label">{tr('stats.today')}</span>
          <span class="kpi-value">
            {st.todayCollected}
            <small>/{st.todayTotal}</small>
          </span>
          <ProgressBar value={st.todayCollected} max={st.todayTotal} label={tr('stats.today')} />
        </div>
        <div class="kpi">
          <span class="kpi-label">{tr('stats.items')}</span>
          <span class="kpi-value">
            {st.itemsOwned}
            <small>/{st.itemsTotal}</small>
          </span>
          <ProgressBar value={st.itemsOwned} max={st.itemsTotal} label={tr('stats.items')} />
        </div>
        <div class="kpi">
          <span class="kpi-label">{tr('stats.inventoryValue')}</span>
          <span class="kpi-value">{formatMoney(st.inventoryValue, lang)}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">{tr('stats.setsValue')}</span>
          <span class="kpi-value">{formatMoney(st.completeSetsValue, lang)}</span>
        </div>
      </div>
      <h3 class="subhead">{tr('stats.collections')}</h3>
      <ul class="collection-stats">
        {st.collections.map((c) => (
          <li key={c.id} style={{ '--c': categoryColor(c.id === 'coastal' || c.id === 'oceanic' || c.id === 'megafauna' ? 'fossils_random' : c.id) }}>
            <div class="cs-head">
              <Glyph name={c.id === 'coastal' || c.id === 'oceanic' || c.id === 'megafauna' ? 'fossils_random' : c.id} size={16} />
              <span class="cs-name">{catName(c.id)}</span>
              <span class="cs-count">
                {c.owned}/{c.total} · {pct(c.owned, c.total)}%
              </span>
            </div>
            <ProgressBar value={c.owned} max={c.total} label={catName(c.id)} />
            <div class="cs-foot muted small">
              <span>{formatMoney(c.value, lang)}</span>
              {c.completeSets > 0 && <span class="badge badge-gold">{tr('stats.completeSets', { n: c.completeSets })}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
