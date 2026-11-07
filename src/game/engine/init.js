// 新しいゲームの初期状態を作る
import { makeRng } from '../core/rng';
import { DIFFICULTIES, SAVE_VERSION, START_DATE } from '../data/balance';
import { getScenario } from '../data/scenarios';
import { NATIONS, INITIAL_OPINIONS, AI_NATION_IDS } from '../data/nations';
import { ORGS } from '../data/orgs';
import { POPS } from '../data/pops';
import { PARTY_IDS, getParty } from '../data/parties';
import { getWorldMap } from '../world/mapgen';
import { addLog, addNews, normalizeSupport } from './effects';
import { aggregateEffects, coalitionSeats } from './derived';
import { dhondt, formCoalition, refreshCabinet, supportTarget } from './politics';
import { runFiscal } from './economy';
import { snapshot } from './history';

// シナリオごとの初期の外交関係
const START_DIPLOMACY = {
  standard: { trade: ['ornea', 'mireth'], orgs: ['cec'] },
  developing: { trade: [], orgs: [] },
  fiscal_crisis: { trade: ['celestia'], orgs: ['cec'] },
  aging: { trade: ['isthia', 'ornea'], orgs: ['cec', 'cso'] },
  resource: { trade: ['celestia'], orgs: [] },
};

export function createNewGame({ scenarioId = 'standard', difficulty = 'normal', partyId = 'conservative', countryName, seed = 1 }) {
  const sc = getScenario(scenarioId);
  const diff = DIFFICULTIES[difficulty] ?? DIFFICULTIES.normal;
  const rng = makeRng(seed);
  const map = getWorldMap();

  const nations = {};
  for (const def of NATIONS) {
    if (def.id === 'player') continue;
    nations[def.id] = {
      id: def.id,
      name: def.name,
      color: def.color,
      gov: def.gov,
      econSystem: def.econSystem,
      gdp: def.gdp,
      population: def.population,
      military: def.military,
      growth: def.baseGrowth,
      relation: Math.round(def.relation + rng.range(-5, 5)),
      sanctionTurns: 0,
    };
  }
  const opinions = {};
  for (const a of AI_NATION_IDS) {
    for (const b of AI_NATION_IDS) {
      if (a >= b) continue;
      const key = `${a}|${b}`;
      opinions[key] = INITIAL_OPINIONS[key] ?? INITIAL_OPINIONS[`${b}|${a}`] ?? Math.round(50 + rng.range(-12, 12));
    }
  }
  const startDiplo = START_DIPLOMACY[sc.id] ?? START_DIPLOMACY.standard;
  const orgs = Object.fromEntries(ORGS.map((o) => [o.id, [...o.members, ...(startDiplo.orgs.includes(o.id) ? ['player'] : [])]]));

  const s = {
    version: SAVE_VERSION,
    meta: {
      scenarioId: sc.id,
      difficulty: diff.id,
      partyId,
      countryName: countryName?.trim() || sc.countryName,
      startDate: { ...START_DATE },
      diffMods: { ...diff },
      seed,
    },
    date: { ...START_DATE },
    day: 0,
    month: 0,
    rng: rng.state,
    econ: {
      gdp: sc.econ.gdp,
      growth: sc.econ.growth,
      potentialBase: sc.econ.potentialBase,
      potential: sc.econ.potentialBase,
      inflation: sc.econ.inflation,
      unemployment: sc.econ.unemployment,
      naturalUnemp: 4.2,
      debt: sc.econ.gdp * sc.econ.debtRatio,
      treasury: sc.econ.treasury * diff.treasuryMult,
      policyRate: sc.econ.policyRate,
      cbAuto: true,
      bondYield: sc.econ.policyRate + 1,
      avgRate: sc.econ.policyRate + 1,
      taxes: { ...sc.econ.taxes },
      budget: { ...sc.econ.budget },
      sectors: { ...sc.econ.sectors },
      resourceOutput: sc.econ.resourceOutput,
      oilPrice: 80,
      moneyShock: 0,
      lastMonth: null,
      bondsIssuedThisMonth: 0,
    },
    society: { ...sc.society, birthRate0: sc.society.birthRate, co2: 0 },
    energy: { ...sc.energy, projects: [] },
    military: 20 + sc.econ.budget.military * 22,
    pops: Object.fromEntries(
      POPS.map((p) => {
        const sat = sc.startSat + diff.satBonus + rng.range(-6, 6);
        return [p.id, { sat, target: sat }];
      }),
    ),
    politics: {
      capital: 40,
      lastCapitalGain: 0,
      support: {},
      seats: {},
      coalition: [partyId],
      laws: {},
      ministers: {},
      candidates: {},
      candidateSeq: 0,
      nextElection: sc.monthsToElection,
      elections: [],
      promise: null,
      fatigue: 0,
    },
    tech: { points: 0, researched: [], current: null },
    world: {
      nations,
      owners: [...map.initialOwner],
      capitals: { ...map.capitals },
      wars: [],
      warSeq: 0,
      trade: Object.fromEntries(startDiplo.trade.map((t) => [t, true])),
      alliances: { celestia: ['isthia'], isthia: ['celestia'], valdoria: ['zarkan'], zarkan: ['valdoria'], player: [] },
      orgs,
      opinions,
      reputation: 50,
    },
    modifiers: [],
    events: { pending: null, cooldowns: {}, scheduled: [], lastEventDay: -8, flags: {} },
    history: [],
    logs: [],
    logSeq: 0,
    news: [],
    newsSeq: 0,
    stats: { events: 0, wars: 0, warsWon: 0, warsLost: 0, electionsWon: 0, lawsPassed: 0, promisesKept: 0, provincesGained: 0, provincesLost: 0 },
    lowApprovalMonths: 0,
    gameOver: null,
  };

  // 前回の選挙でプレイヤーの党が政権を獲得した、という状態を作る
  const fx = aggregateEffects(s);
  let support = supportTarget(s, fx);
  for (let i = 0; i < 12; i++) {
    support = normalizeSupport({ ...support, [partyId]: support[partyId] + (i === 0 ? 8 : 3) });
    s.politics.support = support;
    s.politics.seats = dhondt(support, 300);
    s.politics.coalition = formCoalition(s.politics.seats, partyId);
    const largest = PARTY_IDS.reduce((a, b) => (s.politics.seats[a] >= s.politics.seats[b] ? a : b));
    if (coalitionSeats(s) >= 151 && largest === partyId) break;
  }
  refreshCabinet(s, rng);

  // 前月の財政収支を計算しておく（国庫は変えない）
  const treasury = s.econ.treasury;
  const debt = s.econ.debt;
  runFiscal(s, fx);
  s.econ.treasury = treasury;
  s.econ.debt = debt;

  s.history.push(snapshot(s));
  const partners = s.politics.coalition.filter((p) => p !== partyId).map((p) => getParty(p).short);
  addLog(s, `${s.meta.countryName}に${getParty(partyId).name}政権が発足した。${partners.length ? `（${partners.join('・')}との連立）` : ''}`, 'info', 'politics');
  addLog(s, `シナリオ「${sc.name}」— ${sc.desc}`, 'info', 'general');
  addNews(s, '政治', `${getParty(partyId).name}政権が発足。新首相が就任会見`);
  s.rng = rng.state;
  return s;
}
