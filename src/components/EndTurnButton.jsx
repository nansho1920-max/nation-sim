import { ChevronsRight, Hourglass } from 'lucide-react';
import { dateLabel } from '../game/utils';

export default function EndTurnButton({ turn, actionsLeft, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 py-4 pl-5 pr-6 text-left shadow-2xl shadow-amber-900/60 transition hover:-translate-y-0.5 hover:shadow-amber-700/60 active:translate-y-0 disabled:cursor-not-allowed disabled:from-slate-700 disabled:via-slate-700 disabled:to-slate-800 disabled:shadow-none sm:bottom-8 sm:right-8"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/20">
        {disabled ? <Hourglass className="h-6 w-6 text-slate-300" /> : <ChevronsRight className="h-7 w-7 text-white transition group-hover:translate-x-0.5" />}
      </div>
      <div>
        <div className="font-serif text-xl font-black tracking-widest text-white">ターンを進める</div>
        <div className="text-xs text-amber-100/90">
          {disabled ? 'イベントに対応してください' : `${dateLabel(turn)} → ${dateLabel(turn + 1)}`}
          {!disabled && <span className="ml-2 opacity-80">残り行動 {actionsLeft}</span>}
        </div>
      </div>
    </button>
  );
}
