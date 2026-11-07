// 技術ツリー。研究開発予算と教育水準から生まれる研究ポイントで解禁していく。

export const TECH_BRANCHES = [
  { id: 'industry', label: '産業', color: '#e0a32e' },
  { id: 'social', label: '社会', color: '#4f9fd6' },
  { id: 'military', label: '軍事', color: '#d9534f' },
  { id: 'environment', label: '環境', color: '#3fae6a' },
];

export const TECHS = [
  // 産業
  { id: 'automation', branch: 'industry', tier: 1, name: '工場自動化', cost: 80, requires: [], desc: '生産性が向上するが、単純労働の雇用が減る。', effects: { potential: 0.3, naturalUnemp: 0.3 } },
  { id: 'logistics', branch: 'industry', tier: 2, name: 'スマート物流', cost: 110, requires: ['automation'], desc: '物流網を最適化し経済効率を高める。', effects: { potential: 0.3 } },
  { id: 'semiconductors', branch: 'industry', tier: 2, name: '次世代半導体', cost: 160, requires: ['automation'], desc: '先端産業の基盤。研究効率も上がる。', effects: { potential: 0.4, research: 3 } },
  { id: 'ai_economy', branch: 'industry', tier: 3, name: 'AI経済', cost: 260, requires: ['semiconductors', 'logistics'], desc: '経済を劇的に効率化するが、大量の失業を生む恐れがある。', effects: { potential: 0.9, naturalUnemp: 1.0 } },
  { id: 'fusion', branch: 'industry', tier: 4, name: '核融合発電', cost: 340, requires: ['ai_economy', 'smart_grid'], desc: '無尽蔵のクリーンエネルギー。発電容量+40。', effects: { energyBonus: 40, co2Mult: 0.75, potential: 0.3 } },
  // 社会
  { id: 'digital_gov', branch: 'social', tier: 1, name: '電子政府', cost: 70, requires: [], desc: '行政手続きを電子化し、汚職を減らし徴税効率を上げる。', effects: { corruptionTrend: -0.3, revenueEff: 0.03 } },
  { id: 'edtech', branch: 'social', tier: 2, name: '教育DX', cost: 100, requires: ['digital_gov'], desc: 'オンライン教育で教育水準の上限を引き上げる。', effects: { eduTarget: 6 } },
  { id: 'telemedicine', branch: 'social', tier: 2, name: '遠隔医療', cost: 110, requires: ['digital_gov'], desc: '地方の医療格差を解消する。', effects: { healthTarget: 5 } },
  { id: 'ubi_research', branch: 'social', tier: 3, name: 'ベーシックインカム研究', cost: 180, requires: ['edtech'], desc: '「ベーシックインカム法」を提出可能にする。', effects: {} },
  { id: 'genomics', branch: 'social', tier: 3, name: 'ゲノム医療', cost: 210, requires: ['telemedicine'], desc: '健康寿命を延ばし、出生率もわずかに改善する。', effects: { healthTarget: 6, birthRate: 0.5 } },
  // 軍事
  { id: 'drones', branch: 'military', tier: 1, name: 'ドローン戦力', cost: 90, requires: [], desc: '軍事力の実効性を10%高める。', effects: { militaryMult: 1.1 } },
  { id: 'cyber', branch: 'military', tier: 2, name: 'サイバー防衛', cost: 120, requires: ['drones'], desc: 'スパイ事件の発生を抑え、軍事力をさらに強化する。', effects: { militaryMult: 1.05, spyResist: true } },
  { id: 'missile_defense', branch: 'military', tier: 3, name: 'ミサイル防衛', cost: 200, requires: ['cyber'], desc: '防衛戦争での戦力を25%高める。', effects: { defenseMult: 1.25 } },
  { id: 'space', branch: 'military', tier: 4, name: '宇宙開発', cost: 300, requires: ['missile_defense', 'semiconductors'], desc: '国威を大きく高め、研究と軍事を強化する。', effects: { reputationTrend: 0.3, research: 5, militaryMult: 1.1 } },
  // 環境
  { id: 'solar_eff', branch: 'environment', tier: 1, name: '高効率太陽光', cost: 70, requires: [], desc: '再エネ発電群の建設費を25%削減する。', effects: { renewableCostMult: 0.75 } },
  { id: 'smart_grid', branch: 'environment', tier: 2, name: 'スマートグリッド', cost: 130, requires: ['solar_eff'], desc: '再エネの実効発電量を15%高める。', effects: { renewableMult: 1.15 } },
  { id: 'ev', branch: 'environment', tier: 2, name: '電気自動車の普及', cost: 150, requires: ['solar_eff'], desc: '化石燃料需要とCO₂排出を減らす。', effects: { co2Mult: 0.88, fossilDemandMult: 0.9 } },
  { id: 'carbon_capture', branch: 'environment', tier: 3, name: '炭素回収技術', cost: 220, requires: ['smart_grid'], desc: 'CO₂を大気から回収し、環境を改善する。', effects: { co2Mult: 0.8, envTarget: 5 } },
  { id: 'nuclear_safety', branch: 'environment', tier: 2, name: '次世代原子炉', cost: 140, requires: ['solar_eff'], desc: '原子力発電所の建設費を35%削減する。', effects: { nuclearCostMult: 0.65 } },
];

export const getTech = (id) => TECHS.find((t) => t.id === id);
