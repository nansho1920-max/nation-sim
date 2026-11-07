// 社会（人口・教育・医療・環境・格差）と人口集団の満足度の月次処理
import { approach, clamp } from '../core/math';
import { POPS } from '../data/pops';
import { approval, energyStats, ministerEff, playerWars } from './derived';

export function runSociety(s, fx) {
  const soc = s.society;
  const e = s.econ;
  const b = e.budget;
  const eduEff = ministerEff(s, 'education');
  const welEff = ministerEff(s, 'welfare');

  // 教育・医療・インフラは予算に応じた目標値へゆっくり近づく
  const eduTarget = clamp(28 + b.education * 11 * eduEff + (fx.eduTarget ?? 0), 0, 100);
  soc.education = approach(soc.education, eduTarget, 0.025);

  const en = energyStats(s, fx);
  const healthTarget = clamp(25 + b.health * 8 * welEff + (fx.healthTarget ?? 0) + (soc.environment - 50) * 0.15, 0, 100);
  soc.health = approach(soc.health, healthTarget, 0.04);

  const infraTarget = clamp(28 + b.infrastructure * 15 * ministerEff(s, 'economy'), 0, 100);
  soc.infrastructure = approach(soc.infrastructure, infraTarget, 0.025);

  // 環境：CO₂が多いほど悪化、環境予算で改善
  const co2PerGdp = (en.co2 / Math.max(1, e.gdp)) * 100;
  const envTarget = clamp(85 - co2PerGdp * 1.3 + b.environment * 6 * ministerEff(s, 'environment') + (fx.envTarget ?? 0), 0, 100);
  soc.environment = approach(soc.environment, envTarget, 0.03);
  soc.co2 = en.co2;

  // 格差（ジニ係数）
  const giniTarget = clamp(
    0.34 + (fx.planned ? -0.06 : 0.02) + (25 - e.taxes.corporate) * 0.002 + (20 - e.taxes.income) * 0.0025 - (b.welfare - 5) * 0.012 + (fx.giniTarget ?? 0),
    0.2,
    0.65,
  );
  soc.gini = approach(soc.gini, giniTarget, 0.04);

  // 人口動態
  const birth = clamp(soc.birthRate0 + (fx.birthRate ?? 0) - Math.max(0, e.unemployment - 6) * 0.15, 3, 30);
  soc.birthRate = birth;
  const death = 7 + Math.max(0, soc.aging - 15) * 0.18 - (soc.health - 60) * 0.03;
  const growthPerMonth = (birth - death) / 1000 / 12;
  soc.population = Math.max(100, soc.population * (1 + growthPerMonth));
  // 高齢化率は出生率が低いほど上がる
  soc.aging = clamp(soc.aging + (11 - birth) * 0.004 + 0.01, 3, 50);

  // 汚職と緊張
  const corruptionTrend =
    0.12 +
    (fx.corruptionTrend ?? 0) +
    Object.values(s.politics.ministers).reduce((a, m) => a + (3 - m.integrity) * 0.08, 0);
  soc.corruption = clamp(soc.corruption + corruptionTrend, 0, 100);

  const appr = approval(s);
  const tensionTarget = clamp(
    (100 - appr) * 0.6 + playerWars(s).length * 10 + Math.max(0, e.inflation - 8) * 1.2 + Math.max(0, e.unemployment - 8) * 1.5 + (fx.tensionTarget ?? 0),
    0,
    100,
  );
  soc.tension = approach(soc.tension, tensionTarget, 0.1);
}

/** 各人口集団の満足度の目標値を計算する（UIの内訳表示にも使う） */
export function popTargets(s, fx) {
  const e = s.econ;
  const soc = s.society;
  const b = e.budget;
  const t = e.taxes;
  const pi = e.inflation;
  const u = e.unemployment;
  const wars = playerWars(s);
  const warMood = wars.reduce((a, w) => a + (w.months < 4 ? 4 : -Math.min(12, (w.months - 3) * 0.8)), 0);
  const common = warMood - soc.tension * 0.08 + (s.meta.diffMods?.satBonus ?? 0) - (s.politics.fatigue ?? 0);
  const totalSpend = e.lastMonth?.spendingPct ?? 17;

  const factors = {
    workers: [
      ['失業率', -(u - 5) * 3],
      ['物価', -Math.max(0, pi - 3) * 1.5],
      ['所得税', -(t.income - 20) * 0.8],
      ['消費税', -(t.consumption - 10) * 1.0],
      ['社会保障', (b.welfare - 5) * 3],
      ['格差', -(soc.gini - 0.33) * 80],
    ],
    capitalists: [
      ['法人税', -(t.corporate - 25) * 1.5],
      ['所得税', -(t.income - 20) * 0.5],
      ['経済成長', (e.growth - 1.5) * 4],
      ['金利', -(e.policyRate - 2) * 1.5],
      ['物価', -Math.max(0, pi - 5) * 1],
    ],
    farmers: [
      ['物価', -Math.max(0, pi - 3) * 1.2],
      ['インフラ', (soc.infrastructure - 50) * 0.2],
      ['消費税', -(t.consumption - 10) * 0.6],
      ['環境', (soc.environment - 50) * 0.1],
    ],
    publicServants: [
      ['政府支出', (totalSpend - 17) * 1.5],
      ['汚職の取締り', -Math.max(0, 40 - soc.corruption) * 0.05],
      ['社会の安定', -Math.max(0, soc.tension - 40) * 0.1],
    ],
    youth: [
      ['教育', (soc.education - 60) * 0.4],
      ['失業率', -(u - 5) * 3.5],
      ['環境', (soc.environment - 60) * 0.25],
      ['技術', s.tech.researched.length * 0.6],
    ],
    elderly: [
      ['年金・福祉', (b.welfare - 5) * 4],
      ['医療', (soc.health - 60) * 0.3 + (b.health - 4) * 1.5],
      ['物価', -Math.max(0, pi - 2) * 2],
    ],
  };

  const out = {};
  for (const p of POPS) {
    const list = factors[p.id].map(([label, v]) => ({ label, value: v }));
    const law = fx.popTarget[p.id] ?? 0;
    if (law) list.push({ label: '法律・政策', value: law });
    if (common) list.push({ label: '情勢（政権疲れ・戦争・緊張）', value: common });
    const target = clamp(51 + list.reduce((a, f) => a + f.value, 0), 0, 100);
    out[p.id] = { target, factors: list };
  }
  return out;
}

export function runPops(s, fx) {
  const targets = popTargets(s, fx);
  for (const p of POPS) {
    s.pops[p.id].sat = clamp(approach(s.pops[p.id].sat, targets[p.id].target, 0.12), 0, 100);
    s.pops[p.id].target = targets[p.id].target;
  }
}
