import { TECHS, getTech } from '../data/techs';
import { addLog, addNews } from './effects';
import { ministerEff } from './derived';

export function researchRate(s, fx) {
  return (s.econ.budget.research * 12 + s.society.education / 25 + (fx.research ?? 0)) * ministerEff(s, 'education');
}

export const techAvailable = (s, tech) => !s.tech.researched.includes(tech.id) && tech.requires.every((r) => s.tech.researched.includes(r));

export function availableTechs(s) {
  return TECHS.filter((t) => techAvailable(s, t));
}

export function runTech(s, fx) {
  s.tech.points += researchRate(s, fx);
  const cur = s.tech.current && getTech(s.tech.current);
  if (cur && s.tech.points >= cur.cost) {
    s.tech.points -= cur.cost;
    s.tech.researched.push(cur.id);
    s.tech.current = null;
    addLog(s, `技術「${cur.name}」の研究が完了した。${cur.desc}`, 'good', 'tech');
    addNews(s, '技術', `${s.meta.countryName}、「${cur.name}」の実用化に成功`);
  }
}
