import { useMemo, useState } from 'react';
import { Flag, Globe2, Handshake, Landmark, Shield, Swords, Trophy } from 'lucide-react';
import { Panel, Button, Chip, Bar, KV } from '../ui/kit';
import WorldMap, { MAP_MODES, MapLegend } from '../world/WorldMap';
import { ORGS } from '../../game/data/orgs';
import { getNationDef } from '../../game/data/nations';
import { DIPLO_ACTIONS, areNeighbors, diploAvailability, orgRequirements } from '../../game/engine/diplomacy';
import { enemyOf, playerWarScore, playerWars, playerProvinceCount } from '../../game/engine/derived';
import { fmtPopulation, fmtTrillion } from '../../game/core/format';
import { scale, RELATION_SCALE } from '../ui/colors';

function relationLabel(v) {
  if (v < 20) return '敵対';
  if (v < 40) return '緊張';
  if (v < 60) return '中立';
  if (v < 80) return '友好';
  return '盟友';
}

function NationPanel({ s, d, id, dispatch }) {
  const [confirmWar, setConfirmWar] = useState(false);
  if (id === 'player') {
    return (
      <Panel title={s.meta.countryName} icon={Flag}>
        <dl>
          <KV label="政体">議会制民主主義</KV>
          <KV label="経済体制">{d.fx.planned ? '計画経済' : '市場経済'}</KV>
          <KV label="GDP">{fmtTrillion(s.econ.gdp)}</KV>
          <KV label="人口">{fmtPopulation(s.society.population)}</KV>
          <KV label="軍事力">{d.military.toFixed(0)}</KV>
          <KV label="領土">{playerProvinceCount(s)}州</KV>
          <KV label="国際評価">{s.world.reputation.toFixed(0)}</KV>
        </dl>
        <p className="mt-2 text-[12px] text-ink-faint">地図上の他国をクリックすると、その国の詳細と外交行動が表示される。</p>
      </Panel>
    );
  }
  const n = s.world.nations[id];
  const def = getNationDef(id);
  const alive = s.world.owners.includes(id);
  const war = playerWars(s).find((w) => enemyOf(w) === id);
  const provinces = s.world.owners.filter((o) => o === id).length;
  const neighbor = areNeighbors(s, 'player', id);
  const allied = (s.world.alliances.player ?? []).includes(id);
  const actions = ['envoy', 'aid', s.world.trade[id] ? 'cancelTrade' : 'trade', allied ? 'breakAlliance' : 'alliance', 'sanction'];

  return (
    <Panel title={n.name} icon={Flag} actions={<span className="h-3 w-3 rounded-sm" style={{ background: n.color }} />}>
      <p className="text-[12px] leading-relaxed text-ink-dim">{def.desc}</p>
      {!alive && <p className="mt-2 text-sm text-red-300">この国は滅亡した。</p>}
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-ink-dim">我が国との関係</span>
          <span className="num font-bold" style={{ color: scale(RELATION_SCALE, n.relation / 100) }}>
            {Math.round(n.relation)}（{relationLabel(n.relation)}）
          </span>
        </div>
        <Bar value={n.relation} color={scale(RELATION_SCALE, n.relation / 100)} marker={20} height="h-2" />
        <p className="text-[10px] text-ink-faint">白線（20）を下回ると、宣戦布告される恐れがある。</p>
      </div>
      <dl className="mt-2">
        <KV label="政体">{n.gov}</KV>
        <KV label="GDP（成長率）">
          {fmtTrillion(n.gdp, 0)}（{n.growth >= 0 ? '+' : ''}
          {n.growth.toFixed(1)}%）
        </KV>
        <KV label="人口">{fmtPopulation(n.population)}</KV>
        <KV label="軍事力（我が国）">
          <span className={n.military > d.military ? 'text-red-300' : 'text-emerald-300'}>{n.military.toFixed(0)}</span>
          <span className="text-ink-faint">（{d.military.toFixed(0)}）</span>
        </KV>
        <KV label="領土">{provinces}州</KV>
      </dl>
      <div className="mt-2 flex flex-wrap gap-1">
        {neighbor && <Chip>隣国</Chip>}
        {s.world.trade[id] && <Chip tone="good">貿易協定</Chip>}
        {allied && <Chip tone="info">同盟国</Chip>}
        {n.sanctionTurns > 0 && <Chip tone="warn">我が国が制裁中</Chip>}
        {n.sanctioningPlayer > 0 && <Chip tone="bad">我が国に制裁中</Chip>}
        {war && <Chip tone="bad">交戦中</Chip>}
        {ORGS.filter((o) => s.world.orgs[o.id].includes(id)).map((o) => (
          <Chip key={o.id}>{o.short}</Chip>
        ))}
      </div>

      {alive && !war && (
        <div className="mt-3 space-y-1.5 border-t border-line pt-3">
          <div className="label">外交行動</div>
          {actions.map((a) => {
            const av = diploAvailability(s, a, id);
            const def2 = DIPLO_ACTIONS[a];
            return (
              <div key={a} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink">{def2.label}</div>
                  <div className="text-[10px] text-ink-faint">{av.ok ? def2.desc : av.reason}</div>
                </div>
                <Button size="sm" disabled={!av.ok} onClick={() => dispatch({ type: 'DIPLOMACY', action: a, targetId: id })}>
                  実行（{def2.capital}）
                </Button>
              </div>
            );
          })}
          {!confirmWar ? (
            <Button variant="danger" size="sm" className="mt-2 w-full" disabled={!diploAvailability(s, 'war', id).ok} title={diploAvailability(s, 'war', id).reason} onClick={() => setConfirmWar(true)}>
              <Swords className="h-3.5 w-3.5" />
              宣戦布告（政治資本20）
            </Button>
          ) : (
            <div className="mt-2 rounded-lg border border-red-800/60 bg-red-950/40 p-3 text-[12px] text-red-100">
              <p>
                {n.name}に宣戦布告する。軍事力 我{d.military.toFixed(0)} vs 敵{n.military.toFixed(0)}。
                {n.relation < 20 ? '敵対国への開戦は国民に支持される。' : '大義なき侵略は国民と諸外国の反発を招く。'}
                同盟国が参戦する可能性もある。
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    dispatch({ type: 'DIPLOMACY', action: 'war', targetId: id });
                    setConfirmWar(false);
                  }}
                >
                  開戦する
                </Button>
                <Button size="sm" onClick={() => setConfirmWar(false)}>
                  やめる
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function WarsPanel({ s, dispatch }) {
  const wars = playerWars(s);
  const others = s.world.wars.filter((w) => !wars.includes(w));
  const name = (id) => (id === 'player' ? s.meta.countryName : s.world.nations[id].name);
  if (!wars.length && !others.length) return null;
  return (
    <Panel title="戦争" icon={Swords}>
      <div className="space-y-3">
        {wars.map((w) => {
          const ps = playerWarScore(w);
          const enemy = enemyOf(w);
          return (
            <div key={w.id} className="rounded-lg border border-red-900/60 bg-red-950/30 p-3">
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-red-200">対{name(enemy)}戦争</span>
                <span className="num text-[11px] text-ink-dim">{w.months}ヶ月目</span>
              </div>
              {w.defenderAllies.length > 0 && <div className="text-[11px] text-ink-dim">参戦国：{w.defenderAllies.map(name).join('・')}</div>}
              <div className="mt-2">
                <div className="relative h-3 overflow-hidden rounded bg-night">
                  <div className="absolute top-0 h-full bg-sky-500/80" style={{ left: '50%', width: `${Math.max(0, ps) / 2}%` }} />
                  <div className="absolute top-0 h-full bg-red-500/80" style={{ right: '50%', width: `${Math.max(0, -ps) / 2}%` }} />
                  <div className="absolute left-1/2 top-0 h-full w-px bg-white/60" />
                </div>
                <div className="num mt-0.5 flex justify-between text-[10px] text-ink-faint">
                  <span>敗北 −100</span>
                  <span className={ps >= 0 ? 'text-sky-300' : 'text-red-300'}>
                    戦況 {ps >= 0 ? '+' : ''}
                    {ps.toFixed(0)}
                  </span>
                  <span>勝利 +100</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="good" disabled={ps < 40} title="戦況+40以上で可能" onClick={() => dispatch({ type: 'PEACE', warId: w.id, kind: 'annex' })}>
                  領土割譲を要求（{Math.max(1, Math.floor(ps / 25))}州）
                </Button>
                <Button size="sm" onClick={() => dispatch({ type: 'PEACE', warId: w.id, kind: 'white' })}>
                  白紙講和を提案
                </Button>
                <Button size="sm" variant="danger" onClick={() => dispatch({ type: 'PEACE', warId: w.id, kind: 'concede' })}>
                  降伏する
                </Button>
              </div>
            </div>
          );
        })}
        {others.map((w) => (
          <div key={w.id} className="flex items-center justify-between text-[13px]">
            <span>
              {name(w.attacker)} <Swords className="inline h-3 w-3 text-red-400" /> {name(w.defender)}
            </span>
            <span className="num text-[11px] text-ink-faint">
              {w.months}ヶ月・{w.score >= 0 ? `${name(w.attacker)}優勢` : `${name(w.defender)}優勢`}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">戦況は毎月、双方の軍事力で決まる。戦争中は戦費と軍の損耗が続き、長引くほど国民の不満が高まる。</p>
    </Panel>
  );
}

function OrgsPanel({ s, dispatch }) {
  return (
    <Panel title="国際機関" icon={Landmark}>
      <div className="space-y-3">
        {ORGS.map((o) => {
          const member = s.world.orgs[o.id].includes('player');
          const req = orgRequirements(s, o.id);
          const ok = req.every((r) => r.ok);
          return (
            <div key={o.id} className="rounded-lg border border-line bg-night/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold">{o.name}</span> <span className="text-[11px] text-ink-faint">{o.short}</span>
                </div>
                {member ? (
                  <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'LEAVE_ORG', orgId: o.id })}>
                    脱退
                  </Button>
                ) : (
                  <Button size="sm" disabled={!ok || s.politics.capital < 20} onClick={() => dispatch({ type: 'JOIN_ORG', orgId: o.id })}>
                    加盟申請（20）
                  </Button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-ink-dim">{o.desc}</p>
              <div className="mt-1 text-[11px] text-ink-faint">
                加盟国：{s.world.orgs[o.id].map((m) => (m === 'player' ? s.meta.countryName : s.world.nations[m].name)).join('・')}
              </div>
              {!member && (
                <ul className="mt-1 space-y-0.5">
                  {req.map((r) => (
                    <li key={r.label} className={`text-[11px] ${r.ok ? 'text-emerald-300' : 'text-red-300'}`}>
                      {r.ok ? '✓' : '✗'} {r.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Rankings({ s, d }) {
  const rows = [
    { id: 'player', name: s.meta.countryName, gdp: s.econ.gdp, pop: s.society.population, mil: d.military, prov: playerProvinceCount(s) },
    ...Object.values(s.world.nations)
      .filter((n) => s.world.owners.includes(n.id))
      .map((n) => ({ id: n.id, name: n.name, gdp: n.gdp, pop: n.population, mil: n.military, prov: s.world.owners.filter((o) => o === n.id).length })),
  ].sort((a, b) => b.gdp - a.gdp);
  return (
    <Panel title="大陸の国力ランキング" icon={Trophy} bodyClass="overflow-x-auto p-0">
      <table className="w-full min-w-[460px] text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] text-ink-faint">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">国名</th>
            <th className="px-3 py-2 text-right font-medium">GDP</th>
            <th className="px-3 py-2 text-right font-medium">人口</th>
            <th className="px-3 py-2 text-right font-medium">軍事力</th>
            <th className="px-3 py-2 text-right font-medium">州</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={`border-b border-line/60 ${r.id === 'player' ? 'bg-brass/10 font-bold' : ''}`}>
              <td className="num px-3 py-1.5 text-ink-faint">{i + 1}</td>
              <td className="px-3 py-1.5">{r.name}</td>
              <td className="num px-3 py-1.5 text-right">{fmtTrillion(r.gdp, 0)}</td>
              <td className="num px-3 py-1.5 text-right">{fmtPopulation(r.pop)}</td>
              <td className="num px-3 py-1.5 text-right">{r.mil.toFixed(0)}</td>
              <td className="num px-3 py-1.5 text-right">{r.prov}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export default function World({ state: s, derived: d, dispatch }) {
  const [mode, setMode] = useState('political');
  const [selected, setSelected] = useState('player');
  const player = useMemo(
    () => ({ name: s.meta.countryName, gdp: s.econ.gdp, population: s.society.population, environment: s.society.environment, relation: 100 }),
    [s.meta.countryName, s.econ.gdp, s.society.population, s.society.environment],
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-bold tracking-wider">世界</h1>
        <div className="flex flex-wrap gap-1.5">
          <Chip>国際評価 {s.world.reputation.toFixed(0)}</Chip>
          <Chip tone={d.atWar ? 'bad' : 'good'}>{d.atWar ? '戦時下' : '平時'}</Chip>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="panel p-2">
            <div className="mb-2 flex flex-wrap items-center gap-1 px-1">
              <Globe2 className="mr-1 h-4 w-4 text-brass" />
              {MAP_MODES.map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} className={`rounded-md px-2.5 py-1 text-xs ${mode === m.id ? 'bg-brass text-night font-bold' : 'bg-raised text-ink-dim hover:text-ink'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <WorldMap world={s.world} player={player} mode={mode} selected={selected} onSelect={setSelected} />
            <div className="mt-2 px-1">
              <MapLegend mode={mode} />
            </div>
          </div>
          <Rankings s={s} d={d} />
        </div>
        <div className="space-y-4">
          <NationPanel s={s} d={d} id={selected} dispatch={dispatch} />
          <WarsPanel s={s} dispatch={dispatch} />
          <OrgsPanel s={s} dispatch={dispatch} />
          <Panel title="同盟" icon={Shield} bodyClass="p-3">
            {(s.world.alliances.player ?? []).length ? (
              <div className="flex flex-wrap gap-1.5">
                {s.world.alliances.player.map((a) => (
                  <Chip key={a} tone="info">
                    <Handshake className="h-3 w-3" />
                    {s.world.nations[a].name}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-faint">同盟国はない。関係値75以上の国と同盟を結べる。</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
