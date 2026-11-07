// 政党（すべて架空）

export const PARTIES = [
  { id: 'conservative', name: '保守国民党', short: '保守', color: '#4f7cd6', ideology: '伝統・財政規律', desc: '伝統的価値と健全財政を掲げる中道右派。農村と高齢者に強い。' },
  { id: 'liberal', name: '自由市場党', short: '自由', color: '#e0a32e', ideology: '市場経済・自由競争', desc: '減税と規制緩和を訴える経済自由主義政党。経営者層が支持基盤。' },
  { id: 'socdem', name: '社会民主党', short: '社民', color: '#d9534f', ideology: '福祉・労働者保護', desc: '労働組合を基盤とする中道左派。福祉国家の拡充を掲げる。' },
  { id: 'green', name: '緑の党', short: '緑', color: '#3fae6a', ideology: '環境・再生可能エネルギー', desc: '気候変動対策と脱炭素を最優先する。若者の支持が厚い。' },
  { id: 'nationalist', name: '国家主権党', short: '主権', color: '#8b5cc6', ideology: '国家主権・国内産業保護', desc: '移民制限と保護主義を唱える。国難や戦争の際に支持を伸ばす。' },
  { id: 'reform', name: '改革党', short: '改革', color: '#2cb5c0', ideology: '行政改革・汚職追放', desc: '既得権益の打破と汚職追放を訴える新興政党。都市の無党派層に人気。' },
];

export const PARTY_IDS = PARTIES.map((p) => p.id);
export const getParty = (id) => PARTIES.find((p) => p.id === id);

// 連立の相性 (0〜1)。0.3未満の政党とは連立できない。
const COMPAT_PAIRS = {
  'conservative|liberal': 0.7,
  'conservative|nationalist': 0.6,
  'conservative|reform': 0.5,
  'conservative|socdem': 0.22,
  'conservative|green': 0.2,
  'liberal|reform': 0.7,
  'liberal|green': 0.4,
  'liberal|socdem': 0.22,
  'liberal|nationalist': 0.2,
  'socdem|green': 0.8,
  'socdem|reform': 0.5,
  'socdem|nationalist': 0.25,
  'green|reform': 0.6,
  'green|nationalist': 0.05,
  'nationalist|reform': 0.3,
};

export function compatibility(a, b) {
  if (a === b) return 1;
  return COMPAT_PAIRS[`${a}|${b}`] ?? COMPAT_PAIRS[`${b}|${a}`] ?? 0;
}

export const COALITION_MIN_COMPAT = 0.3;
