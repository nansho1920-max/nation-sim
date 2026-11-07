// 毎月の状態変化から新聞の見出しを生成する（数値計算には一切関与しない）
import { POPS } from '../data/pops';
import { addNews } from './effects';
import { approval } from './derived';

export function generateMonthlyNews(s, prev, rng) {
  if (!prev) return;
  const items = [];
  const e = s.econ;
  const g = e.growth;
  if (g - prev.growth > 0.8) items.push(['経済', `景気回復が鮮明に。成長率は年率${g.toFixed(1)}%へ加速`]);
  else if (g - prev.growth < -0.8) items.push(['経済', `景気に急ブレーキ。成長率は年率${g.toFixed(1)}%に減速`]);
  else if (g < 0) items.push(['経済', `マイナス成長が続く。成長率は年率${g.toFixed(1)}%`]);

  if (e.unemployment - prev.unemployment > 0.4) items.push(['経済', `失業率${e.unemployment.toFixed(1)}%に悪化。雇用不安広がる`]);
  else if (e.unemployment - prev.unemployment < -0.4) items.push(['経済', `失業率${e.unemployment.toFixed(1)}%に改善。人手不足の業界も`]);

  if (e.inflation > 6 && e.inflation > prev.inflation) items.push(['経済', `物価上昇止まらず。インフレ率${e.inflation.toFixed(1)}%`]);
  if (e.inflation < 0) items.push(['経済', `デフレ懸念。物価は前年比${e.inflation.toFixed(1)}%`]);

  const appr = approval(s);
  if (appr - prev.approval > 3) items.push(['政治', `内閣支持率${appr.toFixed(0)}%に上昇`]);
  else if (appr - prev.approval < -3) items.push(['政治', `内閣支持率${appr.toFixed(0)}%に下落。政権運営に暗雲`]);

  const top = [...s.parties].sort((a, b) => s.politics.support[b.id] - s.politics.support[a.id])[0];
  if (rng.chance(0.25)) items.push(['政治', `世論調査：${top.name}が支持率${s.politics.support[top.id].toFixed(1)}%で首位`]);
  const until = s.politics.nextElection - s.month;
  if (until > 0 && until <= 3) items.push(['政治', `総選挙まで残り${until}ヶ月。各党が選挙戦を本格化`]);

  const angry = POPS.filter((p) => s.pops[p.id].sat < 30);
  if (angry.length) items.push(['社会', `${rng.pick(angry).name}の不満が高まる。各地で抗議集会`]);
  if (s.society.environment < 35 && rng.chance(0.3)) items.push(['環境', '大気汚染が深刻化。マスク姿の通勤客が目立つ']);
  if (e.oilPrice - prev.oilPrice > 10) items.push(['経済', `原油価格が急騰、1バレル${e.oilPrice.toFixed(0)}ドルに`]);
  if (e.oilPrice - prev.oilPrice < -10) items.push(['経済', `原油価格が急落、1バレル${e.oilPrice.toFixed(0)}ドルに`]);
  if (e.bondYield > 6 && rng.chance(0.4)) items.push(['財政', `長期金利${e.bondYield.toFixed(1)}%に上昇。財政への懸念強まる`]);

  for (const [cat, text] of rng.shuffle(items).slice(0, 3)) addNews(s, cat, text);
}
