// シナリオ定義。プレイヤー国家の初期状態を決める。

const BASE_BUDGET = { education: 3, health: 4, welfare: 5, military: 2, infrastructure: 2, research: 1, environment: 0.5 };

export const SCENARIOS = [
  {
    id: 'standard',
    name: '中堅民主国家',
    tagline: 'バランスの取れた出発点',
    desc: '経済・財政・社会のいずれも平均的な民主国家。どの方向にも舵を切れる自由度の高いシナリオ。',
    countryName: 'アルカディア共和国',
    econ: {
      gdp: 250, growth: 1.5, potentialBase: 1.3, inflation: 2.0, unemployment: 5.0, debtRatio: 0.6, treasury: 10,
      policyRate: 1.5, taxes: { income: 20, corporate: 25, consumption: 10 }, budget: { ...BASE_BUDGET },
      sectors: { agri: 0.06, industry: 0.3, service: 0.64 }, resourceOutput: 0,
    },
    society: { population: 5240, aging: 24, birthRate: 8.5, education: 60, health: 62, environment: 55, infrastructure: 58, gini: 0.33, corruption: 25, tension: 20 },
    energy: { fossil: 60, nuclear: 10, renewable: 20 },
    startSat: 56,
    monthsToElection: 30,
  },
  {
    id: 'developing',
    name: '新興国の経済発展',
    tagline: '貧しいが若く、伸びしろは大きい',
    desc: '人口は若く潜在成長率は高いが、教育・インフラは未整備で汚職が蔓延している。小国を先進国へ導け。',
    countryName: 'ソラリス連邦共和国',
    econ: {
      gdp: 60, growth: 4.5, potentialBase: 4.2, inflation: 6.0, unemployment: 9.0, debtRatio: 0.45, treasury: 2,
      policyRate: 5, taxes: { income: 12, corporate: 20, consumption: 8 },
      budget: { education: 2.5, health: 2.5, welfare: 2.5, military: 1.5, infrastructure: 2.5, research: 0.4, environment: 0.2 },
      sectors: { agri: 0.22, industry: 0.33, service: 0.45 }, resourceOutput: 0,
    },
    society: { population: 3800, aging: 8, birthRate: 18, education: 38, health: 45, environment: 50, infrastructure: 32, gini: 0.43, corruption: 58, tension: 35 },
    energy: { fossil: 18, nuclear: 0, renewable: 4 },
    startSat: 50,
    monthsToElection: 24,
  },
  {
    id: 'fiscal_crisis',
    name: '財政危機からの再建',
    tagline: '国債市場が悲鳴を上げている',
    desc: '前政権の放漫財政で政府債務はGDPの1.6倍に達し、失業率も高止まり。国民の不満は爆発寸前だ。',
    countryName: 'ヘレニア共和国',
    econ: {
      gdp: 200, growth: -0.8, potentialBase: 1.1, inflation: 3.5, unemployment: 12, debtRatio: 1.65, treasury: 1.5,
      policyRate: 3, taxes: { income: 22, corporate: 24, consumption: 15 },
      budget: { education: 3, health: 5, welfare: 7.5, military: 1.5, infrastructure: 1.5, research: 0.6, environment: 0.4 },
      sectors: { agri: 0.05, industry: 0.22, service: 0.73 }, resourceOutput: 0,
    },
    society: { population: 4400, aging: 26, birthRate: 7.5, education: 62, health: 64, environment: 58, infrastructure: 55, gini: 0.36, corruption: 40, tension: 50 },
    energy: { fossil: 50, nuclear: 0, renewable: 22 },
    startSat: 40,
    monthsToElection: 18,
  },
  {
    id: 'aging',
    name: '少子高齢化社会',
    tagline: '静かに縮んでいく先進国',
    desc: '豊かだが高齢化率は33%に達し、出生率は過去最低。膨らむ社会保障費と成長の鈍化にどう立ち向かうか。',
    countryName: 'ヤマト共和国',
    econ: {
      gdp: 320, growth: 0.5, potentialBase: 0.9, inflation: 0.8, unemployment: 3.0, debtRatio: 1.6, treasury: 12,
      policyRate: 0.25, taxes: { income: 22, corporate: 27, consumption: 12 },
      budget: { education: 2.8, health: 5, welfare: 6.5, military: 1.2, infrastructure: 1.8, research: 1.4, environment: 0.5 },
      sectors: { agri: 0.02, industry: 0.27, service: 0.71 }, resourceOutput: 0,
    },
    society: { population: 6200, aging: 33, birthRate: 6.5, education: 70, health: 72, environment: 60, infrastructure: 68, gini: 0.31, corruption: 22, tension: 18 },
    energy: { fossil: 70, nuclear: 18, renewable: 18 },
    startSat: 54,
    monthsToElection: 36,
  },
  {
    id: 'resource',
    name: '資源依存国家の転換',
    tagline: '原油価格に国家の命運を握られて',
    desc: '国家収入の多くを原油輸出に頼る。原油価格が下落すれば財政は即座に傾く。産業の多角化を進めよ。',
    countryName: 'カスピア首長国連邦',
    econ: {
      gdp: 140, growth: 2.0, potentialBase: 1.8, inflation: 4.0, unemployment: 8.0, debtRatio: 0.3, treasury: 20,
      policyRate: 3, taxes: { income: 8, corporate: 15, consumption: 5 },
      budget: { education: 2.5, health: 3, welfare: 4, military: 3, infrastructure: 2.5, research: 0.4, environment: 0.2 },
      sectors: { agri: 0.05, industry: 0.45, service: 0.5 }, resourceOutput: 22,
    },
    society: { population: 2900, aging: 10, birthRate: 15, education: 52, health: 58, environment: 42, infrastructure: 50, gini: 0.41, corruption: 50, tension: 30 },
    energy: { fossil: 50, nuclear: 0, renewable: 4 },
    startSat: 55,
    monthsToElection: 30,
  },
];

export const getScenario = (id) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
