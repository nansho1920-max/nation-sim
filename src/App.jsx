import { Suspense, lazy, useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import { useGame } from './hooks/useGame';
import { useGameClock } from './hooks/useGameClock';
import { deriveAll } from './game/engine/derived';
import { clearLegacySaves, hasLegacySave } from './game/save';
import TopBar, { MobileClock } from './components/layout/TopBar';
import NewsTicker from './components/layout/NewsTicker';
import SideNav from './components/layout/SideNav';
import Overview from './components/screens/Overview';
import Economy from './components/screens/Economy';
import Society from './components/screens/Society';
import Politics from './components/screens/Politics';
import World from './components/screens/World';
import Tech from './components/screens/Tech';
import History from './components/screens/History';
import EventModal from './components/modals/EventModal';
import GameOverModal from './components/modals/GameOverModal';
import NewGameScreen from './components/modals/NewGameScreen';
import HelpModal from './components/modals/HelpModal';
import ConfirmDialog from './components/modals/ConfirmDialog';
import { Button } from './components/ui/kit';

const Stats = lazy(() => import('./components/screens/Stats'));
const SCREEN_COMPONENTS = { overview: Overview, economy: Economy, society: Society, politics: Politics, world: World, tech: Tech, stats: Stats, history: History };
const HELP_KEY = 'nation-sim-help-seen';

export default function App() {
  const { state, dispatch, newGame } = useGame();
  const clock = useGameClock(state, dispatch);
  const derived = useMemo(() => (state ? deriveAll(state) : null), [state]);
  const [screen, setScreen] = useState('overview');
  const [help, setHelp] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [setup, setSetup] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const start = (options) => {
    clearLegacySaves();
    clock.setSpeed(0);
    newGame(options);
    setSetup(false);
    setReviewing(false);
    setScreen('overview');
    try {
      if (!localStorage.getItem(HELP_KEY)) {
        setHelp(true);
        localStorage.setItem(HELP_KEY, '1');
      }
    } catch {
      /* noop */
    }
  };

  if (!state || setup) {
    return <NewGameScreen legacy={!state && hasLegacySave()} onStart={start} onCancel={state ? () => setSetup(false) : null} />;
  }

  const Screen = SCREEN_COMPONENTS[screen];
  const badges = {
    politics: state.politics.nextElection - state.month <= 3,
    world: derived.atWar,
    tech: !state.tech.current,
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-10">
      <TopBar state={state} derived={derived} clock={clock} onHelp={() => setHelp(true)} onReset={() => setConfirmReset(true)} />
      <NewsTicker news={state.news} />
      {state.gameOver && reviewing && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-brass/40 bg-brass/10 px-4 py-2 text-sm">
          <span>
            ゲーム終了：<span className="font-bold">{state.gameOver.title}</span>
          </span>
          <Button size="sm" onClick={() => setReviewing(false)}>
            <Award className="h-3.5 w-3.5" />
            評価を見る
          </Button>
          <Button size="sm" variant="primary" onClick={() => setSetup(true)}>
            新しいゲーム
          </Button>
        </div>
      )}
      <div
        className="mx-auto grid max-w-[1680px] gap-4 py-4 lg:grid-cols-[190px_minmax(0,1fr)]"
        style={{ paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}
      >
        <aside className="min-w-0">
          <SideNav value={screen} onChange={setScreen} badges={badges} />
        </aside>
        <main className="min-w-0">
          <Suspense fallback={<p className="py-10 text-center text-ink-faint">読み込み中…</p>}>
            <Screen state={state} derived={derived} dispatch={dispatch} go={setScreen} />
          </Suspense>
        </main>
      </div>

      <MobileClock state={state} clock={clock} />
      {state.events.pending && !state.gameOver && <EventModal state={state} onResolve={(index) => dispatch({ type: 'RESOLVE_EVENT', index })} />}
      {state.gameOver && !reviewing && <GameOverModal state={state} onNewGame={() => setSetup(true)} onReview={() => setReviewing(true)} />}
      {help && <HelpModal onClose={() => setHelp(false)} />}
      {confirmReset && (
        <ConfirmDialog
          title="新しいゲームを始めますか？"
          confirmLabel="設定画面へ"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            clock.setSpeed(0);
            setSetup(true);
          }}
        >
          現在のゲームは、新しいゲームを開始した時点で上書きされます。
        </ConfirmDialog>
      )}
    </div>
  );
}
