import { AlertTriangle, Bell, Building2, Coins, Info, Newspaper, PieChart, Sparkles } from 'lucide-react';
import { Panel, Sparkline, Delta, Bar, Chip } from '../ui/kit';
import { fmtPopulation, fmtTrillion } from '../../game/core/format';
import { formatYM } from '../../game/core/calendar';
import { partyOf } from '../../game/engine/parties';
import { POPS } from '../../game/data/pops';
import { nextElectionLabel } from '../../game/engine/politics';
import { satColor } from '../ui/colors';
import { computeAlerts } from '../alerts';

function Kpi({ label, value, delta, digits = 1, unit = '', invert, series, color, note }) {
  return (
    <div className="panel flex flex-col justify-between p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="label">{label}</div>
        <Delta value={delta} digits={digits} unit={unit} invert={invert} className="num text-[11px]" />
      </div>
      <div className="num mt-1 text-xl font-semibold text-ink">{value}</div>
      {note && <div className="text-[10px] text-ink-faint">{note}</div>}
      <div className="mt-1">
        <Sparkline data={series} color={color} height={26} />
      </div>
    </div>
  );
}

const LEVEL = { bad: 'border-red-800/60 bg-red-950/40 text-red-200', warn: 'border-amber-700/50 bg-amber-950/30 text-amber-100', info: 'border-sky-800/50 bg-sky-950/30 text-sky-100' };

export default function Overview({ state: s, derived: d, go }) {
  const h = s.history.slice(-24);
  const prev = s.history.at(-2) ?? s.history.at(-1);
  const series = (k) => h.map((x) => x[k]);
  const lm = s.econ.lastMonth;
  const alerts = computeAlerts(s, d);
  const coalition = s.politics.coalition;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="label">{s.meta.countryName} 統計局</div>
          <h1 className="font-serif text-2xl font-bold tracking-wider text-ink">国家概要 — {formatYM(s.date)}</h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="brass">次期総選挙 {nextElectionLabel(s)}</Chip>
          <Chip>任期残り {120 - s.month}ヶ月</Chip>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="GDP" value={fmtTrillion(s.econ.gdp, 1)} delta={s.econ.growth} unit="%" note="前月比年率" series={series('gdp')} color="#d4a24c" />
        <Kpi label="人口" value={fmtPopulation(s.society.population)} delta={((s.society.population - prev.population) / prev.population) * 100} digits={2} unit="%" series={series('population')} color="#7cc3a0" />
        <Kpi label="支持率" value={`${d.approval.toFixed(1)}%`} delta={d.approval - prev.approval} unit="pt" series={series('approval')} color="#4cb782" />
        <Kpi label="失業率" value={`${s.econ.unemployment.toFixed(1)}%`} delta={s.econ.unemployment - prev.unemployment} unit="pt" invert series={series('unemployment')} color="#e0a03c" />
        <Kpi label="インフレ率" value={`${s.econ.inflation.toFixed(1)}%`} delta={s.econ.inflation - prev.inflation} unit="pt" invert series={series('inflation')} color="#e07a5f" />
        <Kpi label="政府債務（GDP比）" value={`${d.debtRatio.toFixed(0)}%`} delta={d.debtRatio - prev.debtRatio} unit="pt" invert series={series('debtRatio')} color="#c77dff" />
        <Kpi label="国庫" value={fmtTrillion(s.econ.treasury)} delta={s.econ.treasury - prev.treasury} unit="兆" series={series('treasury')} color="#ecc77e" />
        <Kpi label="再エネ比率" value={`${d.energy.renewableShare.toFixed(0)}%`} delta={d.energy.renewableShare - prev.renewableShare} unit="pt" series={series('renewableShare')} color="#3fae6a" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="要対応事項" icon={Bell} className="xl:col-span-1" bodyClass="p-3">
          {alerts.length ? (
            <ul className="space-y-1.5">
              {alerts.map((a, i) => (
                <li key={i}>
                  <button onClick={() => go(a.screen)} className={`flex w-full items-start gap-2 rounded-md border px-2.5 py-1.5 text-left text-[13px] transition hover:brightness-125 ${LEVEL[a.level]}`}>
                    {a.level === 'info' ? <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    {a.text}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 py-4 text-sm text-emerald-300">
              <Sparkles className="h-4 w-4" />
              国政は安定している。
            </p>
          )}
        </Panel>

        <Panel title="今月の重要ニュース" icon={Newspaper} bodyClass="p-3">
          <ul className="divide-y divide-line">
            {s.news.slice(0, 7).map((n) => (
              <li key={n.id} className="flex gap-2 py-1.5 text-[13px]">
                <span className="w-10 shrink-0 text-[11px] font-bold text-brass">{n.category}</span>
                <span className="min-w-0 flex-1 text-ink">{n.text}</span>
                <span className="num shrink-0 text-[10px] text-ink-faint">{formatYM(n.date)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="今月の財政" icon={Coins} bodyClass="p-3">
          {lm && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-dim">歳入</span>
                <span className="num text-emerald-300">+{fmtTrillion(lm.revenue, 2)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-dim">歳出</span>
                <span className="num text-red-300">−{fmtTrillion(lm.spending, 2)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-dim">国債利払い</span>
                <span className="num text-red-300">−{fmtTrillion(lm.interest, 2)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-2">
                <span className="font-bold text-ink">収支</span>
                <span className={`num text-lg font-bold ${lm.balance >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {lm.balance >= 0 ? '+' : '−'}
                  {fmtTrillion(Math.abs(lm.balance), 2)}
                </span>
              </div>
              {lm.bondsIssued > 0 && <p className="text-[11px] text-amber-300">赤字を埋めるため国債{fmtTrillion(lm.bondsIssued, 2)}を発行</p>}
              <button onClick={() => go('economy')} className="text-xs text-brass hover:underline">
                予算・税制を見直す →
              </button>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="政党支持率と議会" icon={PieChart} bodyClass="p-3">
          <div className="mb-3 flex h-6 overflow-hidden rounded">
            {s.parties.map((p) => (
              <div key={p.id} title={`${p.name} ${s.politics.seats[p.id]}議席`} style={{ width: `${(s.politics.seats[p.id] / 300) * 100}%`, background: p.color, opacity: coalition.includes(p.id) ? 1 : 0.35 }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {[...s.parties]
              .sort((a, b) => s.politics.support[b.id] - s.politics.support[a.id])
              .map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-[13px]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
                  <span className={coalition.includes(p.id) ? 'font-bold text-ink' : 'text-ink-dim'}>{p.short}</span>
                  <span className="num ml-auto text-ink">{s.politics.support[p.id].toFixed(1)}%</span>
                </div>
              ))}
          </div>
          <p className="mt-2 text-xs text-ink-dim">
            与党連合 {coalition.map((p) => partyOf(s, p).short).join('・')}：<span className="num font-bold text-ink">{d.coalitionSeats}</span> / 300議席
          </p>
        </Panel>

        <Panel title="国民の満足度" icon={Building2} bodyClass="p-3">
          <div className="space-y-2">
            {POPS.map((p) => (
              <div key={p.id} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-[13px]">
                <span className="truncate text-ink-dim">{p.name}</span>
                <Bar value={s.pops[p.id].sat} color={satColor(s.pops[p.id].sat)} marker={s.pops[p.id].target} height="h-2" />
                <span className="num text-right text-ink">{s.pops[p.id].sat.toFixed(0)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">白い線は満足度が向かっている目標値。</p>
        </Panel>
      </div>

      {s.modifiers.length > 0 && (
        <Panel title="進行中の影響" bodyClass="p-3">
          <div className="flex flex-wrap gap-1.5">
            {s.modifiers.map((m) => (
              <Chip key={m.id} tone="warn">
                {m.label}（残り{m.monthsLeft}ヶ月）
              </Chip>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
