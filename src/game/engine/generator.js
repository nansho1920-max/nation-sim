// ランダム生成：シナリオ（自国の状態・国名）、世界（外国・地図・対立関係・国際機関）、政党構成
import { makeRng } from '../core/rng';
import { clamp, lerp } from '../core/math';
import { AXES, PARTY_COLORS, makeParty } from '../data/parties';

const SYLLABLES = ['ア', 'ル', 'カ', 'ド', 'ミ', 'ノ', 'ラ', 'セ', 'ヴ', 'オ', 'テ', 'リ', 'ス', 'ガ', 'ナ', 'エ', 'ロ', 'キ', 'ハ', 'ム', 'ジ', 'ト', 'フ', 'レ', 'サ', 'ヤ', 'ゼ', 'ク', 'メ', 'ベ', 'イ', 'マ'];
const ENDINGS = ['ア', 'ィア', 'ニア', 'リア', 'ラン', 'スタン', 'ディア', 'ノール', 'ヘイム', 'ガルド', 'ティス', 'オン'];

const GOVS = [
  { gov: '議会制民主主義', suffix: '共和国', econSystem: 'market', aggression: [0.25, 0.7], weight: 4 },
  { gov: '連邦民主制', suffix: '連邦', econSystem: 'market', aggression: [0.3, 0.7], weight: 2 },
  { gov: '立憲君主制', suffix: '王国', econSystem: 'market', aggression: [0.4, 0.9], weight: 2 },
  { gov: '絶対君主制', suffix: '首長国', econSystem: 'market', aggression: [0.7, 1.2], weight: 1.5 },
  { gov: '軍事政権', suffix: '国', econSystem: 'market', aggression: [1.2, 1.7], weight: 1.2 },
  { gov: '一党独裁', suffix: '人民共和国', econSystem: 'planned', aggression: [0.8, 1.3], weight: 1.2 },
];

const NATION_COLORS = ['#b8504a', '#9c7ac9', '#3c95a6', '#a33b52', '#b9853f', '#5772b8', '#6c9a4a', '#c46a8f', '#4f8f7a', '#8a6d3b', '#6a7fb0', '#b0603a'];

export function makeCountryName(rng, used = new Set()) {
  for (let i = 0; i < 40; i++) {
    let n = '';
    const len = rng.int(1, 2);
    for (let k = 0; k < len; k++) n += rng.pick(SYLLABLES);
    n += rng.pick(ENDINGS);
    if (!used.has(n)) {
      used.add(n);
      return n;
    }
  }
  return `第${used.size + 1}国`;
}

function pickWeighted(rng, list) {
  const total = list.reduce((a, x) => a + x.weight, 0);
  let r = rng.next() * total;
  for (const x of list) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

const r1 = (v) => Math.round(v * 10) / 10;

function nationDesc(n) {
  const parts = [];
  if (n.aggression > 1.2) parts.push('好戦的で領土拡張の野心を隠さない');
  else if (n.aggression < 0.5) parts.push('平和外交を国是とする');
  if (n.resource) parts.push('豊富な原油が国力を支えている');
  if (n.tradeAffinity >= 0.9) parts.push('交易で栄え、資金援助に敏感');
  if (n.econSystem === 'planned') parts.push('計画経済を堅持し市場経済国を警戒する');
  if (n.environment >= 65) parts.push('環境先進国として知られる');
  if (!parts.length) parts.push('安定した中堅国家');
  return `${n.gov}の国。${parts.join('。')}。`;
}

/** プレイヤー国家と世界を丸ごとランダムに生成する */
export function generateRandomSetup(seed) {
  const rng = makeRng(seed);
  const used = new Set();

  // ---- 自国 ----
  const dev = rng.next(); // 0=貧しい新興国 〜 1=成熟した先進国
  const resource = rng.chance(0.25);
  const crisis = rng.chance(0.2);
  const aging = r1(clamp(lerp(8, 33, dev * 0.75 + rng.next() * 0.25), 6, 36));
  const birthRate = r1(clamp(lerp(19, 6.5, (aging - 6) / 30) + rng.range(-1, 1), 5, 22));
  const education = Math.round(clamp(lerp(35, 72, dev) + rng.range(-6, 6), 25, 85));
  const gdp = Math.round(lerp(45, 340, dev) * rng.range(0.8, 1.2));
  const population = Math.round(rng.range(1500, 9000));
  const debtRatio = r1(crisis ? rng.range(1.4, 2.0) : rng.range(0.2, 1.3));
  const unemployment = r1(clamp(lerp(10, 4, dev) + rng.range(-2, 3) + (crisis ? 4 : 0), 2, 16));
  const inflation = r1(clamp(lerp(6, 1.2, dev) + rng.range(-1, 2), 0, 12));
  const industry = r1(rng.range(0.2, 0.42) + (resource ? 0.08 : 0));
  const agri = r1(lerp(0.22, 0.02, dev));
  const demand = gdp * 0.33 * (0.7 + industry);
  const supply = demand * rng.range(1.04, 1.2);
  const renewShare = rng.range(0.05, 0.35);
  const nuclearShare = dev > 0.5 && rng.chance(0.5) ? rng.range(0.08, 0.22) : 0;
  const energy = {
    renewable: Math.round(supply * renewShare),
    nuclear: Math.round(supply * nuclearShare),
    fossil: Math.round(supply * (1 - renewShare - nuclearShare)),
  };
  const welfare = r1(lerp(2.5, 7, dev) + rng.range(-1, 1));
  const potentialBase = r1(clamp(lerp(4.2, 0.9, dev) + rng.range(-0.4, 0.4), 0.6, 5));
  const corruption = Math.round(clamp(lerp(60, 15, dev) + rng.range(-10, 10), 5, 80));

  const gov = pickWeighted(rng, GOVS.filter((g) => g.econSystem === 'market' && g.gov !== '軍事政権' && g.gov !== '絶対君主制'));
  const countryName = `${makeCountryName(rng, used)}${gov.suffix}`;

  const traits = [];
  if (dev < 0.3) traits.push('新興国');
  if (dev > 0.75) traits.push('先進国');
  if (resource) traits.push('資源大国');
  if (crisis || debtRatio > 1.4) traits.push('財政危機');
  if (aging > 27) traits.push('少子高齢化');
  if (corruption > 50) traits.push('汚職の蔓延');
  if (unemployment > 9) traits.push('高失業');
  if (inflation > 6) traits.push('高インフレ');
  if (energy.renewable / supply > 0.28) traits.push('再エネ先進国');
  if (!traits.length) traits.push('安定国家');

  const descParts = [];
  if (dev < 0.3) descParts.push('若く貧しいが伸びしろの大きい国');
  else if (dev > 0.75) descParts.push('豊かだが成長の鈍った成熟国家');
  else descParts.push('発展途上から脱しつつある中堅国');
  if (resource) descParts.push('原油収入に財政を頼っている');
  if (debtRatio > 1.4) descParts.push(`政府債務はGDPの${Math.round(debtRatio * 100)}%に達している`);
  if (corruption > 50) descParts.push('汚職が行政を蝕んでいる');
  if (unemployment > 9) descParts.push(`失業率は${unemployment}%と高い`);

  const startSat = Math.round(clamp(56 - (unemployment - 5) * 1.2 - (crisis ? 8 : 0) + rng.range(-4, 4), 36, 62));
  const scenario = {
    id: 'random',
    name: traits.slice(0, 2).join('の'),
    tagline: traits.join('・'),
    desc: `${descParts.join('。')}。`,
    countryName,
    traits,
    econ: {
      gdp,
      growth: r1(potentialBase - (crisis ? 1.5 : 0) + rng.range(-0.8, 0.8)),
      potentialBase,
      inflation,
      unemployment,
      debtRatio,
      treasury: r1(gdp * rng.range(0.01, 0.06) + (resource ? gdp * 0.05 : 0)),
      policyRate: r1(clamp(inflation * 0.8 + rng.range(-0.5, 1), 0, 10)),
      taxes: {
        income: Math.round(lerp(10, 24, dev) + rng.range(-3, 3) - (resource ? 6 : 0)),
        corporate: Math.round(rng.range(15, 30)),
        consumption: Math.round(lerp(6, 14, dev) + rng.range(-2, 3)),
      },
      budget: {
        education: r1(rng.range(2.2, 4.2)),
        health: r1(lerp(2.5, 5, dev) + rng.range(-0.5, 0.5)),
        welfare,
        military: r1(rng.range(1, 3.2)),
        infrastructure: r1(rng.range(1.4, 2.8)),
        research: r1(lerp(0.3, 1.6, dev)),
        environment: r1(rng.range(0.2, 0.8)),
      },
      sectors: { agri, industry, service: r1(1 - agri - industry) },
      resourceOutput: resource ? Math.round(rng.range(10, 24)) : 0,
    },
    society: {
      population,
      aging,
      birthRate,
      education,
      health: Math.round(clamp(lerp(45, 72, dev) + rng.range(-5, 5), 30, 85)),
      environment: Math.round(rng.range(38, 68)),
      infrastructure: Math.round(clamp(lerp(32, 68, dev) + rng.range(-6, 6), 20, 85)),
      gini: Math.round(rng.range(0.28, 0.45) * 100) / 100,
      corruption,
      tension: Math.round(clamp(20 + (unemployment - 5) * 2 + (crisis ? 15 : 0) + rng.range(-5, 10), 5, 70)),
    },
    energy,
    startSat,
    monthsToElection: rng.int(12, 42),
    sizeWeight: r1(rng.range(0.7, 1.1)),
  };

  // ---- 外国 ----
  const colors = rng.shuffle(NATION_COLORS);
  const nations = [];
  for (let i = 0; i < 7; i++) {
    const g = pickWeighted(rng, GOVS);
    const ndev = rng.next();
    const n = {
      id: `n${i + 1}`,
      name: `${makeCountryName(rng, used)}${g.suffix}`,
      color: colors[i],
      gov: g.gov,
      econSystem: g.econSystem,
      gdp: Math.round(lerp(70, 400, ndev) * rng.range(0.8, 1.2)),
      population: Math.round(rng.range(1500, 9500)),
      baseGrowth: r1(lerp(3, 1.0, ndev) + rng.range(-0.4, 0.4)),
      aggression: r1(rng.range(...g.aggression)),
      tradeAffinity: r1(rng.range(0.3, 1.0)),
      environment: Math.round(rng.range(28, 75)),
      resource: rng.chance(0.2),
      sizeWeight: r1(rng.range(0.7, 1.45)),
      relation: Math.round(rng.range(32, 68)),
    };
    n.military = Math.round((n.gdp / 4) * n.aggression * 0.9 + 15 + rng.range(-5, 10));
    if (g.econSystem === 'planned') n.relation -= 10;
    if (n.aggression > 1.2) n.relation -= 8;
    n.desc = nationDesc(n);
    nations.push(n);
  }

  // 国同士の歴史的な対立・友好（初期値に戻ろうとする基準値になる）
  const rivalry = {};
  for (let i = 0; i < nations.length; i++) {
    for (let j = i + 1; j < nations.length; j++) {
      const a = nations[i];
      const b = nations[j];
      let v = rng.range(25, 75);
      if (a.econSystem !== b.econSystem) v -= 15;
      if (a.aggression > 1.2 || b.aggression > 1.2) v -= 10;
      const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
      rivalry[key] = Math.round(clamp(v, 8, 90));
    }
  }

  // 同盟：仲の良い国同士を2組まで
  const pairs = Object.entries(rivalry).sort((a, b) => b[1] - a[1]);
  const alliances = { player: [] };
  let made = 0;
  for (const [key, v] of pairs) {
    if (made >= 2 || v < 60) break;
    const [a, b] = key.split('|');
    if (alliances[a] || alliances[b]) continue;
    alliances[a] = [b];
    alliances[b] = [a];
    made += 1;
  }

  // 国際機関の加盟国
  const democratic = (n) => ['議会制民主主義', '連邦民主制', '立憲君主制'].includes(n.gov);
  const orgs = {
    cec: nations.filter((n) => n.econSystem === 'market' && n.tradeAffinity >= 0.55).slice(0, 4).map((n) => n.id),
    cso: nations.filter((n) => democratic(n) && n.aggression < 0.9).slice(0, 3).map((n) => n.id),
    ccf: nations.filter((n) => n.environment >= 55).map((n) => n.id),
  };
  for (const k of Object.keys(orgs)) if (orgs[k].length < 2) orgs[k] = rng.shuffle(nations.filter((n) => n.econSystem === 'market')).slice(0, 2).map((n) => n.id);

  const playerOrgs = [];
  if (dev > 0.4 && rng.chance(0.6)) playerOrgs.push('cec');
  if (dev > 0.6 && scenario.econ.budget.military >= 2 && rng.chance(0.5)) playerOrgs.push('cso');
  const trade = rng
    .shuffle(nations.filter((n) => n.relation >= 50 && n.econSystem === 'market'))
    .slice(0, rng.int(0, 2))
    .map((n) => n.id);

  return { scenario, nations, worldSeed: rng.int(1, 2 ** 31 - 1), rivalry, alliances, orgs, playerOrgs, trade };
}

// ---- 政党のランダム生成 ----
// 党名は、その党が最も強く掲げる政策の方向から選ぶ（名前と理念がちぐはぐにならないように）
const NAME_WORDS = {
  'econ-': ['労働', '社会', '連帯', '平等', '人民'],
  'econ+': ['自由', '繁栄', '市場', '経済', '自由民主'],
  'social-': ['進歩', '市民', 'リベラル', '共生', '開かれた'],
  'social+': ['保守', '伝統', '国民', '家族', '秩序'],
  'eco-': ['開発', '産業', '成長', '前進', '躍進'],
  'eco+': ['緑の', '大地', '環境', '森と水の', 'みどり'],
  'nation-': ['連邦', '世界', '協調', '大陸', '平和'],
  'nation+': ['祖国', '愛国', '主権', '国家', '独立'],
  'reform-': ['立憲', '民主', '統一', '共和', '中央'],
  'reform+': ['改革', '維新', '新生', '刷新', '未来'],
};
const PARTY_TAILS = ['党', '党', '党', '連合', '同盟', '運動', '会議', 'フォーラム'];

export function generateRandomParties(seed, count) {
  const rng = makeRng(seed);
  const n = count ?? rng.int(4, 7);
  const colors = rng.shuffle(PARTY_COLORS);
  const usedNames = new Set();
  const parties = [];
  for (let i = 0; i < n; i++) {
    const axes = {};
    for (const ax of AXES) axes[ax.id] = Math.round(clamp(rng.normal() * 0.7, -1, 1) * 10) / 10;
    const ranked = AXES.map((ax) => ({ id: ax.id, v: axes[ax.id] })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    const word = (x) => rng.pick(NAME_WORDS[`${x.id}${x.v >= 0 ? '+' : '-'}`]);
    let name;
    let tries = 0;
    do {
      const first = word(ranked[0]);
      const second = rng.chance(0.35) ? word(ranked[1]) : '';
      name = `${first}${second}${rng.pick(PARTY_TAILS)}`;
      tries += 1;
    } while (usedNames.has(name) && tries < 30);
    if (usedNames.has(name)) name = `${name}${i + 1}`;
    usedNames.add(name);
    const short = name.replace(/(党|連合|同盟|運動|会議|フォーラム)$/, '').replace(/[のと]/g, '').slice(0, 2);
    parties.push(makeParty({ id: `p${i + 1}`, name, short, color: colors[i % colors.length], axes }));
  }
  return parties;
}
