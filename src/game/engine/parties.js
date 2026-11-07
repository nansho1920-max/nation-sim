// ゲーム状態に保存された政党一覧へのアクセス。
// 相性や支持の向きは政策軸から計算し、政党一覧ごとにキャッシュする。
import { axisDistance, lawStanceFor, partyCompatibility } from '../data/parties';
import { POPS, POP_TURNOUT, popPreferences } from '../data/pops';

const cache = new WeakMap();

function info(s) {
  const list = s.parties;
  let c = cache.get(list);
  if (!c) {
    c = {
      byId: Object.fromEntries(list.map((p) => [p.id, p])),
      ids: list.map((p) => p.id),
      prefs: popPreferences(list, axisDistance),
      compat: {},
    };
    cache.set(list, c);
  }
  return c;
}

export const partyIds = (s) => info(s).ids;
export const partyOf = (s, id) => info(s).byId[id];
export const popPref = (s, popId) => info(s).prefs[popId];

export function compat(s, a, b) {
  if (a === b) return 1;
  const c = info(s);
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  if (c.compat[key] == null) c.compat[key] = partyCompatibility(c.byId[a], c.byId[b]);
  return c.compat[key];
}

export const stanceOf = (s, law, partyId) => lawStanceFor(partyOf(s, partyId), law);

/** 議会の並び順（経済軸で左から右へ） */
export const seatOrder = (s) => [...s.parties].sort((a, b) => a.axes.econ - b.axes.econ || a.axes.social - b.axes.social).map((p) => p.id);

/**
 * 政党構成だけから、平常時の支持率の目安（%）を見積もる。
 * 新しいゲームの設定画面で、自作政党の強さを示すのに使う。
 */
export function estimateSupport(parties, aging = 24) {
  const prefs = popPreferences(parties, axisDistance);
  const others = POPS.filter((p) => p.id !== 'elderly');
  const total = others.reduce((a, p) => a + p.baseShare, 0);
  const share = (p) => (p.id === 'elderly' ? aging / 100 : (p.baseShare / total) * (1 - aging / 100));
  const val = Object.fromEntries(parties.map((p) => [p.id, 0]));
  for (const pop of POPS) for (const party of parties) val[party.id] += share(pop) * POP_TURNOUT[pop.id] * prefs[pop.id][party.id];
  const sum = Object.values(val).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, (v / sum) * 100]));
}

/** 支持率の目安から難しさ（1〜3） */
export const partyDifficulty = (support) => (support >= 28 ? 1 : support >= 17 ? 2 : 3);
