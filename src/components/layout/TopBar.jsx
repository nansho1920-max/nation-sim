import { memo } from 'react';
import { CircleHelp, Crown, Pause, Play, RotateCcw, Zap } from 'lucide-react';
import { SPEEDS, CAPITAL_MAX } from '../../game/data/balance';
import { partyOf } from '../../game/engine/parties';
import { formatDate } from '../../game/core/calendar';
import { fmtTrillion } from '../../game/core/format';
import { useCountUp } from '../../hooks/useCountUp';
import { Chip } from '../ui/kit';

function Stat({ label, value, sub, tone = 'text-ink', title }) {
  return (
    <div className="min-w-0 px-3 py-1" title={title}>
      <div className="label truncate">{label}</div>
      <div className={`num truncate text-[15px] font-semibold leading-tight ${tone}`}>{value}</div>
      {sub && <div className="num truncate text-[10px] leading-tight">{sub}</div>}
    </div>
  );
}

function TopBar({ state, derived, clock, onHelp, onReset }) {
  const party = partyOf(state, state.meta.partyId);
  const gdp = useCountUp(state.econ.gdp);
  const treasury = useCountUp(state.econ.treasury);
  const appr = useCountUp(derived.approval);
  const growth = state.econ.growth;
  const blockedLabel = state.gameOver ? '終了' : state.events.pending ? 'イベント対応中' : null;

  return (
    <header className="z-30 border-b border-line bg-night/95 backdrop-blur lg:sticky" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brass/40 bg-gradient-to-br from-brass/25 to-transparent">
            <Crown className="h-5 w-5 text-brass" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-serif text-base font-bold tracking-wider text-ink">{state.meta.countryName}</div>
            <div className="flex items-center gap-1.5">
              <Chip>
                <span className="h-2 w-2 rounded-full" style={{ background: party.color }} />
                {party.name}政権
              </Chip>
              <Chip tone="brass">{derived.era}</Chip>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2 py-1">
          <div className="px-1 text-center">
            <div className="num font-serif text-base font-bold text-brass-light sm:text-lg">{formatDate(state.date)}</div>
            <div className="text-[10px] text-ink-faint">任期 {state.month}/120ヶ月</div>
          </div>
          <div className="hidden items-center gap-0.5 lg:flex">
            <button
              onClick={clock.togglePause}
              disabled={clock.blocked}
              className={`btn h-8 w-8 ${clock.speed === 0 ? 'bg-brass text-night' : 'bg-raised text-ink hover:bg-line-strong'}`}
              title="一時停止／再開（Space）"
              aria-label={clock.speed === 0 ? '再開' : '一時停止'}
            >
              {clock.speed === 0 ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            {SPEEDS.filter((s) => s.id > 0).map((s, i) => (
              <button
                key={s.id}
                onClick={() => clock.setSpeed(s.id)}
                disabled={clock.blocked}
                className={`btn num h-8 px-2 text-xs ${clock.speed === s.id ? 'bg-brass/90 text-night' : 'bg-raised text-ink-dim hover:text-ink'}`}
                title={`${s.label}速（キー${i + 1}）`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {blockedLabel && <span className="hidden text-[11px] text-amber-300 sm:inline">{blockedLabel}</span>}
        </div>

        <div className="order-last grid w-full grid-cols-3 divide-x divide-line rounded-lg border border-line bg-panel sm:grid-cols-6 lg:order-none lg:w-auto lg:flex-1">
          <Stat label="GDP" value={fmtTrillion(gdp, 0)} sub={<span className={growth >= 0 ? 'text-emerald-400' : 'text-red-400'}>{growth >= 0 ? '+' : ''}{growth.toFixed(1)}%/年</span>} />
          <Stat
            label="支持率"
            value={`${appr.toFixed(1)}%`}
            tone={derived.approval < 25 ? 'text-red-400' : derived.approval < 40 ? 'text-amber-300' : 'text-emerald-300'}
            sub={<span className="text-ink-faint">議席 {derived.coalitionSeats}/300</span>}
          />
          <Stat label="国庫" value={fmtTrillion(treasury)} sub={<span className="text-ink-faint">債務 {derived.debtRatio.toFixed(0)}%</span>} />
          <Stat label="失業率" value={`${state.econ.unemployment.toFixed(1)}%`} tone={state.econ.unemployment > 8 ? 'text-red-400' : 'text-ink'} />
          <Stat label="インフレ" value={`${state.econ.inflation.toFixed(1)}%`} tone={state.econ.inflation > 6 || state.econ.inflation < 0 ? 'text-amber-300' : 'text-ink'} />
          <div className="px-3 py-1" title="法案提出・外交・予算改定などに使う。支持率が高いほど毎月多く貯まる">
            <div className="label flex items-center gap-1">
              <Zap className="h-3 w-3 text-brass" />
              政治資本
            </div>
            <div className="num text-[15px] font-semibold leading-tight text-brass-light">{Math.floor(state.politics.capital)}</div>
            <div className="mt-0.5 h-1 overflow-hidden rounded bg-night">
              <div className="h-full bg-brass" style={{ width: `${(state.politics.capital / CAPITAL_MAX) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <button onClick={onHelp} className="btn h-8 w-8 text-ink-dim hover:bg-raised hover:text-ink" title="遊び方" aria-label="遊び方">
            <CircleHelp className="h-4 w-4" />
          </button>
          <button onClick={onReset} className="btn h-8 w-8 text-ink-dim hover:bg-raised hover:text-red-300" title="新しいゲーム" aria-label="新しいゲーム">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default memo(TopBar);

/** スマートフォン用：画面下部に固定する時間操作バー */
export function MobileClock({ state, clock }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2 border-t border-line bg-night/95 py-2 backdrop-blur lg:hidden"
      style={{ paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))', paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="min-w-0">
        <div className="num truncate font-serif text-sm font-bold text-brass-light">{formatDate(state.date)}</div>
        <div className="text-[10px] text-ink-faint">{state.events.pending ? 'イベント対応中' : clock.speed === 0 ? '一時停止中' : `${clock.speed}倍速で進行中`}</div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={clock.togglePause}
          disabled={clock.blocked}
          className={`btn h-10 w-10 ${clock.speed === 0 ? 'bg-brass text-night' : 'bg-raised text-ink'}`}
          aria-label={clock.speed === 0 ? '再開' : '一時停止'}
        >
          {clock.speed === 0 ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </button>
        {SPEEDS.filter((s) => s.id > 0).map((s) => (
          <button
            key={s.id}
            onClick={() => clock.setSpeed(s.id)}
            disabled={clock.blocked}
            className={`btn num h-10 px-2.5 text-xs ${clock.speed === s.id ? 'bg-brass/90 text-night' : 'bg-raised text-ink-dim'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
