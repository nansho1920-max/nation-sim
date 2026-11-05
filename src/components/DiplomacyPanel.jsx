import { useState } from 'react';
import { Gift, Handshake, Shield, Swords } from 'lucide-react';
import { AID_COST, PEACE_COST } from '../game/constants';
import { formatMoney } from '../game/utils';
import ConfirmDialog from './ConfirmDialog';

function relationInfo(v) {
  if (v < 20) return { label: '敵対', bar: 'bg-red-500', text: 'text-red-400' };
  if (v < 40) return { label: '緊張', bar: 'bg-orange-500', text: 'text-orange-400' };
  if (v < 60) return { label: '中立', bar: 'bg-slate-400', text: 'text-slate-300' };
  if (v < 80) return { label: '友好', bar: 'bg-emerald-500', text: 'text-emerald-400' };
  return { label: '同盟', bar: 'bg-sky-400', text: 'text-sky-300' };
}

export default function DiplomacyPanel({ state, actions, disabled }) {
  const [confirmWar, setConfirmWar] = useState(null);
  const cannotAct = disabled || state.actionsLeft <= 0;

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-slate-500">
        関係値が<span className="font-bold text-red-400">20未満</span>の国は、ランダムで宣戦布告してくる可能性があります。
        {state.ideology === 'communism' && <span className="text-rose-300"> 共産主義体制のため、関係値が毎ターン減少中。</span>}
      </p>

      {state.countries.map((c) => {
        const info = relationInfo(c.relation);
        const powerRatio = state.military / (state.military + c.military);
        return (
          <div
            key={c.id}
            className={`rounded-lg border p-3 transition ${c.atWar ? 'border-red-700/70 bg-red-950/30 shadow-lg shadow-red-950/40' : 'border-slate-800 bg-slate-900/50'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">{c.flag}</span>
                <div>
                  <div className="font-serif font-bold text-slate-100">{c.name}</div>
                  <div className="text-[11px] text-slate-500">{c.trait}</div>
                </div>
              </div>
              {c.atWar ? (
                <span className="flex items-center gap-1 rounded bg-red-600/30 px-2 py-0.5 text-[11px] font-bold text-red-300">
                  <Swords className="h-3 w-3" /> 交戦中 {c.warTurns}ヶ月
                </span>
              ) : (
                <span className={`rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold ${info.text}`}>{info.label}</span>
              )}
            </div>

            <p className="mt-1.5 text-[11px] text-slate-400">{c.description}</p>

            <div className="mt-2.5 space-y-1.5">
              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">関係値</span>
                  <span className={`font-mono font-bold ${info.text}`}>{Math.round(c.relation)}</span>
                </div>
                <div className="relative mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full ${info.bar} transition-all duration-500`} style={{ width: `${c.relation}%` }} />
                  <div className="absolute left-[20%] top-0 h-full w-px bg-red-400/70" />
                </div>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="flex items-center gap-1 text-slate-500">
                  <Shield className="h-3 w-3" /> 推定軍事力
                </span>
                <span className="font-mono text-slate-300">
                  {Math.round(c.military)}{' '}
                  <span className={powerRatio >= 0.55 ? 'text-emerald-400' : powerRatio <= 0.45 ? 'text-rose-400' : 'text-slate-400'}>
                    （{powerRatio >= 0.55 ? '優勢' : powerRatio <= 0.45 ? '劣勢' : '拮抗'}）
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {c.atWar ? (
                <button
                  disabled={cannotAct || state.treasury < PEACE_COST}
                  onClick={() => actions.suePeace(c.id)}
                  className="btn col-span-2 border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  <Handshake className="h-4 w-4" />
                  講和を申し入れる（{formatMoney(PEACE_COST)}・支持率-10）
                </button>
              ) : (
                <>
                  <button
                    disabled={cannotAct || state.treasury < AID_COST}
                    onClick={() => actions.sendAid(c.id)}
                    className="btn bg-emerald-800/70 text-emerald-50 hover:bg-emerald-700"
                  >
                    <Gift className="h-4 w-4" />
                    資金援助
                    <span className="font-mono text-[10px] opacity-80">-{AID_COST}億</span>
                  </button>
                  <button
                    disabled={cannotAct}
                    onClick={() => setConfirmWar(c)}
                    className="btn bg-red-900/70 text-red-50 hover:bg-red-700"
                  >
                    <Swords className="h-4 w-4" />
                    宣戦布告
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!confirmWar}
        title={`${confirmWar?.name}に宣戦布告しますか？`}
        tone="danger"
        confirmLabel="宣戦布告する"
        onCancel={() => setConfirmWar(null)}
        onConfirm={() => {
          actions.declareWar(confirmWar.id);
          setConfirmWar(null);
        }}
      >
        <ul className="space-y-1 text-sm text-slate-300">
          <li>・戦争中は毎ターン莫大な戦費と軍事力を消費します。</li>
          <li>・勝利すれば支持率+20と賠償金を獲得。敗北・長期化すると支持率が暴落します。</li>
          <li>
            ・{confirmWar && confirmWar.relation < 20 ? '敵対国への開戦は国民に支持されます（支持率+5）。' : '大義なき侵略は支持率-8、他国の関係値も-8されます。'}
          </li>
          <li>
            ・彼我の軍事力: <span className="font-mono">{Math.round(state.military)}</span> vs{' '}
            <span className="font-mono">{Math.round(confirmWar?.military ?? 0)}</span>
          </li>
        </ul>
      </ConfirmDialog>
    </div>
  );
}
