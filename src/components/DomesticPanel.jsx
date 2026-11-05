import { Factory, HeartHandshake, Lock, LockOpen, Shield, Check, X } from 'lucide-react';
import { DOMESTIC_ACTIONS, IDEOLOGIES, IDEOLOGY_CHANGE_COST } from '../game/constants';
import { formatMoney } from '../game/utils';

const ACTION_ICONS = { invest_economy: Factory, build_military: Shield, welfare: HeartHandshake };
const EFFECT_LABELS = { economy: '経済', military: '軍事', approval: '支持' };

export default function DomesticPanel({ state, actions, disabled }) {
  const cannotAct = disabled || state.actionsLeft <= 0;

  return (
    <div className="space-y-5">
      {/* 政治体制 */}
      <section>
        <h3 className="mb-2 text-xs font-bold tracking-widest text-slate-400">政治体制</h3>
        <div className="space-y-2">
          {Object.values(IDEOLOGIES).map((ideo) => {
            const active = state.ideology === ideo.id;
            const locked = state.ideologyCooldown > 0;
            return (
              <div
                key={ideo.id}
                className={`rounded-lg border p-3 transition ${active ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800 bg-slate-900/50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-serif font-bold ${ideo.color}`}>{ideo.name}</span>
                  {active ? (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">現体制</span>
                  ) : (
                    <button
                      disabled={cannotAct || locked || state.treasury < IDEOLOGY_CHANGE_COST.treasury}
                      onClick={() => actions.changeIdeology(ideo.id)}
                      className="btn bg-amber-700/80 px-2.5 py-1 text-xs text-amber-50 hover:bg-amber-600"
                    >
                      {locked ? `移行不可（あと${state.ideologyCooldown}ヶ月）` : '体制移行'}
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{ideo.description}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                  {ideo.pros.map((p) => (
                    <span key={p} className="flex items-start gap-1 text-emerald-300/90">
                      <Check className="mt-0.5 h-3 w-3 shrink-0" />
                      {p}
                    </span>
                  ))}
                  {ideo.cons.map((c) => (
                    <span key={c} className="flex items-start gap-1 text-rose-300/90">
                      <X className="mt-0.5 h-3 w-3 shrink-0" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          体制移行コスト: {formatMoney(IDEOLOGY_CHANGE_COST.treasury)}・支持率-{IDEOLOGY_CHANGE_COST.approval}%（以後6ヶ月は再変更不可）
        </p>
      </section>

      {/* 鎖国 */}
      <section>
        <h3 className="mb-2 text-xs font-bold tracking-widest text-slate-400">対外政策</h3>
        <div className={`rounded-lg border p-3 ${state.isolation ? 'border-violet-500/50 bg-violet-950/20' : 'border-slate-800 bg-slate-900/50'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {state.isolation ? <Lock className="h-4 w-4 text-violet-300" /> : <LockOpen className="h-4 w-4 text-slate-400" />}
              <span className="font-serif font-bold text-slate-100">鎖国令</span>
            </div>
            <button
              role="switch"
              aria-checked={state.isolation}
              disabled={disabled}
              onClick={actions.toggleIsolation}
              className={`relative h-7 w-14 rounded-full border transition disabled:opacity-40 ${
                state.isolation ? 'border-violet-400 bg-violet-600' : 'border-slate-600 bg-slate-800'
              }`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${state.isolation ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          <ul className="mt-2 space-y-0.5 text-[11px]">
            <li className="text-rose-300/90">・毎ターンの資金増加量（黒字額）が半減</li>
            <li className="text-emerald-300/90">・他国の宣戦布告を50%、外交イベントを60%の確率でブロック</li>
            <li className="text-emerald-300/90">・支持率が毎ターン微増（+1）</li>
            <li className="text-slate-500">・発令時に全隣国との関係値-5（行動回数は消費しない）</li>
          </ul>
        </div>
      </section>

      {/* 内政施策 */}
      <section>
        <h3 className="mb-2 text-xs font-bold tracking-widest text-slate-400">内政施策</h3>
        <div className="space-y-2">
          {DOMESTIC_ACTIONS.map((a) => {
            const Icon = ACTION_ICONS[a.id];
            return (
              <button
                key={a.id}
                disabled={cannotAct || state.treasury < a.cost}
                onClick={() => actions.domesticAction(a.id)}
                className="group flex w-full items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-left transition hover:border-sky-600/60 hover:bg-sky-950/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-800 disabled:hover:bg-slate-900/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-800 group-hover:bg-sky-900/50">
                  <Icon className="h-4 w-4 text-sky-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-100">{a.name}</span>
                    <span className="font-mono text-xs text-amber-300">-{formatMoney(a.cost)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{a.description}</p>
                  <div className="mt-1 flex gap-2 text-[11px] font-bold">
                    {Object.entries(a.effect).map(([k, v]) => (
                      <span key={k} className={v > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {EFFECT_LABELS[k]} {v > 0 ? '+' : ''}
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
