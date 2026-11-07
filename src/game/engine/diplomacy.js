// 外交・戦争・AI国家の行動
import { approach, clamp, sum } from '../core/math';
import { AI_NATION_IDS, INITIAL_OPINIONS, getNationDef } from '../data/nations';
import { ORGS, getOrg } from '../data/orgs';
import { getWorldMap } from '../world/mapgen';
import { addLog, addModifier, addNews, applyEffects, registerSpecial } from './effects';
import { aggregateEffects, energyStats, militaryPower, ministerEff, playerWars } from './derived';

export const nationName = (s, id) => (id === 'player' ? s.meta.countryName : s.world.nations[id]?.name ?? id);

const opinionKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const getOpinion = (s, a, b) => s.world.opinions[opinionKey(a, b)] ?? 50;
const setOpinion = (s, a, b, v) => {
  s.world.opinions[opinionKey(a, b)] = clamp(v, 0, 100);
};

// ---------- 地理 ----------

/** 2国が国境を接しているか */
export function areNeighbors(s, a, b) {
  const map = getWorldMap();
  const owners = s.world.owners;
  for (const p of map.provinces) {
    if (owners[p.id] !== a) continue;
    if (p.neighbors.some((nb) => owners[nb] === b)) return true;
  }
  return false;
}

export function neighborsOf(s, id) {
  const map = getWorldMap();
  const owners = s.world.owners;
  const out = new Set();
  for (const p of map.provinces) {
    if (owners[p.id] !== id) continue;
    for (const nb of p.neighbors) if (owners[nb] !== id) out.add(owners[nb]);
  }
  return [...out];
}

function provinceWeights(s, id) {
  const map = getWorldMap();
  return sum(map.provinces.filter((p) => s.world.owners[p.id] === id).map((p) => p.popWeight));
}

/** 国境沿いの州を勝者へ割譲する。人口とGDPも州の人口比で移動する */
export function transferProvinces(s, from, to, count) {
  const map = getWorldMap();
  const owners = s.world.owners;
  const capitalOf = (id) => s.world.capitals[id];
  const moved = [];
  for (let i = 0; i < count; i++) {
    const border = map.provinces.filter(
      (p) => owners[p.id] === from && p.id !== capitalOf(from) && p.neighbors.some((nb) => owners[nb] === to),
    );
    if (!border.length) break;
    const toCap = map.provinces[capitalOf(to)];
    border.sort((a, b) => Math.hypot(a.cx - toCap.cx, a.cy - toCap.cy) - Math.hypot(b.cx - toCap.cx, b.cy - toCap.cy));
    const prov = border[0];
    const total = provinceWeights(s, from);
    const frac = total > 0 ? prov.popWeight / total : 0;
    const fromStats = from === 'player' ? { gdp: s.econ.gdp, pop: s.society.population } : s.world.nations[from];
    const gdpMoved = (from === 'player' ? fromStats.gdp : fromStats.gdp) * frac;
    const popMoved = (from === 'player' ? fromStats.pop : fromStats.population) * frac;
    if (from === 'player') {
      s.econ.gdp -= gdpMoved;
      s.society.population -= popMoved;
    } else {
      s.world.nations[from].gdp -= gdpMoved;
      s.world.nations[from].population -= popMoved;
    }
    if (to === 'player') {
      s.econ.gdp += gdpMoved * 0.8; // 戦災で生産力の一部は失われる
      s.society.population += popMoved;
    } else {
      s.world.nations[to].gdp += gdpMoved * 0.8;
      s.world.nations[to].population += popMoved;
    }
    owners[prov.id] = to;
    moved.push(prov.name);
  }
  if (to === 'player') s.stats.provincesGained += moved.length;
  if (from === 'player') s.stats.provincesLost += moved.length;
  return moved;
}

// ---------- 戦争 ----------

function sidePower(s, side, fx) {
  return sum(
    side.map((id) => {
      if (id === 'player') return militaryPower(s, fx);
      return s.world.nations[id].military;
    }),
  );
}

export function startWar(s, attacker, defender, rng) {
  if (s.world.wars.some((w) => [w.attacker, w.defender].includes(attacker) && [w.attacker, w.defender].includes(defender))) return null;
  s.world.warSeq = (s.world.warSeq ?? 0) + 1;
  // 同盟国・集団防衛機構の参戦
  const allies = [];
  const defenderAllies = s.world.alliances[defender] ?? [];
  for (const a of defenderAllies) if (a !== attacker && rng.chance(0.6)) allies.push(a);
  for (const org of ORGS.filter((o) => o.id === 'cso')) {
    const members = s.world.orgs[org.id];
    if (members.includes(defender) && !members.includes(attacker)) {
      for (const m of members) if (m !== defender && !allies.includes(m) && rng.chance(0.7)) allies.push(m);
    }
  }
  const war = { id: s.world.warSeq, attacker, defender, defenderAllies: allies, score: 0, months: 0, startMonth: s.month };
  s.world.wars.push(war);
  const allyText = allies.length ? `（${allies.map((a) => nationName(s, a)).join('・')}が${nationName(s, defender)}側で参戦）` : '';
  if (attacker === 'player' || defender === 'player') {
    s.world.nations[attacker === 'player' ? defender : attacker].relation = 0;
    s.stats.wars += 1;
    addLog(s, `${nationName(s, attacker)}が${nationName(s, defender)}に宣戦布告した！${allyText}`, 'war', 'diplomacy');
  } else {
    setOpinion(s, attacker, defender, 0);
  }
  addNews(s, '外交', `${nationName(s, attacker)}、${nationName(s, defender)}に宣戦布告${allyText}`);
  return war;
}

function endWar(s, war, result) {
  s.world.wars = s.world.wars.filter((w) => w.id !== war.id);
  const { winner, loser, provinces = 0, reparationsPct = 0, white = false } = result;
  let moved = [];
  if (!white && provinces > 0) moved = transferProvinces(s, loser, winner, provinces);
  const involvesPlayer = war.attacker === 'player' || war.defender === 'player';
  if (involvesPlayer) {
    const enemy = war.attacker === 'player' ? war.defender : war.attacker;
    s.world.nations[enemy].relation = white ? 25 : winner === 'player' ? 20 : 30;
    if (white) {
      addLog(s, `${nationName(s, enemy)}と白紙講和を結んだ。戦前の国境が維持される。`, 'warn', 'diplomacy');
    } else if (winner === 'player') {
      const rep = (s.world.nations[enemy].gdp * reparationsPct) / 100;
      s.econ.treasury += rep;
      s.world.nations[enemy].gdp -= rep * 0.5;
      s.stats.warsWon += 1;
      applyEffects(s, { allPops: 12, partySupport: { [s.meta.partyId]: 3 } });
      addLog(s, `${nationName(s, enemy)}との戦争に勝利した！${moved.length ? `${moved.join('・')}州を併合し、` : ''}賠償金${rep.toFixed(1)}兆を獲得。`, 'good', 'diplomacy');
    } else {
      const rep = (s.econ.gdp * reparationsPct) / 100;
      applyEffects(s, { treasury: -rep, allPops: -15, partySupport: { [s.meta.partyId]: -4 } });
      s.stats.warsLost += 1;
      addLog(s, `${nationName(s, enemy)}に敗北した。${moved.length ? `${moved.join('・')}州を割譲し、` : ''}賠償金${rep.toFixed(1)}兆を支払う屈辱的な講和となった。`, 'bad', 'diplomacy');
    }
  }
  addNews(
    s,
    '外交',
    white
      ? `${nationName(s, war.attacker)}と${nationName(s, war.defender)}が白紙講和`
      : `${nationName(s, winner)}が${nationName(s, loser)}に勝利${moved.length ? `、${moved.length}州を併合` : ''}`,
  );
  if (s.world.owners.filter((o) => o === 'player').length === 0) {
    s.gameOver = { type: 'conquered', title: '国家消滅', reason: 'すべての領土を失い、国家は地図から消えた。' };
  }
}

function runWars(s, fx, rng) {
  for (const war of [...s.world.wars]) {
    const aSide = [war.attacker];
    const dSide = [war.defender, ...war.defenderAllies];
    let pa = sidePower(s, aSide, fx);
    let pd = sidePower(s, dSide, fx);
    if (war.defender === 'player') pd *= fx.defenseMult ?? 1;
    pd *= 1.1; // 防衛側の地の利
    const delta = ((pa - pd) / Math.max(1, pa + pd)) * 30 + rng.range(-8, 8);
    war.score = clamp(war.score + delta, -100, 100);
    war.months += 1;
    // 損耗
    const attrition = (id, ratio) => {
      if (id === 'player') s.military = Math.max(0, s.military * (1 - 0.02 - 0.03 * ratio));
      else s.world.nations[id].military = Math.max(5, s.world.nations[id].military * (1 - 0.02 - 0.03 * ratio));
    };
    for (const id of aSide) attrition(id, pd / Math.max(1, pa + pd));
    for (const id of dSide) attrition(id, pa / Math.max(1, pa + pd));

    const involvesPlayer = war.attacker === 'player' || war.defender === 'player';
    if (involvesPlayer) {
      const ps = war.attacker === 'player' ? war.score : -war.score;
      const enemy = war.attacker === 'player' ? war.defender : war.attacker;
      if (ps <= -100) {
        endWar(s, war, { winner: enemy, loser: 'player', provinces: 3, reparationsPct: 3 });
      } else if (ps >= 100) {
        endWar(s, war, { winner: 'player', loser: enemy, provinces: 4, reparationsPct: 6 });
      } else if (ps >= 60 && !war.surrenderOffered && rng.chance(0.35)) {
        war.surrenderOffered = true;
        s.events.scheduled.push({ id: 'enemy_surrender', day: s.day, ctx: { targetId: enemy, warId: war.id } });
      }
      continue;
    }
    // AI同士の戦争
    if (Math.abs(war.score) >= 60 || (war.months > 14 && rng.chance(0.15))) {
      const attackerWins = war.score > 0;
      const winner = attackerWins ? war.attacker : war.defender;
      const loser = attackerWins ? war.defender : war.attacker;
      const n = Math.abs(war.score) >= 60 ? Math.max(1, Math.floor(Math.abs(war.score) / 30)) : 0;
      endWar(s, war, { winner, loser, provinces: n, white: n === 0 });
    }
  }
}

// ---------- AI国家 ----------

function relationBaseline(s, n, fx) {
  const def = getNationDef(n.id);
  let base = 50;
  if (s.world.trade[n.id] && !fx.isolation) base += 10;
  if ((s.world.alliances.player ?? []).includes(n.id)) base += 20;
  for (const [orgId, members] of Object.entries(s.world.orgs)) if (members.includes('player') && members.includes(n.id)) base += 6;
  base += (s.world.reputation - 50) * 0.3;
  if (fx.planned && def.econSystem === 'market') base -= 15;
  if (!fx.planned && def.econSystem === 'planned') base -= 12;
  if (fx.isolation) base -= 10;
  if (n.sanctionedByPlayer) base -= 25;
  // 好戦的な国・独裁国家は民主国家を警戒する
  base -= Math.max(0, def.aggression - 0.8) * 18;
  if (['軍事政権', '一党独裁', '絶対君主制'].includes(def.gov)) base -= 6;
  // 自国の敵国と戦争しているかどうか
  for (const w of s.world.wars) {
    const sides = [w.attacker, w.defender];
    if (sides.includes('player') && sides.includes(n.id)) return 0;
  }
  return base;
}

function runAI(s, fx, rng) {
  const diff = s.meta.diffMods;
  const playerMil = militaryPower(s, fx);
  for (const id of AI_NATION_IDS) {
    const n = s.world.nations[id];
    if (!s.world.owners.includes(id)) continue; // 滅亡した国
    const def = getNationDef(id);
    const atWar = s.world.wars.some((w) => w.attacker === id || w.defender === id || w.defenderAllies.includes(id));
    // 経済と軍事
    let g = def.baseGrowth + rng.normal() * 0.6 - (atWar ? 1.5 : 0) - (n.sanctionTurns > 0 ? 1 : 0);
    if (id === 'zarkan') g += ((s.econ.oilPrice - 80) / 80) * 3;
    n.growth = approach(n.growth ?? g, g, 0.5);
    n.gdp = Math.max(10, n.gdp * (1 + n.growth / 1200));
    const milTarget = (n.gdp / 4) * def.aggression * 0.9 + 15;
    n.military = approach(n.military, milTarget, atWar ? 0.01 : 0.03);
    if (n.sanctionTurns > 0) n.sanctionTurns -= 1;

    // プレイヤーとの関係
    const base = relationBaseline(s, n, fx);
    if (!s.world.wars.some((w) => [w.attacker, w.defender].includes('player') && [w.attacker, w.defender].includes(id))) {
      n.relation = clamp(approach(n.relation, base, 0.04) + rng.normal() * 1.0 + (fx.relationDrift ?? 0), 0, 100);
    }

    // 他国への感情の揺らぎ
    for (const other of AI_NATION_IDS) {
      if (other <= id) continue;
      // 歴史的な対立関係（初期値）へゆっくり戻りつつ揺らぐ
      const key = opinionKey(id, other);
      const rival = INITIAL_OPINIONS[key] ?? 50;
      setOpinion(s, id, other, approach(getOpinion(s, id, other), rival, 0.03) + rng.normal() * 2);
    }

    if (atWar) continue;
    const isNeighbor = areNeighbors(s, id, 'player');
    const inPlayerWar = s.world.wars.some((w) => [w.attacker, w.defender].includes('player'));

    // プレイヤーへの宣戦布告
    if (isNeighbor && n.relation < 20 && n.military > playerMil * 0.85 && rng.chance(0.05 * def.aggression * diff.aiAggression)) {
      const csoProtected = s.world.orgs.cso.includes('player') && !s.world.orgs.cso.includes(id);
      if (fx.isolation && rng.chance(0.5)) {
        addLog(s, `${n.name}が開戦を企てたが、鎖国による国境封鎖を前に断念した。`, 'good', 'diplomacy');
      } else if (csoProtected && rng.chance(0.6)) {
        addLog(s, `${n.name}は開戦を検討したが、大陸安全保障機構の集団防衛を恐れて思いとどまった。`, 'good', 'diplomacy');
      } else if (!inPlayerWar) {
        startWar(s, id, 'player', rng);
        s.events.scheduled.push({ id: 'war_declared', day: s.day, ctx: { targetId: id } });
        continue;
      }
    }
    // 貿易協定の提案
    if (!fx.isolation && !s.world.trade[id] && n.relation >= 55 && s.month - (n.lastOffer ?? -99) > 18 && rng.chance(0.035 * def.tradeAffinity)) {
      n.lastOffer = s.month;
      s.events.scheduled.push({ id: 'trade_offer', day: s.day + rng.int(0, 20), ctx: { targetId: id } });
    }
    // 同盟の打診
    if (n.relation >= 80 && !(s.world.alliances.player ?? []).includes(id) && s.month - (n.lastOffer ?? -99) > 18 && rng.chance(0.02)) {
      n.lastOffer = s.month;
      s.events.scheduled.push({ id: 'alliance_offer', day: s.day + rng.int(0, 20), ctx: { targetId: id } });
    }
    // 経済制裁
    if (n.relation < 22 && !n.sanctioningPlayer && rng.chance(0.03)) {
      n.sanctioningPlayer = 12;
      addModifier(s, { id: `sanction_${id}`, label: `${n.name}による経済制裁`, months: 12, effects: { growth: -0.4 } });
      addLog(s, `${n.name}が我が国に経済制裁を発動した（12ヶ月間、成長率-0.4%）。`, 'bad', 'diplomacy');
      addNews(s, '外交', `${n.name}、対${s.meta.countryName}経済制裁を発動`);
    }
    if (n.sanctioningPlayer) n.sanctioningPlayer -= 1;

    // AI同士の戦争
    if (rng.chance(0.035 * def.aggression * diff.aiAggression)) {
      const targets = neighborsOf(s, id).filter(
        (t) => t !== 'player' && getOpinion(s, id, t) < 32 && n.military > s.world.nations[t].military * 0.95 && !s.world.wars.some((w) => [w.attacker, w.defender].includes(t)),
      );
      if (targets.length) startWar(s, id, rng.pick(targets), rng);
    }
  }
  // 国際機関に加盟している国との関係は改善しやすい
  if (s.world.orgs.cec.includes('player')) {
    for (const m of s.world.orgs.cec) if (m !== 'player') s.world.nations[m].relation = clamp(s.world.nations[m].relation + 0.3, 0, 100);
  }
  s.world.reputation = clamp(s.world.reputation + (fx.reputationTrend ?? 0) + (50 - s.world.reputation) * 0.01, 0, 100);
}

export function runDiplomacy(s, fx, rng) {
  runAI(s, fx, rng);
  runWars(s, fx, rng);
}

// ---------- 国際機関 ----------

export function orgContext(s, org) {
  const fx = aggregateEffects(s);
  const members = s.world.orgs[org.id].filter((m) => m !== 'player');
  const avgRel = members.length ? sum(members.map((m) => s.world.nations[m].relation)) / members.length : 100;
  return { fx, avgRel, renewableShare: energyStats(s, fx).renewableShare };
}

export function orgRequirements(s, orgId) {
  const org = getOrg(orgId);
  const ctx = orgContext(s, org);
  return org.requirements.map((r) => ({ label: r.label, ok: r.check(s, ctx) }));
}

// ---------- プレイヤーの外交行動 ----------

export const DIPLO_ACTIONS = {
  envoy: { label: '外交使節団の派遣', capital: 8, desc: '関係値を+6〜10。' },
  aid: { label: '資金援助', capital: 3, costPct: 0.15, desc: 'GDPの0.15%を拠出し関係値+10〜14。' },
  trade: { label: '貿易協定の締結', capital: 15, desc: '関係値50以上が必要。成長率+0.25%。' },
  cancelTrade: { label: '貿易協定の破棄', capital: 5, desc: '関係値-15。' },
  alliance: { label: '同盟の締結', capital: 25, desc: '関係値75以上が必要。互いの防衛戦争に参戦する。' },
  breakAlliance: { label: '同盟の破棄', capital: 10, desc: '関係値-25、国際評価-5。' },
  sanction: { label: '経済制裁', capital: 10, desc: '相手の成長率を12ヶ月下げる。関係値-20。' },
  war: { label: '宣戦布告', capital: 20, desc: '国境を接する国のみ。関係値20未満なら国民の支持を得やすい。' },
};

export function diploAvailability(s, action, targetId) {
  const n = s.world.nations[targetId];
  const fx = aggregateEffects(s);
  const a = DIPLO_ACTIONS[action];
  const atWarWith = playerWars(s).some((w) => [w.attacker, w.defender].includes(targetId));
  if (!n || !s.world.owners.includes(targetId)) return { ok: false, reason: '国家が存在しない' };
  if (s.politics.capital < a.capital) return { ok: false, reason: `政治資本が不足（${a.capital}必要）` };
  if (atWarWith && action !== 'war') return { ok: false, reason: '交戦中' };
  switch (action) {
    case 'aid':
      return s.econ.treasury >= (s.econ.gdp * a.costPct) / 100 ? { ok: true } : { ok: false, reason: '国庫が不足' };
    case 'trade':
      if (fx.isolation) return { ok: false, reason: '鎖国中' };
      if (s.world.trade[targetId]) return { ok: false, reason: '締結済み' };
      return n.relation >= 50 ? { ok: true } : { ok: false, reason: '関係値50以上が必要' };
    case 'cancelTrade':
      return s.world.trade[targetId] ? { ok: true } : { ok: false, reason: '協定なし' };
    case 'alliance':
      if ((s.world.alliances.player ?? []).includes(targetId)) return { ok: false, reason: '同盟済み' };
      return n.relation >= 75 ? { ok: true } : { ok: false, reason: '関係値75以上が必要' };
    case 'breakAlliance':
      return (s.world.alliances.player ?? []).includes(targetId) ? { ok: true } : { ok: false, reason: '同盟なし' };
    case 'sanction':
      return n.sanctionTurns > 0 ? { ok: false, reason: '制裁中' } : { ok: true };
    case 'war':
      if (atWarWith) return { ok: false, reason: '交戦中' };
      if (!areNeighbors(s, 'player', targetId)) return { ok: false, reason: '国境を接していない' };
      if ((s.world.alliances.player ?? []).includes(targetId)) return { ok: false, reason: '同盟国' };
      return { ok: true };
    default:
      return { ok: true };
  }
}

export function performDiplomacy(s, action, targetId, rng) {
  if (!diploAvailability(s, action, targetId).ok) return;
  const a = DIPLO_ACTIONS[action];
  const n = s.world.nations[targetId];
  const eff = ministerEff(s, 'foreign');
  s.politics.capital -= a.capital;
  const rel = (v) => {
    n.relation = clamp(n.relation + v, 0, 100);
  };
  switch (action) {
    case 'envoy': {
      const g = Math.round(rng.range(6, 10) * eff);
      rel(g);
      addLog(s, `${n.name}に外交使節団を派遣した（関係値+${g}）。`, 'action', 'diplomacy');
      break;
    }
    case 'aid': {
      const cost = (s.econ.gdp * a.costPct) / 100;
      s.econ.treasury -= cost;
      const g = Math.round(rng.range(10, 14) * eff * (targetId === 'ornea' ? 1.3 : 1));
      rel(g);
      s.world.reputation = clamp(s.world.reputation + 1, 0, 100);
      addLog(s, `${n.name}へ${cost.toFixed(2)}兆の資金援助を行った（関係値+${g}）。`, 'action', 'diplomacy');
      break;
    }
    case 'trade':
      s.world.trade[targetId] = true;
      rel(5);
      addLog(s, `${n.name}と貿易協定を締結した。`, 'good', 'diplomacy');
      addNews(s, '外交', `${s.meta.countryName}と${n.name}、貿易協定に調印`);
      break;
    case 'cancelTrade':
      delete s.world.trade[targetId];
      rel(-15);
      addLog(s, `${n.name}との貿易協定を破棄した。`, 'warn', 'diplomacy');
      break;
    case 'alliance':
      s.world.alliances.player = [...(s.world.alliances.player ?? []), targetId];
      s.world.alliances[targetId] = [...(s.world.alliances[targetId] ?? []), 'player'];
      rel(5);
      addLog(s, `${n.name}と同盟を締結した。`, 'good', 'diplomacy');
      addNews(s, '外交', `${s.meta.countryName}と${n.name}が軍事同盟を締結`);
      break;
    case 'breakAlliance':
      s.world.alliances.player = (s.world.alliances.player ?? []).filter((x) => x !== targetId);
      s.world.alliances[targetId] = (s.world.alliances[targetId] ?? []).filter((x) => x !== 'player');
      rel(-25);
      s.world.reputation = clamp(s.world.reputation - 5, 0, 100);
      addLog(s, `${n.name}との同盟を破棄した。`, 'warn', 'diplomacy');
      break;
    case 'sanction':
      n.sanctionTurns = 12;
      n.sanctionedByPlayer = true;
      rel(-20);
      addLog(s, `${n.name}に経済制裁を科した。`, 'warn', 'diplomacy');
      break;
    case 'war': {
      const justified = n.relation < 20;
      applyEffects(s, { allPops: justified ? 4 : -6, reputation: justified ? -3 : -12 });
      for (const other of Object.values(s.world.nations)) if (other.id !== targetId) other.relation = clamp(other.relation - (justified ? 3 : 8), 0, 100);
      startWar(s, 'player', targetId, rng);
      break;
    }
    default:
      break;
  }
}

/** 講和の提案。成功すれば戦争終結 */
export function proposePeace(s, warId, type, rng) {
  const war = s.world.wars.find((w) => w.id === warId);
  if (!war) return;
  const ps = war.attacker === 'player' ? war.score : -war.score;
  const enemy = war.attacker === 'player' ? war.defender : war.attacker;
  if (type === 'annex') {
    if (ps < 40) return;
    endWar(s, war, { winner: 'player', loser: enemy, provinces: Math.max(1, Math.floor(ps / 25)), reparationsPct: Math.round(ps / 20) });
  } else if (type === 'white') {
    const chance = clamp(0.3 + ps / 100 + war.months * 0.03, 0.05, 0.95);
    if (rng.chance(chance)) endWar(s, war, { winner: enemy, loser: 'player', white: true });
    else addLog(s, `${nationName(s, enemy)}は白紙講和の提案を拒否した。`, 'bad', 'diplomacy');
  } else if (type === 'concede') {
    endWar(s, war, { winner: enemy, loser: 'player', provinces: Math.max(1, Math.ceil(-ps / 35)), reparationsPct: 2 });
  }
}

export function joinOrg(s, orgId) {
  if (!orgRequirements(s, orgId).every((r) => r.ok) || s.politics.capital < 20) return;
  s.politics.capital -= 20;
  s.world.orgs[orgId] = [...s.world.orgs[orgId], 'player'];
  addLog(s, `${getOrg(orgId).name}に加盟した。`, 'good', 'diplomacy');
  addNews(s, '外交', `${s.meta.countryName}、${getOrg(orgId).name}への加盟が承認される`);
}

export function leaveOrg(s, orgId) {
  s.world.orgs[orgId] = s.world.orgs[orgId].filter((m) => m !== 'player');
  for (const m of s.world.orgs[orgId]) s.world.nations[m].relation = clamp(s.world.nations[m].relation - 10, 0, 100);
  addLog(s, `${getOrg(orgId).name}から脱退した。加盟国との関係が悪化した。`, 'warn', 'diplomacy');
}

/** 国際機関の加盟条件を満たさなくなったら除名 */
export function checkOrgMembership(s) {
  for (const org of ORGS) {
    if (!s.world.orgs[org.id].includes('player')) continue;
    const req = orgRequirements(s, org.id);
    const failed = req.filter((r) => !r.ok && !r.label.includes('関係値'));
    if (failed.length) {
      s.world.orgs[org.id] = s.world.orgs[org.id].filter((m) => m !== 'player');
      addLog(s, `加盟条件（${failed.map((f) => f.label).join('、')}）を満たさなくなり、${org.name}から除名された。`, 'bad', 'diplomacy');
    }
  }
}

// ---------- イベントから呼ばれる特殊効果 ----------

registerSpecial('acceptTrade', (s, ctx) => {
  if (ctx.targetId) {
    s.world.trade[ctx.targetId] = true;
    addNews(s, '外交', `${s.meta.countryName}と${nationName(s, ctx.targetId)}、貿易協定に調印`);
  }
});
registerSpecial('formAlliance', (s, ctx) => {
  const t = ctx.targetId;
  if (!t) return;
  s.world.alliances.player = [...new Set([...(s.world.alliances.player ?? []), t])];
  s.world.alliances[t] = [...new Set([...(s.world.alliances[t] ?? []), 'player'])];
  addNews(s, '外交', `${s.meta.countryName}と${nationName(s, t)}が軍事同盟を締結`);
});
registerSpecial('acceptSurrender', (s, ctx) => {
  const war = s.world.wars.find((w) => w.id === ctx.warId);
  if (war) {
    const ps = war.attacker === 'player' ? war.score : -war.score;
    endWar(s, war, { winner: 'player', loser: ctx.targetId, provinces: Math.max(2, Math.floor(ps / 25)), reparationsPct: 5 });
  }
});
