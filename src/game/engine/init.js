// 新しいゲームの初期状態を作る
import { makeRng } from '../core/rng';
import { DIFFICULTIES, SAVE_VERSION, START_DATE } from '../data/balance';
import { getScenario } from '../data/scenarios';
import { NATIONS, INITIAL_OPINIONS } from '../data/nations';
import { ORGS } from '../data/orgs';
import { POPS } from '../data/pops';
import { DEFAULT_PARTIES, makeParty } from '../data/parties';
import { DEFAULT_WORLD_SEED, getWorldMap } from '../world/mapgen';
import { addLog, addNews, normalizeSupport } from './effects';
import { aggregateEffects, coalitionSeats } from './derived';
import { dhondt, formCoalition, refreshCabinet, supportTarget } from './politics';
import { partyOf } from './parties';
import { runFiscal } from './economy';
import { snapshot } from './history';
import { generateRandomSetup } from './generator';

// 固定シナリオの初期の外交関係
const START_DIPLOMACY = {
  standard: { trade: ['ornea', 'mireth'], orgs: ['cec'] },
  developing: { trade: [], orgs: [] },
  fiscal_crisis: { trade: ['celestia'], orgs: ['cec'] },
  aging: { trade: ['isthia', 'ornea'], orgs: ['cec', 'cso'] },
  resource: { trade: ['celestia'], orgs: [] },
};

/** シナリオと世界の設定を用意する（固定シナリオ or ランダム生成） */
function buildWorldSetup(scenarioId, scenarioSeed, rng) {
  if (scenarioId === 'random') {
    const setup = generateRandomSetup(scenarioSeed ?? rng.int(1, 2 ** 31 - 1));
    return {
      sc: setup.scenario,
      nationDefs: setup.nations,
      worldSeed: setup.worldSeed,
      rivalry: setup.rivalry,
      alliances: setup.alliances,
      orgs: setup.orgs,
      startDiplo: { trade: setup.trade, orgs: setup.playerOrgs },
    };
  }
  const sc = getScenario(scenarioId);
  const nationDefs = NATIONS.filter((n) => n.id !== 'player');
  const rivalry = {};
  for (const a of nationDefs) {
    for (const b of nationDefs) {
      if (a.id >= b.id) continue;
      const key = `${a.id}|${b.id}`;
      rivalry[key] = INITIAL_OPINIONS[key] ?? INITIAL_OPINIONS[`${b.id}|${a.id}`] ?? Math.round(50 + rng.range(-12, 12));
    }
  }
  return {
    sc,
    nationDefs,
    worldSeed: DEFAULT_WORLD_SEED,
    rivalry,
    alliances: { celestia: ['isthia'], isthia: ['celestia'], valdoria: ['zarkan'], zarkan: ['valdoria'], player: [] },
    orgs: Object.fromEntries(ORGS.map((o) => [o.id, [...o.members]])),
    startDiplo: START_DIPLOMACY[sc.id] ?? START_DIPLOMACY.standard,
  };
}

export function createNewGame({ scenarioId = 'standard', scenarioSeed, difficulty = 'normal', partyId, parties, countryName, seed = 1 }) {
  const diff = DIFFICULTIES[difficulty] ?? DIFFICULTIES.normal;
  const rng = makeRng(seed);
  const { sc, nationDefs, worldSeed, rivalry, alliances, orgs: orgMembers, startDiplo } = buildWorldSetup(scenarioId, scenarioSeed, rng);

  const partyList = (parties?.length ? parties : DEFAULT_PARTIES).map((p) => makeParty(p));
  if (!partyList.some((p) => p.id === partyId)) partyId = partyList[0].id;

  // 先頭はプレイヤー。地図はこの並びと領土の広がりやすさから決まる
  const mapSpec = [{ id: 'player', sizeWeight: sc.sizeWeight ?? 0.8 }, ...nationDefs.map((n) => ({ id: n.id, sizeWeight: n.sizeWeight ?? 1 }))];
  const map = getWorldMap(worldSeed, mapSpec);

  const nations = {};
  for (const def of nationDefs) {
    nations[def.id] = {
      id: def.id,
      name: def.name,
      color: def.color,
      gov: def.gov,
      econSystem: def.econSystem,
      desc: def.desc,
      aggression: def.aggression,
      tradeAffinity: def.tradeAffinity,
      baseGrowth: def.baseGrowth,
      environment: def.environment,
      resource: !!def.resource,
      gdp: def.gdp,
      population: def.population,
      military: def.military,
      growth: def.baseGrowth,
      relation: Math.round(def.relation + rng.range(-5, 5)),
      sanctionTurns: 0,
    };
  }
  const opinions = { ...rivalry };
  const orgs = Object.fromEntries(Object.entries(orgMembers).map(([id, members]) => [id, [...members, ...(startDiplo.orgs.includes(id) ? ['player'] : [])]]));

  const s = {
    version: SAVE_VERSION,
    parties: partyList,
    meta: {
      scenarioId: sc.id,
      scenarioName: sc.name,
      scenarioSeed: scenarioId === 'random' ? scenarioSeed ?? null : null,
      worldSeed,
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
      alliances: { player: [], ...alliances },
      mapSpec,
      rivalry,
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
  for (let i = 0; i < 30; i++) {
    support = normalizeSupport({ ...support, [partyId]: support[partyId] + (i === 0 ? 8 : 3) });
    s.politics.support = support;
    s.politics.seats = dhondt(support, 300);
    s.politics.coalition = formCoalition(s, s.politics.seats, partyId);
    const largest = partyList.map((p) => p.id).reduce((a, b) => (s.politics.seats[a] >= s.politics.seats[b] ? a : b));
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
  const partners = s.politics.coalition.filter((p) => p !== partyId).map((p) => partyOf(s, p).short);
  addLog(s, `${s.meta.countryName}に${partyOf(s, partyId).name}政権が発足した。${partners.length ? `（${partners.join('・')}との連立）` : ''}`, 'info', 'politics');
  addLog(s, `シナリオ「${sc.name}」— ${sc.desc}`, 'info', 'general');
  addNews(s, '政治', `${partyOf(s, partyId).name}政権が発足。新首相が就任会見`);
  s.rng = rng.state;
  return s;
}
