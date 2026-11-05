import { BarChart3, Coins, Swords } from 'lucide-react';
import { BANKRUPTCY_LIMIT } from '../game/constants';
import { formatMoney } from '../game/utils';

function Sparkline({ data, color, min, max }) {
  if (data.length < 2) return <div className="h-10 text-[10px] text-slate-600">データ不足</div>;
  const lo = min ?? Math.min(...data);
  const hi = max ?? Math.max(...data);
  const span = hi - lo || 1;
  const w = 200;
  const h = 40;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - lo) / span) * (h - 4) - 2}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

const SERIES = [
  { key: 'approval', label: '支持率', color: '#34d399', min: 0, max: 100, fmt: (v) => `${v}%` },
  { key: 'treasury', label: '国庫', color: '#fbbf24', fmt: formatMoney },
  { key: 'economy', label: '経済力', color: '#38bdf8', fmt: (v) => v },
  { key: 'military', label: '軍事力', color: '#fb923c', fmt: (v) => v },
];

export default function StatusPanel({ state }) {
  const r = state.lastReport;
  const wars = state.countries.filter((c) => c.atWar);

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <h2 className="panel-title mb-3">
          <Coins className="h-4 w-4" />
          前月の収支報告
        </h2>
        {r ? (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">税収</dt>
              <dd className="font-mono text-emerald-300">+{formatMoney(r.income)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">歳出（軍・行政）</dt>
              <dd className="font-mono text-rose-300">-{formatMoney(r.upkeep)}</dd>
            </div>
            {r.warCost > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-400">戦費</dt>
                <dd className="font-mono text-red-400">-{formatMoney(r.warCost)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-800 pt-1">
              <dt className="font-bold text-slate-300">国庫増減</dt>
              <dd className={`font-mono font-bold ${r.deltas.treasury >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {r.deltas.treasury >= 0 ? '+' : ''}
                {formatMoney(r.deltas.treasury)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-slate-500">ターンを進めると収支が表示されます。</p>
        )}
        {state.isolation && <p className="mt-2 text-[11px] text-violet-300">※鎖国中のため黒字額は半減しています</p>}
        {state.negativeTreasuryTurns > 0 && (
          <p className="mt-2 rounded bg-rose-950/50 px-2 py-1 text-[11px] font-bold text-rose-300">
            財政破綻まであと{BANKRUPTCY_LIMIT - state.negativeTreasuryTurns}ヶ月
          </p>
        )}
      </section>

      {wars.length > 0 && (
        <section className="panel border-red-900/60 p-4">
          <h2 className="panel-title mb-2 text-red-300">
            <Swords className="h-4 w-4" />
            戦況
          </h2>
          {wars.map((w) => {
            const ratio = state.military / (state.military + w.military);
            return (
              <div key={w.id} className="mb-2 last:mb-0">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">
                    {w.flag} {w.name}
                  </span>
                  <span className="text-slate-500">{w.warTurns}ヶ月目</span>
                </div>
                <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-red-900">
                  <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${ratio * 100}%` }} />
                </div>
                <div className="mt-0.5 flex justify-between font-mono text-[10px] text-slate-500">
                  <span>自軍 {Math.round(state.military)}</span>
                  <span>敵軍 {Math.round(w.military)}</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="panel p-4">
        <h2 className="panel-title mb-3">
          <BarChart3 className="h-4 w-4" />
          国家指標の推移
        </h2>
        <div className="space-y-3">
          {SERIES.map((s) => {
            const data = state.history.map((h) => h[s.key]);
            return (
              <div key={s.key}>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="font-mono text-slate-300">{s.fmt(data[data.length - 1] ?? 0)}</span>
                </div>
                <Sparkline data={data} color={s.color} min={s.min} max={s.max} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
