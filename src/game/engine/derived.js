// 状態から計算される派生値（UIとエンジンの両方で使う）
import { ERAS, MAJORITY, BUDGET_CATEGORIES } from '../data/balance';
import { POPS } from '../data/pops';
import { getLaw } from '../data/laws';
import { getTech } from '../data/techs';
import { getOrg } from '../data/orgs';
import { competenceToEff } from '../data/cabinet';
import { sum } from '../core/math';

const MULT_KEYS = new Set([
  'co2Mult',
  'renewableCostMult',
  'nuclearCostMult',
  'militaryMult',
  'fossilDemandMult',
  'renewableMult',
  'defenseMult',
]);

function addEffects(out, eff) {
  if (!eff) return;
  for (const [k, v] of Object.entries(eff)) {
    if (k === 'popTarget') {
      for (const [pop, d] of Object.entries(v)) out.popTarget[pop] = (out.popTarget[pop] ?? 0) + d;
    } else if (typeof v === 'boolean') {
      out[k] = out[k] || v;
    } else if (MULT_KEYS.has(k)) {
      out[k] = (out[k] ?? 1) * v;
    } else {
      out[k] = (out[k] ?? 0) + v;
    }
  }
}

/** 法律・技術・一時的な効果・国際機関の効果をすべて合算する */
export function aggregateEffects(s) {
  const out = { popTarget: {} };
  for (const id of Object.keys(s.politics.laws)) addEffects(out, getLaw(id)?.effects);
  for (const id of s.tech.researched) addEffects(out, getTech(id)?.effects);
  for (const m of s.modifiers) addEffects(out, m.effects);
  for (const [orgId, members] of Object.entries(s.world.orgs)) {
    if (members.includes('player')) addEffects(out, getOrg(orgId)?.effects);
  }
  return out;
}

export const fxGet = (fx, key, fallback = 0) => fx[key] ?? fallback;
export const fxMult = (fx, key) => fx[key] ?? 1;

export function popShares(s) {
  const elderly = s.society.aging / 100;
  const others = POPS.filter((p) => p.id !== 'elderly');
  const total = sum(others.map((p) => p.baseShare));
  const out = {};
  for (const p of POPS) out[p.id] = p.id === 'elderly' ? elderly : (p.baseShare / total) * (1 - elderly);
  return out;
}

/** 支持率 = 各人口集団の満足度を人口比で加重平均したもの */
export function approval(s) {
  const shares = popShares(s);
  return sum(POPS.map((p) => shares[p.id] * s.pops[p.id].sat));
}

export const debtRatio = (s) => (s.econ.debt / s.econ.gdp) * 100;

export function ministerEff(s, ministry) {
  const m = s.politics.ministers[ministry];
  return m ? competenceToEff(m.competence) : 0.94;
}

export function budgetTotal(s) {
  return sum(BUDGET_CATEGORIES.map((c) => s.econ.budget[c.id]));
}

export function energyStats(s, fx = aggregateEffects(s)) {
  const e = s.energy;
  const renewable = e.renewable * fxMult(fx, 'renewableMult');
  const bonus = fxGet(fx, 'energyBonus');
  const supply = e.fossil + e.nuclear + renewable + bonus;
  const demand = s.econ.gdp * 0.33 * (0.7 + s.econ.sectors.industry) * fxMult(fx, 'fossilDemandMult');
  // 再エネ → 原子力 → 化石燃料の順に、需要を満たす分だけ発電する
  const renewableGen = Math.min(renewable + bonus, demand);
  const nuclearGen = Math.min(e.nuclear, Math.max(0, demand - renewableGen));
  const fossilUsed = Math.min(e.fossil, Math.max(0, demand - renewableGen - nuclearGen));
  const generated = renewableGen + nuclearGen + fossilUsed;
  const shortage = demand > 0 ? Math.max(0, 1 - generated / demand) : 0;
  const renewableShare = generated > 0 ? (renewableGen / generated) * 100 : 0;
  const co2 = fossilUsed * fxMult(fx, 'co2Mult');
  return { supply, demand, fossilUsed, nuclearGen, renewable, renewableGen, generated, shortage, renewableShare, co2 };
}

export function militaryPower(s, fx = aggregateEffects(s)) {
  return s.military * fxMult(fx, 'militaryMult') * (0.85 + ministerEff(s, 'defense') * 0.15);
}

export function coalitionSeats(s) {
  return sum(s.politics.coalition.map((p) => s.politics.seats[p] ?? 0));
}

export const hasMajority = (s) => coalitionSeats(s) >= MAJORITY;

export function eraOf(s) {
  const n = s.tech.researched.length;
  return [...ERAS].reverse().find((e) => n >= e.min).label;
}

export function playerProvinceCount(s) {
  return s.world.owners.filter((o) => o === 'player').length;
}

export function isAtWar(s) {
  return s.world.wars.some((w) => w.attacker === 'player' || w.defender === 'player');
}

export function playerWars(s) {
  return s.world.wars.filter((w) => w.attacker === 'player' || w.defender === 'player');
}

/** プレイヤー視点の戦況スコア（正なら優勢） */
export function playerWarScore(w) {
  return w.attacker === 'player' ? w.score : -w.score;
}

export function enemyOf(w) {
  return w.attacker === 'player' ? w.defender : w.attacker;
}

/** UIでまとめて使う派生値 */
export function deriveAll(s) {
  const fx = aggregateEffects(s);
  return {
    fx,
    approval: approval(s),
    debtRatio: debtRatio(s),
    energy: energyStats(s, fx),
    military: militaryPower(s, fx),
    coalitionSeats: coalitionSeats(s),
    era: eraOf(s),
    shares: popShares(s),
    atWar: isAtWar(s),
  };
}
