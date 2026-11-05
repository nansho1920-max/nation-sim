import { Award, Coins, Factory, RotateCcw, Shield, Skull, Swords, Users } from 'lucide-react';
import { IDEOLOGIES } from '../game/constants';
import { dateLabel, formatMoney } from '../game/utils';

export default function GameOverScreen({ state, onRestart }) {
  const { gameOver } = state;
  const victory = gameOver.type === 'victory';
  const months = state.turn - (victory ? 1 : 0);

  const rows = [
    { icon: Users, label: '最終支持率', value: `${Math.round(state.approval)}%` },
    { icon: Coins, label: '最終国庫', value: formatMoney(state.treasury) },
    { icon: Factory, label: '経済力', value: Math.round(state.economy) },
    { icon: Shield, label: '軍事力', value: Math.round(state.military) },
    { icon: Swords, label: '戦争（勝/敗）', value: `${state.stats.wars}回（${state.stats.victories}勝${state.stats.defeats}敗）` },
    { icon: Award, label: '国家イベント', value: `${state.stats.events}件` },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center overflow-y-auto bg-black/90 p-4 backdrop-blur">
      <div
        className={`w-full max-w-xl animate-pop-in rounded-2xl border bg-gradient-to-b p-8 text-center shadow-2xl ${
          victory ? 'border-amber-600/60 from-amber-950/50 to-slate-950' : 'border-red-900/70 from-red-950/50 to-slate-950'
        }`}
      >
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 ${
            victory ? 'border-amber-500 bg-amber-900/40 text-amber-300' : 'border-red-700 bg-red-950/60 text-red-400'
          }`}
        >
          {victory ? <Award className="h-10 w-10" /> : <Skull className="h-10 w-10" />}
        </div>
        <div className="mt-4 text-xs font-bold tracking-[0.4em] text-slate-500">{victory ? 'MISSION COMPLETE' : 'GAME OVER'}</div>
        <h2 className={`mt-1 font-serif text-4xl font-black tracking-widest ${victory ? 'text-amber-200' : 'text-red-300'}`}>{gameOver.title}</h2>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-slate-300">{gameOver.reason}</p>
        <p className="mt-2 text-sm text-slate-500">
          {dateLabel(Math.max(1, months))}まで・在任{months}ヶ月・{IDEOLOGIES[state.ideology].name}体制
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 text-left">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
              <Icon className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-[10px] text-slate-500">{label}</div>
                <div className="font-mono text-sm font-bold text-slate-100">{value}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="btn mt-8 bg-gradient-to-r from-amber-600 to-amber-700 px-8 py-3 text-base font-bold text-white shadow-lg shadow-amber-950/50 hover:from-amber-500 hover:to-amber-600"
        >
          <RotateCcw className="h-5 w-5" />
          最初からやり直す
        </button>
      </div>
    </div>
  );
}
