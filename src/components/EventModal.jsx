import {
  Activity, AlertTriangle, Ban, Biohazard, Cpu, Eye, Flame, Gem, Megaphone, ShieldAlert, Swords, TrendingDown, Trophy, Users, Wheat,
} from 'lucide-react';
import { getEventById } from '../game/events';
import { dateLabel, formatMoney } from '../game/utils';

const ICONS = { Activity, Ban, Biohazard, Cpu, Eye, Flame, Gem, Megaphone, ShieldAlert, Swords, TrendingDown, Trophy, Users, Wheat };

const EFFECT_META = {
  approval: { label: '支持率', fmt: (v) => `${v > 0 ? '+' : ''}${v}%` },
  treasury: { label: '国庫', fmt: (v) => `${v > 0 ? '+' : ''}${formatMoney(v)}` },
  economy: { label: '経済力', fmt: (v) => `${v > 0 ? '+' : ''}${v}` },
  military: { label: '軍事力', fmt: (v) => `${v > 0 ? '+' : ''}${v}` },
  relationTarget: { label: '対象国関係', fmt: (v) => `${v > 0 ? '+' : ''}${v}` },
  relationAll: { label: '全隣国関係', fmt: (v) => `${v > 0 ? '+' : ''}${v}` },
};

const TONE = {
  bad: { ring: 'border-rose-800/70', icon: 'text-rose-300 bg-rose-950/60 border-rose-800/60', tag: '緊急事態' },
  good: { ring: 'border-emerald-800/70', icon: 'text-emerald-300 bg-emerald-950/60 border-emerald-800/60', tag: '好機' },
  neutral: { ring: 'border-amber-800/70', icon: 'text-amber-300 bg-amber-950/60 border-amber-800/60', tag: '国家の岐路' },
};

export default function EventModal({ pending, countries, onResolve }) {
  if (!pending) return null;
  const ev = getEventById(pending.id);
  if (!ev) return null;
  const target = countries.find((c) => c.id === pending.targetId);
  const Icon = ICONS[ev.icon] ?? AlertTriangle;
  const tone = TONE[ev.tone] ?? TONE.neutral;
  const text = ev.text.replace('{target}', target?.name ?? '隣国');

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-2xl animate-pop-in overflow-hidden rounded-2xl border bg-slate-900 shadow-2xl ${tone.ring}`}>
        <div className="border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800/60 to-slate-900 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${tone.icon}`}>
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-[0.3em] text-slate-500">
                {tone.tag} ・ {dateLabel(pending.turn)}
              </div>
              <h2 className="font-serif text-2xl font-black tracking-wider text-slate-50">{ev.title}</h2>
              {target && (
                <div className="mt-0.5 text-xs text-slate-400">
                  関係国: {target.flag} {target.name}（関係値 {Math.round(target.relation)}）
                </div>
              )}
            </div>
          </div>
          <p className="mt-4 leading-relaxed text-slate-300">{text}</p>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-2">
          {ev.options.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => onResolve(i)}
              className="group flex flex-col rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-500/70 hover:bg-slate-800 hover:shadow-lg hover:shadow-amber-950/40"
            >
              <span className="font-serif text-base font-bold text-amber-100 group-hover:text-amber-200">
                {String.fromCharCode(65 + i)}. {opt.label}
              </span>
              <span className="mt-1 text-xs text-slate-400">{opt.desc}</span>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(opt.effect).map(([k, v]) => (
                  <span
                    key={k}
                    className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${v > 0 ? 'bg-emerald-950/70 text-emerald-300' : 'bg-rose-950/70 text-rose-300'}`}
                  >
                    {EFFECT_META[k].label} {EFFECT_META[k].fmt(v)}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
