import { Coins, Crown, Factory, Lock, LockOpen, RotateCcw, Shield, Swords, Users } from 'lucide-react';
import { IDEOLOGIES, MAX_TURNS } from '../game/constants';
import { dateLabel, formatMoney, signed } from '../game/utils';

function Delta({ value }) {
  if (!value || Math.abs(value) < 0.5) return null;
  const up = value > 0;
  return <span className={`ml-1 text-[10px] font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>{signed(value)}</span>;
}

function Stat({ icon: Icon, label, value, accent, delta, children }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
      <Icon className={`h-5 w-5 shrink-0 ${accent}`} />
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
        <div className="flex items-baseline truncate font-mono text-sm font-bold text-slate-100">
          {value}
          <Delta value={delta} />
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Header({ state, onReset }) {
  const ideology = IDEOLOGIES[state.ideology];
  const d = state.lastReport?.deltas ?? {};
  const approvalColor = state.approval < 20 ? 'bg-rose-500' : state.approval < 45 ? 'bg-amber-500' : 'bg-emerald-500';
  const wars = state.countries.filter((c) => c.atWar);

  return (
    <header className="sticky top-0 z-30 border-b border-amber-900/30 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-700/50 bg-gradient-to-br from-amber-900/60 to-slate-900">
              <Crown className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-black tracking-widest text-amber-100">国家統治シミュレーター</h1>
              <p className="text-[11px] tracking-wider text-slate-500">
                第{state.turn}ターン / 任期 {MAX_TURNS}ヶ月
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-amber-700/40 bg-amber-950/30 px-4 py-1.5 text-center">
              <div className="text-[10px] tracking-widest text-amber-500/80">現在</div>
              <div className="font-serif text-lg font-bold text-amber-200">{dateLabel(state.turn)}</div>
            </div>
            <button onClick={onReset} className="btn border border-slate-700 bg-slate-900 text-slate-400 hover:border-rose-700 hover:text-rose-300" title="最初からやり直す">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">リセット</span>
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={Users} label="支持率" value={`${Math.round(state.approval)}%`} accent="text-emerald-400" delta={d.approval}>
            <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full ${approvalColor} transition-all duration-500`} style={{ width: `${state.approval}%` }} />
            </div>
          </Stat>
          <Stat
            icon={Coins}
            label="国庫"
            value={<span className={state.treasury < 0 ? 'text-rose-400' : ''}>{formatMoney(state.treasury)}</span>}
            accent="text-amber-400"
            delta={d.treasury}
          />
          <Stat icon={Factory} label="経済力" value={Math.round(state.economy)} accent="text-sky-400" delta={d.economy} />
          <Stat icon={Shield} label="軍事力" value={Math.round(state.military)} accent="text-orange-400" delta={d.military} />
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
            <Crown className={`h-5 w-5 ${ideology.color}`} />
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">政治体制</div>
              <span className={`inline-block rounded border px-2 py-0.5 text-xs font-bold ${ideology.badge}`}>{ideology.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
            {state.isolation ? <Lock className="h-5 w-5 text-violet-400" /> : <LockOpen className="h-5 w-5 text-slate-500" />}
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">鎖国状態</div>
              <span
                className={`inline-block rounded border px-2 py-0.5 text-xs font-bold ${
                  state.isolation ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-slate-600 bg-slate-800 text-slate-400'
                }`}
              >
                {state.isolation ? '鎖国中' : '開国'}
              </span>
            </div>
          </div>
        </div>

        {(wars.length > 0 || state.negativeTreasuryTurns > 0) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {wars.map((w) => (
              <span key={w.id} className="flex animate-pulse items-center gap-1.5 rounded-md border border-red-700/60 bg-red-950/60 px-2.5 py-1 text-xs font-bold text-red-300">
                <Swords className="h-3.5 w-3.5" />
                {w.name}と交戦中（{w.warTurns}ヶ月目）
              </span>
            ))}
            {state.negativeTreasuryTurns > 0 && (
              <span className="flex items-center gap-1.5 rounded-md border border-rose-700/60 bg-rose-950/60 px-2.5 py-1 text-xs font-bold text-rose-300">
                <Coins className="h-3.5 w-3.5" />
                財政赤字 {state.negativeTreasuryTurns}/3ヶ月 — 破綻の危機
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
