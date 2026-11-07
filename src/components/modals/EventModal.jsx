import { Pause } from 'lucide-react';
import Modal from './Modal';
import { Chip } from '../ui/kit';
import { getIcon } from '../ui/icons';
import { getEvent } from '../../game/data/events';
import { eventText, optionEffects } from '../../game/engine/events';
import { describeEffects } from '../../game/engine/effects';
import { formatDate } from '../../game/core/calendar';

const CAT_TONE = { 経済: 'info', 財政: 'warn', 政治: 'brass', 社会: 'bad', 外交: 'info', 軍事: 'bad', 環境: 'good', 技術: 'good', 教育: 'good' };

export default function EventModal({ state, onResolve }) {
  const pending = state.events.pending;
  const ev = getEvent(pending.id);
  if (!ev) return null;
  const Icon = getIcon(ev.icon);
  const target = pending.ctx?.targetId ? state.world.nations[pending.ctx.targetId] : null;
  return (
    <Modal className="max-w-2xl" labelledBy="event-title">
      <div className="overflow-hidden rounded-2xl border border-brass/40 bg-panel shadow-2xl shadow-black/60">
        <div className="relative border-b border-line bg-gradient-to-br from-raised via-panel to-night px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-brass/40 bg-brass/10">
              <Icon className="h-7 w-7 text-brass-light" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone={CAT_TONE[ev.category] ?? 'neutral'}>{ev.category}</Chip>
                <span className="num text-[11px] text-ink-faint">{formatDate(pending.date)}</span>
                <span className="flex items-center gap-1 text-[11px] text-amber-300">
                  <Pause className="h-3 w-3" />
                  時間停止中
                </span>
              </div>
              <h2 id="event-title" className="mt-1 font-serif text-2xl font-bold tracking-wider text-ink">
                {ev.title}
              </h2>
              {target && (
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-dim">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: target.color }} />
                  {target.name}（関係値 {Math.round(target.relation)}）
                </div>
              )}
            </div>
          </div>
          <p className="mt-4 leading-relaxed text-ink">{eventText(state, ev, pending.ctx)}</p>
        </div>
        <div className={`grid gap-3 p-4 sm:p-5 ${ev.options.length > 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
          {ev.options.map((opt, i) => {
            const eff = optionEffects(state, opt, pending.ctx);
            const chips = eff ? describeEffects(eff, state) : [];
            return (
              <button
                key={opt.label}
                onClick={() => onResolve(i)}
                className="group flex flex-col rounded-xl border border-line-strong bg-raised/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-brass/70 hover:bg-raised hover:shadow-lg"
              >
                <span className="font-serif text-base font-bold text-brass-light">
                  {String.fromCharCode(65 + i)}. {opt.label}
                </span>
                <span className="mt-1 text-[13px] text-ink-dim">{opt.desc}</span>
                {opt.outcome && <span className="mt-2 text-[12px] text-amber-300">成功率 約{Math.round(opt.chance(state) * 100)}%（結果はランダム）</span>}
                {chips.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {chips.map((c, k) => (
                      <Chip key={k} tone={c.tone === 'good' ? 'good' : c.tone === 'bad' ? 'bad' : 'neutral'}>
                        {c.text}
                      </Chip>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
