import { memo, useEffect, useMemo, useState } from 'react';
import { Check, Crown, Dices, Eraser, Pencil, Play, Plus, RotateCcw, Shuffle, Star, Trash2, Wand2 } from 'lucide-react';
import { SCENARIOS } from '../../game/data/scenarios';
import { DIFFICULTIES } from '../../game/data/balance';
import { DEFAULT_PARTIES, MAX_PARTIES, MIN_PARTIES, PARTY_COLORS, ideologyLabel } from '../../game/data/parties';
import { estimateSupport, partyDifficulty } from '../../game/engine/parties';
import { generateRandomParties, generateRandomSetup } from '../../game/engine/generator';
import { getWorldMap, MAP_W, MAP_H } from '../../game/world/mapgen';
import { randomSeed } from '../../game/core/rng';
import { Button, Chip } from '../ui/kit';
import PartyEditor from './PartyEditor';

function Stars({ n }) {
  return (
    <span className="inline-flex" title={`与党として遊ぶ難しさ ${n}/3`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} className={`h-3 w-3 ${i <= n ? 'fill-red-400 text-red-400' : 'text-line-strong'}`} />
      ))}
    </span>
  );
}

/** ランダム世界の地図サムネイル */
const MiniMap = memo(function MiniMap({ setup }) {
  const specs = [{ id: 'player', sizeWeight: setup.scenario.sizeWeight }, ...setup.nations.map((n) => ({ id: n.id, sizeWeight: n.sizeWeight }))];
  const map = getWorldMap(setup.worldSeed, specs);
  const colors = Object.fromEntries([['player', '#e3b341'], ...setup.nations.map((n) => [n.id, n.color])]);
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full rounded-lg" role="img" aria-label="生成された大陸の地図">
      <rect width={MAP_W} height={MAP_H} fill="#0b1a2e" />
      {map.provinces.map((p) => (
        <path key={p.id} d={p.path} fill={colors[map.initialOwner[p.id]]} stroke="#06080f" strokeWidth="0.8" strokeOpacity="0.5" />
      ))}
      <path d={map.coastPath} fill="none" stroke="#b9cde0" strokeWidth="2" opacity="0.5" />
    </svg>
  );
});

/** クリックするとその場で書き換えられる名前 */
function InlineName({ value, onChange, label, maxLength = 20, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft.trim()) onChange(draft.trim());
    else setDraft(value);
    setEditing(false);
  };
  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        <input
          autoFocus
          value={draft}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Escape' && (setDraft(value), setEditing(false))}
          aria-label={label}
          className={`min-w-0 flex-1 rounded border border-brass bg-night px-2 py-0.5 text-ink focus:outline-none ${className}`}
        />
        <button type="submit" className="btn h-7 w-7 text-emerald-300 hover:bg-raised" aria-label="決定">
          <Check className="h-4 w-4" />
        </button>
      </form>
    );
  }
  return (
    <button onClick={() => setEditing(true)} className={`group inline-flex max-w-full items-center gap-1.5 text-left ${className}`} title={label} aria-label={label}>
      <span className="truncate">{value}</span>
      <Pencil className="h-3 w-3 shrink-0 text-ink-faint group-hover:text-brass" />
    </button>
  );
}

function RandomPreview({ setup, onReroll, countryName, onRenameCountry, nationNames, onRenameNation }) {
  const sc = setup.scenario;
  return (
    <div className="mt-3 grid gap-4 rounded-xl border border-brass/50 bg-panel p-4 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="label">生成された国家</div>
            <InlineName value={countryName || sc.countryName} onChange={onRenameCountry} label="自国の国名を変更" className="font-serif text-xl font-bold text-brass-light" />
          </div>
          <Button size="sm" onClick={onReroll}>
            <Dices className="h-4 w-4" />
            作り直す
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {sc.traits.map((t) => (
            <Chip key={t} tone="brass">
              {t}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">{sc.desc}</p>
        <dl className="num mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[12px] sm:grid-cols-3">
          <div>GDP {sc.econ.gdp}兆</div>
          <div>人口 {sc.society.population.toLocaleString('ja-JP')}万人</div>
          <div>債務 {Math.round(sc.econ.debtRatio * 100)}%</div>
          <div>失業 {sc.econ.unemployment}%</div>
          <div>インフレ {sc.econ.inflation}%</div>
          <div>高齢化 {sc.society.aging}%</div>
          <div>教育 {sc.society.education}</div>
          <div>汚職 {sc.society.corruption}</div>
          <div>選挙まで {sc.monthsToElection}ヶ月</div>
        </dl>
        <div className="mt-3">
          <div className="label mb-1">周辺の国々</div>
          <ul className="space-y-0.5 text-[12px]">
            {setup.nations.map((n) => (
              <li key={n.id} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: n.color }} />
                <InlineName value={nationNames[n.id] ?? n.name} onChange={(v) => onRenameNation(n.id, v)} label={`${n.name}の国名を変更`} className="min-w-0 text-ink" />
                <span className="truncate text-ink-faint">{n.gov}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <MiniMap setup={setup} />
        <p className="mt-1 text-[11px] text-ink-faint">金色が自国。地形・国境・外国の性格まで毎回新しく生成される。</p>
      </div>
    </div>
  );
}

const freshDefaults = () => DEFAULT_PARTIES.map((p) => ({ ...p, axes: { ...p.axes } }));

export default function NewGameScreen({ onStart, legacy, onCancel }) {
  const [scenarioId, setScenario] = useState('standard');
  const [scenarioSeed, setScenarioSeed] = useState(() => randomSeed());
  const [difficulty, setDifficulty] = useState('normal');
  const [parties, setParties] = useState(freshDefaults);
  const [partyId, setParty] = useState('conservative');
  const [editing, setEditing] = useState(null); // 編集中の政党（新規は id が未登録）
  const [countryName, setCountryName] = useState('');
  const [nationNames, setNationNames] = useState({});
  // 世界を作り直したら、周辺国の名前の変更は取り消す（国が入れ替わるため）
  useEffect(() => setNationNames({}), [scenarioSeed]);

  const randomSetup = useMemo(() => (scenarioId === 'random' ? generateRandomSetup(scenarioSeed) : null), [scenarioId, scenarioSeed]);
  const sc = randomSetup ? randomSetup.scenario : SCENARIOS.find((s) => s.id === scenarioId);
  const support = useMemo(() => estimateSupport(parties), [parties]);

  const newPartyTemplate = () => {
    let i = 1;
    while (parties.some((p) => p.id === `custom${i}`)) i += 1;
    const used = new Set(parties.map((p) => p.color));
    return { id: `custom${i}`, name: '新しい政党', short: '新党', color: PARTY_COLORS.find((c) => !used.has(c)) ?? '#7d8ca3', axes: { econ: 0, social: 0, eco: 0, nation: 0, reform: 0 } };
  };

  const saveParty = (p) => {
    setParties((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p]));
    setParty(p.id);
    setEditing(null);
  };

  const removeParty = (id) => {
    const next = parties.filter((p) => p.id !== id);
    setParties(next);
    if (partyId === id) setParty(next[0]?.id ?? null);
  };

  const randomizeParties = () => {
    const list = generateRandomParties(randomSeed());
    setParties(list);
    setParty(list[0].id);
    setEditing(null);
  };

  const start = (opts = {}) =>
    onStart({
      scenarioId,
      scenarioSeed,
      difficulty,
      partyId,
      parties,
      countryName: countryName.trim() || sc.countryName,
      nationNames: scenarioId === 'random' ? nationNames : {},
      ...opts,
    });

  const startAllRandom = () => {
    const list = generateRandomParties(randomSeed());
    const seed = randomSeed();
    const pick = list[Math.floor(Math.random() * list.length)];
    onStart({ scenarioId: 'random', scenarioSeed: seed, difficulty, partyId: pick.id, parties: list, countryName: generateRandomSetup(seed).scenario.countryName });
  };

  return (
    <div className="min-h-screen py-8" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}>
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brass/50 bg-brass/10">
            <Crown className="h-7 w-7 text-brass" />
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-[0.2em] text-ink sm:text-4xl">国家統治シミュレーター II</h1>
          <p className="mt-2 text-sm text-ink-dim">政治・経済・外交・社会。時の流れの中で、国家のすべてを導け。</p>
          <Button variant="primary" className="mt-4" onClick={startAllRandom}>
            <Wand2 className="h-4 w-4" />
            すべてランダムで始める
          </Button>
          <p className="mt-1 text-[11px] text-ink-faint">国・世界・政党構成・あなたの政党をすべて無作為に決めて、すぐに始める。</p>
        </header>

        {legacy && <p className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-center text-[13px] text-amber-200">旧バージョンのセーブデータは新しいシステムと互換性がないため、新しいゲームとして開始します。</p>}

        <section className="mt-8">
          <h2 className="label mb-2">1. シナリオ</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => {
                if (scenarioId === 'random') setScenarioSeed(randomSeed());
                setScenario('random');
              }}
              className={`rounded-xl border p-4 text-left transition ${scenarioId === 'random' ? 'border-brass bg-brass/10 shadow-lg shadow-brass/10' : 'border-dashed border-brass/50 bg-panel hover:border-brass'}`}
            >
              <div className="flex items-center gap-2 font-serif text-lg font-bold">
                <Shuffle className="h-5 w-5 text-brass" />
                ランダム生成
              </div>
              <div className="text-[12px] text-brass-light">毎回まったく違う国と世界</div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-dim">国名、経済・社会の状態、地形と国境、周辺7か国の政体や性格、国同士の対立関係、国際機関の顔ぶれまで、すべて無作為に作られる。</p>
            </button>
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
          {randomSetup && (
            <RandomPreview
              setup={randomSetup}
              onReroll={() => setScenarioSeed(randomSeed())}
              countryName={countryName.trim()}
              onRenameCountry={setCountryName}
              nationNames={nationNames}
              onRenameNation={(id, name) => setNationNames((m) => ({ ...m, [id]: name }))}
            />
          )}
        </section>

        <section className="mt-8">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="label">2. 政党の顔ぶれと、あなたの政党</h2>
              <p className="text-[11px] text-ink-faint">
                政党は{MIN_PARTIES}〜{MAX_PARTIES}つ。今の顔ぶれを編集しても、「白紙から作る」で1からすべて自分で決めてもよい。選んだ党があなたの与党になる。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" disabled={parties.length >= MAX_PARTIES || !!editing} onClick={() => setEditing(newPartyTemplate())}>
                <Plus className="h-3.5 w-3.5" />
                政党を作る
              </Button>
              <Button size="sm" onClick={randomizeParties}>
                <Dices className="h-3.5 w-3.5" />
                ランダムな政党構成
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setParties([]);
                  setParty(null);
                  setEditing({ id: 'custom1', name: '新しい政党', short: '新党', color: PARTY_COLORS[0], axes: { econ: 0, social: 0, eco: 0, nation: 0, reform: 0 } });
                }}
              >
                <Eraser className="h-3.5 w-3.5" />
                白紙から作る
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setParties(freshDefaults());
                  setParty('conservative');
                  setEditing(null);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                初期設定
              </Button>
            </div>
          </div>
          {editing && <PartyEditor key={editing.id} initial={editing} others={parties} onSave={saveParty} onCancel={() => setEditing(null)} />}
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {parties.length === 0 && !editing && (
              <p className="rounded-lg border border-dashed border-line-strong p-4 text-[13px] text-ink-dim sm:col-span-2 lg:col-span-3">
                まだ政党がありません。「政党を作る」で、党名・色・政策を決めて1つずつ作ってください（最低{MIN_PARTIES}党）。
              </p>
            )}
            {parties.map((p) => (
              <div key={p.id} className={`flex items-center gap-2 rounded-lg border p-3 transition ${partyId === p.id ? 'border-brass bg-brass/10' : 'border-line bg-panel'}`}>
                <button onClick={() => setParty(p.id)} className="min-w-0 flex-1 text-left" aria-pressed={partyId === p.id}>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: p.color }} />
                    <span className="truncate font-bold">{p.name}</span>
                    {partyId === p.id && <Chip tone="brass">あなたの党</Chip>}
                  </div>
                  <div className="truncate text-[11px] text-ink-faint">{ideologyLabel(p.axes)}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-dim">
                    <span className="num">支持の目安 {support[p.id].toFixed(1)}%</span>
                    <Stars n={partyDifficulty(support[p.id])} />
                  </div>
                </button>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setEditing(p)} disabled={!!editing} className="btn h-7 w-7 text-ink-dim hover:bg-raised hover:text-ink" aria-label={`${p.name}を編集`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => removeParty(p.id)} className="btn h-7 w-7 text-ink-dim hover:bg-raised hover:text-red-300" aria-label={`${p.name}を削除`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">★が多いほど支持基盤が小さく、選挙で政権を維持するのが難しい。政策の近い政党ほど連立を組みやすい。</p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
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
            <p className="mt-1 text-[11px] text-ink-faint">空欄なら「{sc.countryName}」になる。</p>
          </div>
        </section>

        <div className="mt-8 flex flex-col items-center gap-2">
          <Button variant="primary" size="lg" className="px-10" disabled={!!editing || parties.length < MIN_PARTIES || !partyId} onClick={() => start()}>
            <Play className="h-5 w-5" />
            政権を発足させる
          </Button>
          {editing && <p className="text-[11px] text-amber-300">編集中の政党を保存するか、キャンセルしてください。</p>}
          {!editing && parties.length < MIN_PARTIES && <p className="text-[11px] text-amber-300">政党はあと{MIN_PARTIES - parties.length}つ必要です（最低{MIN_PARTIES}党）。「政党を作る」で追加してください。</p>}
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
