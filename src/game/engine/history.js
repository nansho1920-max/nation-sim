import { approval, debtRatio, energyStats, militaryPower } from './derived';

/** 統計グラフ用の月次スナップショット */
export function snapshot(s) {
  const en = energyStats(s);
  return {
    month: s.month,
    y: s.date.y,
    m: s.date.m,
    gdp: s.econ.gdp,
    growth: s.econ.growth,
    inflation: s.econ.inflation,
    unemployment: s.econ.unemployment,
    debtRatio: debtRatio(s),
    treasury: s.econ.treasury,
    policyRate: s.econ.policyRate,
    bondYield: s.econ.bondYield,
    balance: s.econ.lastMonth?.balance ?? 0,
    approval: approval(s),
    education: s.society.education,
    health: s.society.health,
    environment: s.society.environment,
    gini: s.society.gini,
    corruption: s.society.corruption,
    tension: s.society.tension,
    population: s.society.population,
    aging: s.society.aging,
    co2: en.co2,
    renewableShare: en.renewableShare,
    military: militaryPower(s),
    support: { ...s.politics.support },
    pops: Object.fromEntries(Object.entries(s.pops).map(([k, v]) => [k, v.sat])),
  };
}
