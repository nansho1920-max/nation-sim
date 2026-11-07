// ゲーム全体のバランス値・定数

export const SAVE_KEY = 'nation-sim-save-v2';
export const LEGACY_SAVE_KEYS = ['nation-sim-save-v1'];
export const SAVE_VERSION = 3;

export const START_DATE = { y: 2026, m: 4, d: 1 };
export const TERM_MONTHS = 120; // 10年の任期
export const ELECTION_INTERVAL = 48; // 4年ごとに総選挙

export const PARLIAMENT_SEATS = 300;
export const MAJORITY = 151;
export const SUPERMAJORITY = 200; // 憲法改正には3分の2

export const CAPITAL_MAX = 100; // 政治資本の上限

export const EVENT_GLOBAL_COOLDOWN_DAYS = 24;
export const EVENT_COOLDOWN_MONTHS = 18;

// 時間速度（1日あたりのミリ秒）
export const SPEEDS = [
  { id: 0, label: '停止', ms: null },
  { id: 1, label: '1x', ms: 550 },
  { id: 3, label: '3x', ms: 180 },
  { id: 5, label: '5x', ms: 70 },
];

export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: '初級',
    desc: '経済・財政が安定。イベントは少なめで、国民も寛容。',
    eventMult: 0.7,
    satBonus: 6,
    aiAggression: 0.6,
    treasuryMult: 1.6,
  },
  normal: {
    id: 'normal',
    label: '標準',
    desc: '通常の国家運営。',
    eventMult: 1,
    satBonus: 0,
    aiAggression: 1,
    treasuryMult: 1,
  },
  hard: {
    id: 'hard',
    label: '上級',
    desc: '財政・社会問題が深刻。隣国も好戦的。',
    eventMult: 1.3,
    satBonus: -5,
    aiAggression: 1.35,
    treasuryMult: 0.6,
  },
  extreme: {
    id: 'extreme',
    label: '超級',
    desc: '複数の危機が同時進行する。歴史に名を残せるか。',
    eventMult: 1.7,
    satBonus: -9,
    aiAggression: 1.8,
    treasuryMult: 0.3,
  },
};

export const TAXES = [
  { id: 'income', label: '所得税', min: 0, max: 60, step: 1, desc: '税収の柱。上げると労働者の不満と消費の冷え込みを招く。' },
  { id: 'corporate', label: '法人税', min: 0, max: 50, step: 1, desc: '上げると資本家が反発し、投資と成長が鈍る。' },
  { id: 'consumption', label: '消費税', min: 0, max: 30, step: 1, desc: '安定した財源だが、低所得層と農民の負担感が大きい。' },
];

// 予算はGDP比(%)で管理
export const BUDGET_CATEGORIES = [
  { id: 'education', label: '教育', min: 0.5, max: 8, ministry: 'education', desc: '教育水準を高め、長期的に生産性と研究力を押し上げる。' },
  { id: 'health', label: '医療', min: 0.5, max: 10, ministry: 'welfare', desc: '国民の健康を改善し、高齢者の満足度を高める。' },
  { id: 'welfare', label: '社会保障', min: 1, max: 15, ministry: 'welfare', desc: '年金・失業保険・生活保護。格差を縮め、労働者と高齢者を支える。' },
  { id: 'military', label: '防衛', min: 0.2, max: 8, ministry: 'defense', desc: '軍事力の水準を決める。戦争の勝敗と抑止力に直結する。' },
  { id: 'infrastructure', label: 'インフラ', min: 0.3, max: 6, ministry: 'economy', desc: '道路・港湾・通信。経済の潜在成長力を支える。' },
  { id: 'research', label: '研究開発', min: 0.1, max: 5, ministry: 'education', desc: '研究ポイントを生み、技術ツリーを進める。' },
  { id: 'environment', label: '環境・エネルギー', min: 0.1, max: 4, ministry: 'environment', desc: '環境を改善し、再生可能エネルギーの導入を後押しする。' },
];

export const ENERGY_PROJECTS = {
  fossil: { id: 'fossil', label: '火力発電所', capacity: 8, costPct: 0.5, months: 4, desc: '安価で早く建つが、CO₂を大量に排出し燃料輸入に依存する。' },
  renewable: { id: 'renewable', label: '再エネ発電群', capacity: 6, costPct: 0.8, months: 6, desc: '燃料不要でクリーン。建設費は技術で下がる。' },
  nuclear: { id: 'nuclear', label: '原子力発電所', capacity: 15, costPct: 1.6, months: 18, desc: '大容量で低炭素。原子力推進法が必要。', requiresLaw: 'nuclear' },
};

export const ERAS = [
  { min: 0, label: '現代' },
  { min: 4, label: '情報社会' },
  { min: 9, label: 'AI社会' },
  { min: 14, label: '未来社会' },
];
