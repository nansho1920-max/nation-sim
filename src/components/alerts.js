import { POPS } from '../game/data/pops';
import { MAJORITY } from '../game/data/balance';
import { getPromise } from '../game/engine/politics';
import { playerWars, enemyOf, playerWarScore } from '../game/engine/derived';

/** 今すぐ対応すべき問題の一覧（概要画面に表示） */
export function computeAlerts(s, d) {
  const out = [];
  const add = (level, text, screen) => out.push({ level, text, screen });
  if (d.energy.shortage > 0.01) add('bad', `電力不足（需要の${(d.energy.shortage * 100).toFixed(0)}%が不足）。発電所を建設せよ`, 'economy');
  else if (d.energy.supply < d.energy.demand * 1.05) add('warn', '電力の供給余力がわずか。経済成長で不足に陥る恐れ', 'economy');
  if (d.debtRatio > 200) add('bad', `政府債務がGDP比${d.debtRatio.toFixed(0)}%。300%で財政破綻`, 'economy');
  else if (d.debtRatio > 130) add('warn', `政府債務がGDP比${d.debtRatio.toFixed(0)}%に膨張`, 'economy');
  if (s.econ.bondYield > 7) add('warn', `国債利回り${s.econ.bondYield.toFixed(1)}%。利払い負担が急増中`, 'economy');
  if (d.approval < 15) add('bad', `支持率${d.approval.toFixed(0)}%。10%未満が3ヶ月続くと革命が起きる`, 'society');
  else if (d.approval < 30) add('warn', `支持率${d.approval.toFixed(0)}%。政権運営が不安定`, 'society');
  for (const p of POPS) if (s.pops[p.id].sat < 30) add('warn', `${p.name}の満足度が${s.pops[p.id].sat.toFixed(0)}。抗議行動の恐れ`, 'society');
  if (s.econ.inflation > 10) add('bad', `インフレ率${s.econ.inflation.toFixed(1)}%。利上げが必要`, 'economy');
  if (s.econ.unemployment > 9) add('warn', `失業率${s.econ.unemployment.toFixed(1)}%`, 'economy');
  for (const w of playerWars(s)) {
    const ps = playerWarScore(w);
    add(ps < -30 ? 'bad' : 'warn', `${s.world.nations[enemyOf(w)].name}と交戦中（戦況 ${ps >= 0 ? '+' : ''}${ps.toFixed(0)}）`, 'world');
  }
  const until = s.politics.nextElection - s.month;
  if (until <= 6) add('info', `総選挙まで残り${until}ヶ月`, 'politics');
  if (d.coalitionSeats < MAJORITY) add('warn', `少数与党（${d.coalitionSeats}議席）。法案が通りにくい`, 'politics');
  const pr = s.politics.promise;
  if (pr?.deadline) {
    const left = pr.deadline - s.month;
    if (left <= 9) add('info', `公約「${getPromise(pr.type).label}」の期限まで${left}ヶ月：${getPromise(pr.type).goal}`, 'politics');
  }
  if (!s.tech.current) add('info', '研究テーマが未設定。研究ポイントが貯まるだけになっている', 'tech');
  if (s.politics.capital >= 95) add('info', '政治資本が上限。法案や外交に使おう', 'politics');
  return out;
}
