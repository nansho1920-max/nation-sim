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

// 各集団が平常時にどの政党を支持しやすいか（行の合計は1）
export const POP_PARTY_PREF = {
  workers: { conservative: 0.15, liberal: 0.08, socdem: 0.38, green: 0.08, nationalist: 0.21, reform: 0.1 },
  capitalists: { conservative: 0.38, liberal: 0.4, socdem: 0.04, green: 0.04, nationalist: 0.06, reform: 0.08 },
  farmers: { conservative: 0.45, liberal: 0.05, socdem: 0.12, green: 0.06, nationalist: 0.25, reform: 0.07 },
  publicServants: { conservative: 0.3, liberal: 0.08, socdem: 0.32, green: 0.1, nationalist: 0.08, reform: 0.12 },
  youth: { conservative: 0.08, liberal: 0.2, socdem: 0.17, green: 0.27, nationalist: 0.1, reform: 0.18 },
  elderly: { conservative: 0.42, liberal: 0.07, socdem: 0.25, green: 0.05, nationalist: 0.15, reform: 0.06 },
};

// 投票率
export const POP_TURNOUT = { workers: 0.55, capitalists: 0.8, farmers: 0.65, publicServants: 0.75, youth: 0.4, elderly: 0.8 };
