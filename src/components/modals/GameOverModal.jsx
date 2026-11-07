import { Award, BarChart3, RotateCcw, Skull } from 'lucide-react';
import Modal from './Modal';
import { Button, Bar } from '../ui/kit';
import { evaluate } from '../../game/engine/scoring';
import { formatYM } from '../../game/core/calendar';
import { fmtTrillion } from '../../game/core/format';
import { getParty } from '../../game/data/parties';
import { getScenario } from '../../game/data/scenarios';

const RANK_COLOR = { S: '#ecc77e', A: '#4cb782', B: '#4f9fd6', C: '#c9c27a', D: '#e05252' };

export default function GameOverModal({ state: s, onNewGame, onReview }) {
  const ev = evaluate(s);
  const victory = s.gameOver.type === 'victory';
  return (
    <Modal className="max-w-3xl" labelledBy="gameover-title">
      <div className={`overflow-hidden rounded-2xl border bg-panel shadow-2xl ${victory ? 'border-brass/60' : 'border-red-900/70'}`}>
        <div className={`px-6 py-6 text-center ${victory ? 'bg-gradient-to-b from-brass/15 to-transparent' : 'bg-gradient-to-b from-red-950/60 to-transparent'}`}>
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 ${victory ? 'border-brass text-brass-light' : 'border-red-700 text-red-400'}`}>
            {victory ? <Award className="h-8 w-8" /> : <Skull className="h-8 w-8" />}
          </div>
          <div className="mt-3 text-[11px] font-bold tracking-[0.4em] text-ink-faint">{victory ? 'TERM COMPLETE' : 'GAME OVER'}</div>
          <h2 id="gameover-title" className={`font-serif text-4xl font-bold tracking-widest ${victory ? 'text-brass-light' : 'text-red-300'}`}>
            {s.gameOver.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink">{s.gameOver.reason}</p>
          <p className="mt-1 text-xs text-ink-faint">
            {s.meta.countryName}・{getParty(s.meta.partyId).name}政権・シナリオ「{getScenario(s.meta.scenarioId).name}」・{formatYM(s.date)}まで在任{s.month}ヶ月
          </p>
        </div>
        <div className="grid gap-5 px-6 pb-6 md:grid-cols-[180px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-night/60 p-4">
            <div className="label">政権評価</div>
            <div className="font-serif text-7xl font-bold" style={{ color: RANK_COLOR[ev.rank] }}>
              {ev.rank}
            </div>
            <div className="num text-sm text-ink-dim">{ev.total.toFixed(1)} 点</div>
          </div>
          <div className="space-y-2">
            {ev.categories.map((c) => (
              <div key={c.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="num text-ink-dim">{c.score.toFixed(0)}</span>
                </div>
                <Bar value={c.score} color={c.score >= 70 ? '#4cb782' : c.score >= 45 ? '#d4a24c' : '#e05252'} />
                <div className="text-[11px] text-ink-faint">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-line px-6 py-4">
          <div className="label mb-2">獲得した称号</div>
          <div className="flex flex-wrap gap-2">
            {ev.titles.map((t) => (
              <div key={t.name} className="rounded-lg border border-brass/40 bg-brass/10 px-3 py-1.5">
                <div className="font-serif font-bold text-brass-light">{t.name}</div>
                <div className="text-[11px] text-ink-dim">{t.desc}</div>
              </div>
            ))}
          </div>
          <div className="num mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-ink-dim sm:grid-cols-4">
            <span>GDP {fmtTrillion(s.econ.gdp, 0)}（{ev.gdpChange >= 0 ? '+' : ''}{ev.gdpChange.toFixed(0)}%）</span>
            <span>選挙勝利 {s.stats.electionsWon}回</span>
            <span>成立させた法律 {s.stats.lawsPassed}</span>
            <span>研究した技術 {s.tech.researched.length}</span>
            <span>戦争 {s.stats.wars}回（{s.stats.warsWon}勝{s.stats.warsLost}敗）</span>
            <span>併合 {s.stats.provincesGained}州 / 喪失 {s.stats.provincesLost}州</span>
            <span>国家イベント {s.stats.events}件</span>
            <span>公約実現 {s.stats.promisesKept}回</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 border-t border-line px-6 py-4">
          <Button variant="primary" size="lg" onClick={onNewGame}>
            <RotateCcw className="h-4 w-4" />
            新しい国家を率いる
          </Button>
          <Button size="lg" onClick={onReview}>
            <BarChart3 className="h-4 w-4" />
            記録を振り返る
          </Button>
        </div>
      </div>
    </Modal>
  );
}
