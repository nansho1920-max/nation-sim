// 人口集団（POP）。高齢者の比率は高齢化率で決まり、残りを他の集団で按分する。

export const POPS = [
  { id: 'workers', name: '労働者', icon: 'HardHat', baseShare: 0.4, influence: 1, desc: '雇用・物価・社会保障に敏感。不満が高まるとストライキを起こす。' },
  { id: 'capitalists', name: '資本家・経営者', icon: 'Briefcase', baseShare: 0.05, influence: 3, desc: '税率と成長率を重視。不満が高まると資本逃避が起きる。' },
  { id: 'farmers', name: '農民', icon: 'Wheat', baseShare: 0.11, influence: 1, desc: '物価と農業保護を重視。自由貿易に反発する。' },
  { id: 'publicServants', name: '公務員', icon: 'Landmark', baseShare: 0.08, influence: 1.5, desc: '政府支出の規模と行政の健全性を重視する。' },
  { id: 'youth', name: '若者・学生', icon: 'GraduationCap', baseShare: 0.18, influence: 1, desc: '教育・雇用・環境を重視。不満が高まると学生運動が起きる。' },
  { id: 'elderly', name: '高齢者', icon: 'HeartPulse', baseShare: 0, influence: 1.2, desc: '年金と医療、物価の安定を重視する。投票率が高い。' },
];

export const POP_IDS = POPS.map((p) => p.id);
export const getPop = (id) => POPS.find((p) => p.id === id);

// 各集団が理想とする政策の位置。政党の位置が近いほど、その集団に支持されやすい。
export const POP_IDEALS = {
  workers: { econ: -0.5, social: 0.2, eco: -0.1, nation: 0.3, reform: 0.0 },
  capitalists: { econ: 0.8, social: 0.4, eco: -0.3, nation: 0.1, reform: 0.1 },
  farmers: { econ: 0.1, social: 0.8, eco: 0.0, nation: 0.4, reform: -0.3 },
  publicServants: { econ: -0.3, social: 0.3, eco: 0.1, nation: 0.1, reform: -0.3 },
  youth: { econ: 0.0, social: -0.5, eco: 0.55, nation: -0.3, reform: 0.3 },
  elderly: { econ: -0.25, social: 0.5, eco: -0.1, nation: 0.1, reform: -0.2 },
};

const PREF_SHARPNESS = 1.5;

/** 政党の一覧から、各集団の支持の向き（集団ごとに合計1）を計算する */
export function popPreferences(parties, axisDistance) {
  const out = {};
  for (const pop of POPS) {
    const w = parties.map((p) => Math.exp(-PREF_SHARPNESS * axisDistance(POP_IDEALS[pop.id], p.axes)));
    const total = w.reduce((a, b) => a + b, 0);
    out[pop.id] = Object.fromEntries(parties.map((p, i) => [p.id, w[i] / total]));
  }
  return out;
}

// 投票率
export const POP_TURNOUT = { workers: 0.55, capitalists: 0.8, farmers: 0.65, publicServants: 0.75, youth: 0.4, elderly: 0.8 };
