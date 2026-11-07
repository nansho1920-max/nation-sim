import { useState } from 'react';
import { Crown, Play, Star } from 'lucide-react';
import { SCENARIOS } from '../../game/data/scenarios';
import { DIFFICULTIES } from '../../game/data/balance';
import { PARTIES } from '../../game/data/parties';
import { Button, Chip } from '../ui/kit';

// 政党ごとの難しさ（支持基盤の広さと連立の組みやすさ）
const PARTY_DIFFICULTY = { conservative: 1, nationalist: 2, reform: 2, socdem: 2, liberal: 3, green: 3 };

function Stars({ n }) {
  return (
    <span className="inline-flex" title={`難しさ ${n}/3`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} className={`h-3 w-3 ${i <= n ? 'fill-red-400 text-red-400' : 'text-line-strong'}`} />
      ))}
    </span>
  );
}

export default function NewGameScreen({ onStart, legacy, onCancel }) {
  const [scenarioId, setScenario] = useState('standard');
  const [difficulty, setDifficulty] = useState('normal');
  const [partyId, setParty] = useState('conservative');
  const sc = SCENARIOS.find((s) => s.id === scenarioId);
  const [countryName, setCountryName] = useState('');

  return (
    <div className="min-h-screen px-4 py-8" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}>
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brass/50 bg-brass/10">
            <Crown className="h-7 w-7 text-brass" />
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-[0.2em] text-ink sm:text-4xl">国家統治シミュレーター II</h1>
          <p className="mt-2 text-sm text-ink-dim">政治・経済・外交・社会。時の流れの中で、国家のすべてを導け。</p>
        </header>

        {legacy && <p className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-center text-[13px] text-amber-200">旧バージョンのセーブデータは新しいシステムと互換性がないため、新しいゲームとして開始します。</p>}

        <section className="mt-8">
          <h2 className="label mb-2">1. シナリオ</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={`rounded-xl border p-4 text-left transition ${scenarioId === s.id ? 'border-brass bg-brass/10 shadow-lg shadow-brass/10' : 'border-line bg-panel hover:border-line-strong'}`}
              >
                <div className="font-serif text-lg font-bold">{s.name}</div>
                <div className="text-[12px] text-brass-light">{s.tagline}</div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-dim">{s.desc}</p>
                <div className="num mt-2 flex flex-wrap gap-1">
                  <Chip>GDP {s.econ.gdp}兆</Chip>
                  <Chip>債務 {Math.round(s.econ.debtRatio * 100)}%</Chip>
                  <Chip>失業 {s.econ.unemployment}%</Chip>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="label mb-2">2. 与党（あなたの政党）</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {PARTIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setParty(p.id)}
                  className={`rounded-lg border p-3 text-left transition ${partyId === p.id ? 'border-brass bg-brass/10' : 'border-line bg-panel hover:border-line-strong'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="h-3 w-3 rounded-sm" style={{ background: p.color }} />
                      {p.name}
                    </span>
                    <Stars n={PARTY_DIFFICULTY[p.id]} />
                  </div>
                  <div className="text-[11px] text-ink-faint">{p.ideology}</div>
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">★が多いほど支持基盤が小さく、選挙で政権を維持するのが難しい。</p>
          </div>
          <div className="space-y-6">
            <div>
              <h2 className="label mb-2">3. 難易度</h2>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(DIFFICULTIES).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`rounded-lg border p-3 text-left transition ${difficulty === d.id ? 'border-brass bg-brass/10' : 'border-line bg-panel hover:border-line-strong'}`}
                  >
                    <div className="font-bold">{d.label}</div>
                    <div className="text-[11px] text-ink-faint">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="country-name" className="label mb-2 block">
                4. 国名
              </label>
              <input
                id="country-name"
                value={countryName}
                onChange={(e) => setCountryName(e.target.value.slice(0, 20))}
                placeholder={sc.countryName}
                className="w-full rounded-lg border border-line-strong bg-panel px-3 py-2 text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none"
              />
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-col items-center gap-2">
          <Button variant="primary" size="lg" className="px-10" onClick={() => onStart({ scenarioId, difficulty, partyId, countryName: countryName || sc.countryName })}>
            <Play className="h-5 w-5" />
            政権を発足させる
          </Button>
          {onCancel && (
            <button onClick={onCancel} className="text-sm text-ink-dim hover:text-ink">
              現在のゲームに戻る
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
