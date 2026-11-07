// 世界の国々（すべて架空）。プレイヤー国家の数値はシナリオで上書きされる。
// sizeWeight: 地図上で領土が広がりやすさ

export const NATIONS = [
  { id: 'player', name: '(プレイヤー)', color: '#e3b341', gov: '議会制民主主義', econSystem: 'market', sizeWeight: 0.8 },
  {
    id: 'valdoria', name: 'ヴァルドリア連邦', color: '#b8504a', gov: '軍事政権', econSystem: 'market',
    gdp: 180, population: 6100, military: 88, baseGrowth: 2.2, aggression: 1.5, tradeAffinity: 0.4, environment: 35, sizeWeight: 1.45,
    desc: '軍部が実権を握る大国。領土拡張の野心を隠さない。', relation: 40,
  },
  {
    id: 'celestia', name: 'セレスティア王国', color: '#9c7ac9', gov: '立憲君主制', econSystem: 'market',
    gdp: 260, population: 4300, military: 52, baseGrowth: 1.4, aggression: 0.6, tradeAffinity: 0.7, environment: 62, sizeWeight: 1.0,
    desc: '伝統ある王国。保守的で安定を好み、同盟を重んじる。', relation: 60,
  },
  {
    id: 'ornea', name: 'オルネア共和国', color: '#3c95a6', gov: '議会制民主主義', econSystem: 'market',
    gdp: 300, population: 3900, military: 40, baseGrowth: 1.8, aggression: 0.35, tradeAffinity: 1.0, environment: 66, sizeWeight: 0.85,
    desc: '海洋交易で栄える商業国家。貿易と資金援助に敏感に反応する。', relation: 58,
  },
  {
    id: 'norden', name: 'ノルデン社会主義共和国', color: '#a33b52', gov: '一党独裁', econSystem: 'planned',
    gdp: 150, population: 7200, military: 74, baseGrowth: 1.0, aggression: 1.1, tradeAffinity: 0.3, environment: 30, sizeWeight: 1.3,
    desc: '計画経済を堅持する社会主義国家。市場経済国を敵視している。', relation: 35,
  },
  {
    id: 'zarkan', name: 'ザルカン首長国', color: '#b9853f', gov: '絶対君主制', econSystem: 'market',
    gdp: 130, population: 2600, military: 56, baseGrowth: 2.5, aggression: 0.9, tradeAffinity: 0.6, environment: 40, sizeWeight: 0.9, resource: true,
    desc: '豊富な原油を持つ首長国。原油価格の動向が国力を左右する。', relation: 48,
  },
  {
    id: 'isthia', name: 'イスティア連合', color: '#5772b8', gov: '連邦民主制', econSystem: 'market',
    gdp: 380, population: 8800, military: 66, baseGrowth: 1.6, aggression: 0.5, tradeAffinity: 0.8, environment: 58, sizeWeight: 1.35,
    desc: '大陸最大の経済大国。国際機関を主導する。', relation: 62,
  },
  {
    id: 'mireth', name: 'ミレス自由国', color: '#6c9a4a', gov: '議会制民主主義', econSystem: 'market',
    gdp: 90, population: 2100, military: 26, baseGrowth: 2.0, aggression: 0.25, tradeAffinity: 0.75, environment: 72, sizeWeight: 0.7,
    desc: '環境先進国として知られる小国。平和外交を国是とする。', relation: 66,
  },
];

export const AI_NATION_IDS = NATIONS.filter((n) => n.id !== 'player').map((n) => n.id);
export const getNationDef = (id) => NATIONS.find((n) => n.id === id);

// AI国家同士の初期感情（記載のない組み合わせは50前後）
export const INITIAL_OPINIONS = {
  'valdoria|isthia': 20,
  'valdoria|norden': 30,
  'valdoria|mireth': 28,
  'valdoria|celestia': 38,
  'norden|isthia': 22,
  'norden|celestia': 30,
  'norden|ornea': 35,
  'celestia|isthia': 72,
  'ornea|isthia': 70,
  'ornea|mireth': 75,
  'zarkan|valdoria': 55,
  'zarkan|norden': 45,
};
