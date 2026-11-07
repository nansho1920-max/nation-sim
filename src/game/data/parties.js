// 政党。各政党は5つの政策軸上の位置（-1〜+1）を持ち、
// 連立の相性・国民各層の支持・法案への賛否はすべてこの位置から計算される。
// そのため、プレイヤーが自由に作った政党も既存の政党と同じように扱える。

export const AXES = [
  { id: 'econ', label: '経済', left: '福祉・再分配', right: '市場・自由競争', weight: 2.0 },
  { id: 'social', label: '社会', left: 'リベラル', right: '伝統・保守', weight: 1.0 },
  { id: 'eco', label: '環境', left: '開発優先', right: '環境重視', weight: 0.8 },
  { id: 'nation', label: '国家', left: '国際協調', right: '国家主権', weight: 1.0 },
  { id: 'reform', label: '統治', left: '既存体制', right: '改革・反汚職', weight: 0.6 },
];

export const DEFAULT_PARTIES = [
  { id: 'conservative', name: '保守国民党', short: '保守', color: '#4f7cd6', axes: { econ: 0.4, social: 0.7, eco: -0.2, nation: 0.4, reform: -0.3 } },
  { id: 'liberal', name: '自由市場党', short: '自由', color: '#e0a32e', axes: { econ: 0.9, social: 0.0, eco: -0.2, nation: -0.1, reform: 0.4 } },
  { id: 'socdem', name: '社会民主党', short: '社民', color: '#d9534f', axes: { econ: -0.7, social: -0.2, eco: 0.3, nation: -0.1, reform: 0.1 } },
  { id: 'green', name: '緑の党', short: '緑', color: '#3fae6a', axes: { econ: -0.3, social: -0.7, eco: 1.0, nation: -0.6, reform: 0.4 } },
  { id: 'nationalist', name: '国家主権党', short: '主権', color: '#8b5cc6', axes: { econ: 0.0, social: 0.8, eco: -0.4, nation: 1.0, reform: -0.1 } },
  { id: 'reform', name: '改革党', short: '改革', color: '#2cb5c0', axes: { econ: 0.3, social: -0.3, eco: 0.2, nation: -0.2, reform: 1.0 } },
];

// 互換用：初期状態の政党一覧
export const PARTIES = DEFAULT_PARTIES;

export const PARTY_COLORS = ['#4f7cd6', '#e0a32e', '#d9534f', '#3fae6a', '#8b5cc6', '#2cb5c0', '#e07a9a', '#9a7b4f', '#7d8ca3', '#c2c24a', '#5fb8e8', '#e8743c'];

export const MIN_PARTIES = 3;
export const MAX_PARTIES = 8;
export const COALITION_MIN_COMPAT = 0.3;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** 政策軸上の重み付き距離 */
export function axisDistance(a, b) {
  let d = 0;
  for (const ax of AXES) d += ax.weight * ((a[ax.id] ?? 0) - (b[ax.id] ?? 0)) ** 2;
  return Math.sqrt(d);
}

/** 2つの政党の連立の相性 (0〜1)。0.3未満とは連立できない */
export function partyCompatibility(a, b) {
  if (a.id === b.id) return 1;
  return clamp(1 - axisDistance(a.axes, b.axes) / 2.6, 0, 1);
}

/** 政策軸の位置から「市場経済・伝統重視」のような説明を作る */
export function ideologyLabel(axes) {
  const words = {
    econ: ['福祉・再分配', '市場経済'],
    social: ['リベラル', '伝統・保守'],
    eco: ['開発優先', '環境重視'],
    nation: ['国際協調', '国家主権'],
    reform: ['既存体制', '改革・反汚職'],
  };
  const salient = AXES.map((ax) => ({ id: ax.id, v: axes[ax.id] ?? 0 }))
    .filter((x) => Math.abs(x.v) >= 0.35)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, 2)
    .map((x) => words[x.id][x.v > 0 ? 1 : 0]);
  return salient.length ? salient.join('・') : '中道';
}

/** 法案への賛否 (-2〜+2) を政党の位置と法案の方向から計算する */
export function lawStanceFor(party, law) {
  let dot = 0;
  for (const [k, v] of Object.entries(law.dir ?? {})) dot += (party.axes[k] ?? 0) * v;
  return clamp(Math.round(dot * 2.4 + (law.bias ?? 0) * 2), -2, 2);
}

export function makeParty({ id, name, short, color, axes }) {
  const a = {};
  for (const ax of AXES) a[ax.id] = clamp(Number(axes?.[ax.id] ?? 0), -1, 1);
  return {
    id,
    name: String(name || '無名党').slice(0, 14),
    short: String(short || name || '無').slice(0, 3),
    color: color || '#7d8ca3',
    axes: a,
  };
}
