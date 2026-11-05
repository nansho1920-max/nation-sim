// ゲーム全体で使う定数・バランス値

export const SAVE_KEY = 'nation-sim-save-v1';
export const SAVE_VERSION = 1;

export const START_YEAR = 2026;
export const START_MONTH = 4; // 2026年4月開始
export const MAX_TURNS = 120; // 10年(120ヶ月)の任期を全うすると勝利
export const ACTIONS_PER_TURN = 2; // 1ターンに実行できる政策・外交アクション数

export const EVENT_CHANCE = 0.25; // 20〜30%の範囲内
export const BANKRUPTCY_LIMIT = 3; // 国庫マイナスが3ターン続くと財政破綻

export const IDEOLOGIES = {
  capitalism: {
    id: 'capitalism',
    name: '資本主義',
    short: '資本',
    color: 'text-sky-300',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    description: '市場原理による高い経済成長。税収は大きく伸びるが、貧富の差から暴動が起きやすく支持率が乱高下する。',
    pros: ['税収 ×0.85〜1.35 の変動ボーナス', '経済力が伸びやすい'],
    cons: ['暴動イベント発生率UP', '支持率が毎ターンランダムに変動'],
  },
  communism: {
    id: 'communism',
    name: '共産主義',
    short: '共産',
    color: 'text-rose-300',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    description: '計画経済による安定した財政運営。不況イベントを無効化するが、西側諸国との関係が徐々に冷え込む。',
    pros: ['収支が安定（変動なし）', '世界恐慌などの不況イベントを無効化'],
    cons: ['全隣国との関係値が毎ターン減少', '経済成長が緩やか'],
  },
};

export const IDEOLOGY_CHANGE_COST = { treasury: 200, approval: 10 };
export const IDEOLOGY_COOLDOWN = 6;

export const INITIAL_COUNTRIES = [
  {
    id: 'valdoria',
    name: 'ヴァルドリア連邦',
    flag: '🦅',
    trait: '軍事大国',
    description: '北方の軍事国家。好戦的で国境紛争が絶えない。',
    relation: 45,
    military: 70,
    wealth: 600,
    aggression: 1.4,
  },
  {
    id: 'celestia',
    name: 'セレスティア王国',
    flag: '👑',
    trait: '立憲君主国',
    description: '西方の伝統ある王国。保守的で安定を好む。',
    relation: 60,
    military: 45,
    wealth: 900,
    aggression: 0.8,
  },
  {
    id: 'ornea',
    name: 'オルネア共和国',
    flag: '⚓',
    trait: '海洋交易国',
    description: '南方の商業共和国。資金援助に敏感に反応する。',
    relation: 55,
    military: 35,
    wealth: 1200,
    aggression: 0.6,
  },
];

export const DOMESTIC_ACTIONS = [
  {
    id: 'invest_economy',
    name: '産業投資',
    description: 'インフラと産業に投資し経済力を高める。',
    cost: 150,
    effect: { economy: 6 },
  },
  {
    id: 'build_military',
    name: '軍備増強',
    description: '兵器の調達と徴兵で軍事力を強化する。',
    cost: 120,
    effect: { military: 10, approval: -1 },
  },
  {
    id: 'welfare',
    name: '社会福祉・宣伝',
    description: '給付金と国営放送で国民の支持を集める。',
    cost: 150,
    effect: { approval: 5 },
  },
];

export const AID_COST = 100;
export const PEACE_COST = 300;
