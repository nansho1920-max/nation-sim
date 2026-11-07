// 任期終了（またはゲームオーバー）時の政権評価と称号
import { clamp } from '../core/math';
import { approval, debtRatio, energyStats } from './derived';

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

export function evaluate(s) {
  const h = s.history;
  const first = h[0] ?? {};
  const last = h.at(-1) ?? {};
  const growthAvg = avg(h.map((x) => x.growth));
  const gdpChange = first.gdp ? (s.econ.gdp / first.gdp - 1) * 100 : 0;
  const rels = Object.values(s.world.nations).map((n) => n.relation);
  const en = energyStats(s);

  const categories = [
    { id: 'economy', label: '経済成長', score: clamp(50 + (growthAvg - 1.5) * 18, 0, 100), detail: `平均成長率 ${growthAvg.toFixed(2)}% / GDP ${gdpChange >= 0 ? '+' : ''}${gdpChange.toFixed(0)}%` },
    {
      id: 'life',
      label: '国民生活',
      score: clamp(approval(s) * 0.7 + (10 - s.econ.unemployment) * 3 + (5 - Math.abs(s.econ.inflation - 2)) * 2, 0, 100),
      detail: `支持率 ${approval(s).toFixed(0)}% / 失業率 ${s.econ.unemployment.toFixed(1)}%`,
    },
    { id: 'education', label: '教育・科学', score: clamp(s.society.education * 0.7 + s.tech.researched.length * 3, 0, 100), detail: `教育水準 ${s.society.education.toFixed(0)} / 技術 ${s.tech.researched.length}件` },
    {
      id: 'fiscal',
      label: '財政健全性',
      score: clamp(70 - (debtRatio(s) - (first.debtRatio ?? debtRatio(s))) * 0.8 - Math.max(0, debtRatio(s) - 100) * 0.2, 0, 100),
      detail: `政府債務 GDP比 ${(first.debtRatio ?? 0).toFixed(0)}% → ${debtRatio(s).toFixed(0)}%`,
    },
    {
      id: 'diplomacy',
      label: '外交',
      score: clamp(avg(rels) * 0.7 + s.world.reputation * 0.4 + s.stats.warsWon * 4 - s.stats.warsLost * 10, 0, 100),
      detail: `平均関係値 ${avg(rels).toFixed(0)} / 国際評価 ${s.world.reputation.toFixed(0)}`,
    },
    { id: 'environment', label: '環境', score: clamp(s.society.environment * 0.7 + en.renewableShare * 0.5, 0, 100), detail: `環境 ${s.society.environment.toFixed(0)} / 再エネ ${en.renewableShare.toFixed(0)}%` },
    {
      id: 'stability',
      label: '政治的安定',
      score: clamp(100 - s.society.tension * 0.8 - s.society.corruption * 0.3 + s.stats.electionsWon * 8, 0, 100),
      detail: `社会の緊張 ${s.society.tension.toFixed(0)} / 選挙勝利 ${s.stats.electionsWon}回`,
    },
  ];
  const total = avg(categories.map((c) => c.score)) * (s.gameOver?.type === 'victory' ? 1 : 0.8);
  const rank = total >= 85 ? 'S' : total >= 72 ? 'A' : total >= 58 ? 'B' : total >= 45 ? 'C' : 'D';

  const byId = Object.fromEntries(categories.map((c) => [c.id, c.score]));
  const titles = [];
  const add = (cond, name, desc) => cond && titles.push({ name, desc });
  add(total >= 85, '歴代最高の政権', '全分野で卓越した成果を残した');
  add(byId.economy >= 80, '経済発展の立役者', '力強い経済成長を実現した');
  add(s.econ.budget.welfare >= 7 && byId.life >= 70, '福祉国家の建設者', '手厚い社会保障と国民生活を両立した');
  add(s.tech.researched.length >= 12, '科学立国の父', '技術ツリーの大半を解禁した');
  add(byId.environment >= 80, '環境先進国の旗手', '脱炭素と環境保全を成し遂げた');
  add((first.debtRatio ?? 0) - debtRatio(s) >= 30, '財政再建の名宰相', '政府債務を大幅に削減した');
  add(s.stats.wars === 0 && byId.diplomacy >= 75, '平和の調停者', '一度も戦争をせず友好関係を築いた');
  add(s.stats.warsWon >= 2, '鉄血の宰相', '2度以上の戦争に勝利した');
  add(s.stats.provincesGained >= 5, '領土拡張者', '5州以上を併合した');
  add(s.stats.electionsWon >= 2, '長期安定政権', '2度以上の総選挙に勝利した');
  add(s.stats.promisesKept >= 2, '有言実行の指導者', '選挙公約を2度以上実現した');
  if (!titles.length) titles.push({ name: '名もなき指導者', desc: '歴史の教科書には一行だけ名前が載るだろう' });

  return { categories, total, rank, titles, gdpChange, last };
}
