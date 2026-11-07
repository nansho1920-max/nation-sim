import { useMemo, useState } from 'react';
import { AlertTriangle, SlidersHorizontal } from 'lucide-react';
import Modal from './Modal';
import { Button } from '../ui/kit';
import { AXES, axisDistance, ideologyLabel, lawStanceFor, makeParty } from '../../game/data/parties';
import { LAWS } from '../../game/data/laws';
import { estimateSupport, partyOf } from '../../game/engine/parties';
import { partnersLeaving, policyChangeCost } from '../../game/engine/politics';

const STANCE = { 2: '強く賛成', 1: '賛成', 0: '中立', '-1': '反対', '-2': '強く反対' };

/** ゲーム途中で政党の政策の立場を変えるダイアログ */
export default function PolicyDialog({ state: s, party, onApply, onCancel }) {
  const [axes, setAxes] = useState({ ...party.axes });
  const isPlayer = party.id === s.meta.partyId;
  const cost = policyChangeCost(s, party.id, axes);
  const leaving = partnersLeaving(s, party.id, axes);
  const dist = axisDistance(party.axes, axes);

  const { before, after, stanceChanges } = useMemo(() => {
    const moved = makeParty({ ...party, axes });
    const lineup = s.parties.map((p) => (p.id === party.id ? moved : p));
    const changes = LAWS.map((l) => ({ law: l, from: lawStanceFor(party, l), to: lawStanceFor(moved, l) })).filter((x) => x.from !== x.to);
    return { before: estimateSupport(s.parties, s.society.aging)[party.id], after: estimateSupport(lineup, s.society.aging)[party.id], stanceChanges: changes };
  }, [s.parties, s.society.aging, party, axes]);

  const enough = s.politics.capital >= cost;
  return (
    <Modal onClose={onCancel} className="max-w-xl" labelledBy="policy-title">
      <div className="rounded-xl border border-line-strong bg-panel p-5 shadow-2xl">
        <h3 id="policy-title" className="flex items-center gap-2 font-serif text-lg font-bold">
          <SlidersHorizontal className="h-5 w-5 text-brass" />
          {party.name}の{isPlayer ? '政策転換' : '路線変更（政界工作）'}
        </h3>
        <p className="mt-1 text-[12px] text-ink-dim">
          {isPlayer
            ? '与党の政策を変える。支持層や連立相手、法案への賛否が変わる。方針を変えたことへの批判で、一時的に支持を失う。'
            : '政界工作で他党の路線を変えさせる。どの国民層がその党を支持するか、連立の相性、法案への賛否が変わる。'}
        </p>

        <div className="mt-4 space-y-2">
          {AXES.map((ax) => (
            <div key={ax.id}>
              <div className="flex justify-between text-[11px] text-ink-dim">
                <span>{ax.left}</span>
                <span className="font-bold text-ink">
                  {ax.label}
                  {Math.abs(axes[ax.id] - party.axes[ax.id]) > 0.01 && <span className="ml-1 text-brass-light">（変更）</span>}
                </span>
                <span>{ax.right}</span>
              </div>
              <div className="relative">
                <input
                  id={`policy-${ax.id}`}
                  type="range"
                  min={-1}
                  max={1}
                  step={0.1}
                  value={axes[ax.id]}
                  onChange={(e) => setAxes({ ...axes, [ax.id]: Number(e.target.value) })}
                  className="w-full"
                  aria-label={`${ax.label}：${ax.left}〜${ax.right}`}
                />
                <span className="pointer-events-none absolute top-0 h-1.5 w-0.5 bg-white/60" style={{ left: `calc(${((party.axes[ax.id] + 1) / 2) * 100}% )` }} title="現在の位置" />
              </div>
            </div>
          ))}
        </div>

        <dl className="mt-4 grid gap-x-4 gap-y-1 rounded-lg bg-night/60 p-3 text-[12px] sm:grid-cols-2">
          <div>
            <dt className="text-ink-dim">理念</dt>
            <dd className="text-ink">
              {ideologyLabel(party.axes)} → <span className="font-bold text-brass-light">{ideologyLabel(axes)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-dim">平常時の支持率の目安</dt>
            <dd className="num">
              {before.toFixed(1)}% → <span className={after >= before ? 'text-emerald-300' : 'text-red-300'}>{after.toFixed(1)}%</span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-dim">費用</dt>
            <dd className={`num ${enough ? 'text-ink' : 'text-red-300'}`}>
              政治資本 {cost}（所持 {Math.floor(s.politics.capital)}）
            </dd>
          </div>
          {isPlayer && dist >= 0.05 && (
            <div>
              <dt className="text-ink-dim">変節への批判</dt>
              <dd className="num text-red-300">支持率 −{Math.min(6, dist * 5).toFixed(1)}%（一時的）</dd>
            </div>
          )}
        </dl>

        {stanceChanges.length > 0 && (
          <div className="mt-3 text-[12px]">
            <div className="label mb-1">法案への態度が変わる</div>
            <ul className="max-h-28 space-y-0.5 overflow-y-auto scroll-thin">
              {stanceChanges.map(({ law, from, to }) => (
                <li key={law.id} className="flex justify-between gap-2">
                  <span className="truncate text-ink-dim">{law.name}</span>
                  <span className="shrink-0">
                    {STANCE[from]} → <span className={to > from ? 'text-emerald-300' : 'text-red-300'}>{STANCE[to]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {leaving.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-red-800/60 bg-red-950/40 p-2.5 text-[12px] text-red-100">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            政策が離れすぎるため、{leaving.map((p) => partyOf(s, p).name).join('・')}が連立を離脱する。過半数を失う恐れがある。
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel}>キャンセル</Button>
          <Button variant="primary" disabled={cost === 0 || !enough} onClick={() => onApply(axes)}>
            {cost === 0 ? '変更なし' : `政策を変更する（${cost}）`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
