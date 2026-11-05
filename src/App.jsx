import { useState } from 'react';
import { Globe2, Landmark, Zap } from 'lucide-react';
import Header from './components/Header';
import LogPanel from './components/LogPanel';
import DomesticPanel from './components/DomesticPanel';
import DiplomacyPanel from './components/DiplomacyPanel';
import StatusPanel from './components/StatusPanel';
import EventModal from './components/EventModal';
import GameOverScreen from './components/GameOverScreen';
import EndTurnButton from './components/EndTurnButton';
import ConfirmDialog from './components/ConfirmDialog';
import { useGame } from './hooks/useGame';
import { ACTIONS_PER_TURN } from './game/constants';

const TABS = [
  { id: 'domestic', label: '内政', icon: Landmark },
  { id: 'diplomacy', label: '外交', icon: Globe2 },
];

export default function App() {
  const { state, actions } = useGame();
  const [tab, setTab] = useState('domestic');
  const [confirmReset, setConfirmReset] = useState(false);
  const blocked = !!state.pendingEvent || !!state.gameOver;
  const atWar = state.countries.some((c) => c.atWar);

  return (
    <div className="min-h-screen pb-32">
      <Header state={state} onReset={() => setConfirmReset(true)} />

      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[400px_minmax(0,1fr)_300px]">
        {/* 操作パネル */}
        <aside className="panel flex flex-col overflow-hidden lg:max-h-[calc(100vh-200px)]">
          <div className="flex border-b border-slate-800">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative flex flex-1 items-center justify-center gap-2 py-3 font-serif text-sm font-bold tracking-widest transition ${
                  tab === id ? 'bg-slate-800/60 text-amber-200' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {id === 'diplomacy' && atWar && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
                {tab === id && <span className="absolute inset-x-6 bottom-0 h-0.5 bg-amber-400" />}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/40 px-4 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              今月の残り行動回数
            </span>
            <span className="flex gap-1">
              {Array.from({ length: ACTIONS_PER_TURN }).map((_, i) => (
                <span key={i} className={`h-2.5 w-6 rounded-sm ${i < state.actionsLeft ? 'bg-amber-400' : 'bg-slate-700'}`} />
              ))}
            </span>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
            {tab === 'domestic' ? (
              <DomesticPanel state={state} actions={actions} disabled={blocked} />
            ) : (
              <DiplomacyPanel state={state} actions={actions} disabled={blocked} />
            )}
          </div>
        </aside>

        {/* 中央ログ */}
        <LogPanel logs={state.logs} currentTurn={state.turn} />

        {/* 右サイド: 状況 */}
        <aside className="scrollbar-thin lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto">
          <StatusPanel state={state} />
        </aside>
      </main>

      {!state.gameOver && (
        <EndTurnButton turn={state.turn} actionsLeft={state.actionsLeft} disabled={!!state.pendingEvent} onClick={actions.endTurn} />
      )}

      <EventModal pending={state.pendingEvent} countries={state.countries} onResolve={actions.resolveEvent} />

      {state.gameOver && <GameOverScreen state={state} onRestart={actions.reset} />}

      <ConfirmDialog
        open={confirmReset}
        title="最初からやり直しますか？"
        confirmLabel="リセットする"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          actions.reset();
          setConfirmReset(false);
          setTab('domestic');
        }}
      >
        <p className="text-sm text-slate-300">現在のセーブデータは削除され、2026年4月から新しい政権が始まります。</p>
      </ConfirmDialog>
    </div>
  );
}
