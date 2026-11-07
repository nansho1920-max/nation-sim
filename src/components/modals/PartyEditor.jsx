import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { AXES, PARTY_COLORS, ideologyLabel, makeParty, partyCompatibility } from '../../game/data/parties';
import { estimateSupport, partyDifficulty } from '../../game/engine/parties';
import { Button } from '../ui/kit';

/** 政党を作る・編集するフォーム */
export default function PartyEditor({ initial, others, onSave, onCancel, saveLabel = '保存', extra, saveDisabled = false }) {
  const [draft, setDraft] = useState(() => makeParty(initial));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setAxis = (id, v) => setDraft((d) => ({ ...d, axes: { ...d.axes, [id]: v } }));

  const lineup = [...others.filter((p) => p.id !== draft.id), draft];
  const support = estimateSupport(lineup)[draft.id];
  const stars = partyDifficulty(support);
  const partners = others
    .filter((p) => p.id !== draft.id)
    .map((p) => ({ p, c: partyCompatibility(draft, p) }))
    .sort((a, b) => b.c - a.c);

  return (
    <div className="rounded-xl border border-brass/50 bg-panel p-4 shadow-xl">
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
        <div>
          <label htmlFor="party-name" className="label mb-1 block">
            党名
          </label>
          <input
            id="party-name"
            value={draft.name}
            maxLength={14}
            onChange={(e) => set({ name: e.target.value })}
            className="w-full rounded-lg border border-line-strong bg-night px-3 py-2 text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="party-short" className="label mb-1 block">
            略称
          </label>
          <input
            id="party-short"
            value={draft.short}
            maxLength={3}
            onChange={(e) => set({ short: e.target.value })}
            className="w-full rounded-lg border border-line-strong bg-night px-3 py-2 text-ink focus:border-brass focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="label mb-1">党の色</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PARTY_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => set({ color: c })}
              className={`h-7 w-7 rounded-md border-2 ${draft.color === c ? 'border-white' : 'border-transparent'}`}
              style={{ background: c }}
              aria-label={`色 ${c}`}
            />
          ))}
          <label className="flex items-center gap-1 text-[11px] text-ink-dim">
            <input id="party-color" type="color" value={draft.color} onChange={(e) => set({ color: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line-strong bg-transparent" />
            自由に選ぶ
          </label>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="label">政策の立場</div>
        {AXES.map((ax) => (
          <div key={ax.id}>
            <div className="flex justify-between text-[11px] text-ink-dim">
              <span>{ax.left}</span>
              <span className="font-bold text-ink">{ax.label}</span>
              <span>{ax.right}</span>
            </div>
            <input
              id={`axis-${ax.id}`}
              type="range"
              min={-1}
              max={1}
              step={0.1}
              value={draft.axes[ax.id]}
              onChange={(e) => setAxis(ax.id, Number(e.target.value))}
              className="w-full"
              aria-label={`${ax.label}：${ax.left}〜${ax.right}`}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 rounded-lg bg-night/60 p-3 text-[12px] sm:grid-cols-2">
        <div>
          <div className="text-ink-dim">掲げる理念</div>
          <div className="font-bold text-ink">{ideologyLabel(draft.axes)}</div>
          <div className="mt-1 text-ink-dim">
            平常時の支持率の目安 <span className="num font-bold text-brass-light">{support.toFixed(1)}%</span>
          </div>
          <div className="text-ink-dim">
            与党として遊ぶ難しさ <span className="text-red-400">{'★'.repeat(stars)}</span>
            <span className="text-line-strong">{'★'.repeat(3 - stars)}</span>
          </div>
        </div>
        <div>
          <div className="text-ink-dim">連立の相性</div>
          <ul className="mt-0.5 space-y-0.5">
            {partners.slice(0, 4).map(({ p, c }) => (
              <li key={p.id} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className={`num ${c >= 0.3 ? 'text-emerald-300' : 'text-ink-faint'}`}>{c >= 0.3 ? `連立可 ${Math.round(c * 100)}` : '不可'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {extra?.(draft)}

      <div className="mt-3 flex justify-end gap-2">
        <Button onClick={onCancel}>
          <X className="h-4 w-4" />
          キャンセル
        </Button>
        <Button variant="primary" disabled={!draft.name.trim() || saveDisabled} onClick={() => onSave(makeParty({ ...draft, short: draft.short.trim() || draft.name.slice(0, 2) }))}>
          <Check className="h-4 w-4" />
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
