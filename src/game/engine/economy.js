// 経済・財政・エネルギーの月次処理
import { approach, clamp, sum } from '../core/math';
import { BUDGET_CATEGORIES, ENERGY_PROJECTS } from '../data/balance';
import { addLog, ensureLiquidity } from './effects';
import { debtRatio, energyStats, ministerEff, playerWars } from './derived';

export function tradePartners(s, fx) {
  if (fx.isolation) return [];
  return Object.keys(s.world.trade).filter((id) => s.world.trade[id]);
}

export function runEnergy(s, fx) {
  const en = s.energy;
  // 建設中の発電所
  const done = [];
  en.projects = en.projects
    .map((p) => ({ ...p, monthsLeft: p.monthsLeft - 1 }))
    .filter((p) => {
      if (p.monthsLeft <= 0) {
        done.push(p);
        return false;
      }
      return true;
    });
  for (const p of done) {
    en[p.type] += p.capacity;
    addLog(s, `${ENERGY_PROJECTS[p.type].label}が完成した（発電容量+${p.capacity}）。`, 'good', 'economy');
  }
  // 環境予算と再エネ推進法による自然な再エネ導入
  const envEff = ministerEff(s, 'environment');
  en.renewable += (s.econ.budget.environment * 0.12 + (fx.renewableGrowth ?? 0)) * envEff;
  // 老朽化した火力は少しずつ廃止される
  en.fossil = Math.max(0, en.fossil * 0.999);
}

export function runEconomy(s, fx, rng) {
  const e = s.econ;
  const soc = s.society;
  const planned = !!fx.planned;

  // 原油価格（80ドル近辺に回帰するランダムウォーク）
  e.oilPrice = clamp(e.oilPrice + (80 - e.oilPrice) * 0.04 + rng.normal() * 3, 25, 250);

  const en = energyStats(s, fx);
  const partners = tradePartners(s, fx);
  const tradeBonus = partners.length * 0.25 * (1 + (fx.tradeMult ?? 0));
  const econEff = ministerEff(s, 'economy');

  const potential =
    e.potentialBase +
    (soc.education - 55) * 0.03 +
    (soc.infrastructure - 55) * 0.025 +
    (fx.potential ?? 0) +
    tradeBonus -
    Math.max(0, soc.aging - 22) * 0.05 +
    (econEff - 1) * 2;

  const t = e.taxes;
  let taxDrag = (t.income - 20) * 0.045 + (t.corporate - 25) * 0.055 + (t.consumption - 10) * 0.07;
  if (taxDrag < 0) taxDrag *= 0.6; // 減税の効果は増税の悪影響より小さい

  const last = e.lastMonth;
  const fiscalImpulse = last ? clamp(((last.spending - last.revenue) / (e.gdp / 12)) * 100 * 0.12, -1, 1.2) : 0;
  const realRate = e.policyRate - e.inflation;
  const rateEffect = clamp(-(realRate - 0.5) * 0.25, -3, 1.5);
  const inflationDrag = Math.max(0, e.inflation - 4) * 0.12 + Math.max(0, -e.inflation) * 0.4;
  const shortageDrag = en.shortage * 12;
  const warDrag = playerWars(s).length * 1.2;
  const corruptionDrag = soc.corruption * 0.012;
  const resourceRevenueShare = (e.resourceOutput * 80 * 12) / 1000 / e.gdp;
  const oilEffect = e.resourceOutput > 0 ? ((e.oilPrice - 80) / 80) * resourceRevenueShare * 6 : -((e.oilPrice - 80) / 80) * 0.3;
  const noise = rng.normal() * (planned ? 0.15 : 0.7);

  const target =
    potential - taxDrag + fiscalImpulse + rateEffect - inflationDrag - shortageDrag - warDrag - corruptionDrag + oilEffect + (fx.growth ?? 0) + noise;

  e.potential = potential;
  // 独立した中央銀行（自動モード）はテイラー・ルールで政策金利を決める
  if (e.cbAuto) {
    const taylor = clamp(1 + e.inflation + 0.5 * (e.inflation - 2) + 0.5 * (e.growth - potential), 0, 20);
    e.policyRate = Math.round(approach(e.policyRate, taylor, 0.35) * 4) / 4;
  }
  e.growth = clamp(approach(e.growth, target, 0.45), -25, 25);
  e.gdp = Math.max(5, e.gdp * (1 + e.growth / 1200));

  // 失業率（オークンの法則）
  const natural = 4.2 + (fx.naturalUnemp ?? 0) + (soc.education < 45 ? 1 : 0);
  const uTarget = natural + (potential - e.growth) * 0.6;
  e.naturalUnemp = natural;
  e.unemployment = clamp(approach(e.unemployment, uTarget, 0.12), 0.8, 40);

  // インフレ率
  e.moneyShock *= 0.85;
  const fossilShare = en.generated > 0 ? en.fossilUsed / en.generated : 0;
  const oilPass = e.resourceOutput > 0 ? 0 : ((e.oilPrice - 80) / 80) * 2 * fossilShare;
  let piTarget =
    2 +
    (e.growth - potential) * 0.5 -
    (e.policyRate - 2 - (e.inflation - 2) * 0.5) * 0.45 +
    e.moneyShock +
    oilPass +
    en.shortage * 8 +
    (fx.inflation ?? 0);
  if (e.inflation > 15) piTarget += (e.inflation - 15) * 0.35; // インフレ期待の自己増殖
  if (planned) piTarget = approach(piTarget, 2, 0.5);
  e.inflation = clamp(approach(e.inflation, piTarget, 0.14) + rng.normal() * 0.08, -5, 999);
}

export function runFiscal(s, fx) {
  const e = s.econ;
  const soc = s.society;
  const gdpM = e.gdp / 12;
  const finEff = ministerEff(s, 'finance');
  const collection = clamp((1 - soc.corruption * 0.0025) * (0.92 + finEff * 0.08) + (fx.revenueEff ?? 0), 0.5, 1.2);
  const t = e.taxes;

  const revenueBreakdown = {
    income: ((gdpM * t.income) / 100) * 0.38 * collection,
    corporate: ((gdpM * t.corporate) / 100) * 0.1 * collection * clamp(1 + e.growth / 40, 0.5, 1.5),
    consumption: ((gdpM * t.consumption) / 100) * 0.55 * collection,
    other: (gdpM * (fx.revenuePct ?? 0)) / 100,
    resource: (e.resourceOutput * e.oilPrice) / 1000,
  };
  const revenue = sum(Object.values(revenueBreakdown));

  const agingLoad = 1 + Math.max(0, soc.aging - 24) * 0.02;
  const spendingBreakdown = {};
  for (const c of BUDGET_CATEGORIES) spendingBreakdown[c.id] = (gdpM * e.budget[c.id]) / 100;
  spendingBreakdown.welfare *= agingLoad;
  spendingBreakdown.laws = (gdpM * (fx.spendingPct ?? 0)) / 100;
  spendingBreakdown.unemployment = (gdpM * Math.max(0, e.unemployment - 4) * 0.08) / 100;
  spendingBreakdown.war = (gdpM * playerWars(s).length * 1.5) / 100;
  const spending = sum(Object.values(spendingBreakdown));

  // 国債利回り
  const dr = debtRatio(s);
  e.bondYield = clamp(
    e.policyRate + Math.max(0, dr - 90) * 0.015 + Math.max(0, dr - 200) * 0.03 + Math.max(0, e.inflation - 4) * 0.3 + soc.corruption * 0.01 + (fx.bondPremium ?? 0) - (finEff - 1) * 2,
    0,
    40,
  );
  e.avgRate = approach(e.avgRate, e.bondYield, 0.04);
  const interest = (e.debt * e.avgRate) / 100 / 12;

  const balance = revenue - spending - interest;
  e.bondsIssuedThisMonth = 0;
  e.treasury += balance;
  ensureLiquidity(s);

  e.lastMonth = {
    revenue,
    spending,
    interest,
    balance,
    revenueBreakdown,
    spendingBreakdown,
    bondsIssued: e.bondsIssuedThisMonth,
    revenuePct: (revenue / gdpM) * 100,
    spendingPct: ((spending + interest) / gdpM) * 100,
  };
}
