// イベントや行動の「効果」を状態に適用する共通処理と、UI向けの効果説明。
// 状態 s は呼び出し側で複製済み（ミュータブルに変更してよい）であることが前提。
import { clamp } from '../core/math';
import { POP_IDS, getPop } from '../data/pops';
import { DEFAULT_PARTIES, axisDistance } from '../data/parties';

/**
 * イベントが「国家主権党 +2%」のように既定の政党を指定していても、
 * プレイヤーが作った政党構成ではその党が存在しないことがある。
 * その場合は政策が最も近い政党に読み替える。
 */
export function resolveParty(s, key) {
  if (s.parties?.some((p) => p.id === key)) return key;
  const def = DEFAULT_PARTIES.find((p) => p.id === key);
  if (!def || !s.parties?.length) return null;
  return s.parties.reduce((best, p) => (axisDistance(p.axes, def.axes) < axisDistance(best.axes, def.axes) ? p : best)).id;
}
import { fmtTrillion } from '../core/format';

const SPECIALS = {};
/** 特殊効果（貿易協定の締結、解散総選挙など）を他のモジュールから登録する */
export const registerSpecial = (key, fn) => {
  SPECIALS[key] = fn;
};

export function addLog(s, text, type = 'info', category = 'general') {
  s.logSeq = (s.logSeq ?? 0) + 1;
  s.logs.unshift({ id: s.logSeq, day: s.day, date: { ...s.date }, text, type, category });
  if (s.logs.length > 400) s.logs.length = 400;
}

export function addNews(s, category, text) {
  s.newsSeq = (s.newsSeq ?? 0) + 1;
  s.news.unshift({ id: s.newsSeq, date: { ...s.date }, category, text });
  if (s.news.length > 30) s.news.length = 30;
}

/** 国庫が赤字になったら国債を発行して穴埋めする */
export function ensureLiquidity(s) {
  if (s.econ.treasury < 0) {
    const issue = -s.econ.treasury;
    s.econ.debt += issue;
    s.econ.treasury = 0;
    s.econ.bondsIssuedThisMonth = (s.econ.bondsIssuedThisMonth ?? 0) + issue;
  }
}

export function addModifier(s, mod) {
  s.modifiers = s.modifiers.filter((m) => m.id !== mod.id);
  s.modifiers.push({ ...mod, monthsLeft: mod.months });
}

export function normalizeSupport(support) {
  const ids = Object.keys(support);
  const total = ids.reduce((a, p) => a + Math.max(0.5, support[p]), 0);
  const out = {};
  for (const p of ids) out[p] = (Math.max(0.5, support[p]) / total) * 100;
  return out;
}

export function applyEffects(s, eff, ctx = {}, rng = null) {
  if (!eff) return;
  const nations = s.world.nations;
  for (const [key, v] of Object.entries(eff)) {
    switch (key) {
      case 'treasuryPct':
        s.econ.treasury += (s.econ.gdp * v) / 100;
        ensureLiquidity(s);
        break;
      case 'treasury':
        s.econ.treasury += v;
        ensureLiquidity(s);
        break;
      case 'pops':
        for (const [pop, d] of Object.entries(v)) s.pops[pop].sat = clamp(s.pops[pop].sat + d, 0, 100);
        break;
      case 'allPops':
        for (const pop of POP_IDS) s.pops[pop].sat = clamp(s.pops[pop].sat + v, 0, 100);
        break;
      case 'modifier':
        addModifier(s, v);
        break;
      case 'corruption':
      case 'tension':
      case 'education':
      case 'health':
      case 'environment':
      case 'infrastructure':
        s.society[key] = clamp(s.society[key] + v, 0, 100);
        break;
      case 'reputation':
        s.world.reputation = clamp(s.world.reputation + v, 0, 100);
        break;
      case 'military':
        s.military = clamp(s.military + v, 0, 250);
        break;
      case 'militaryPct':
        s.military = clamp(s.military * (1 + v / 100), 0, 250);
        break;
      case 'capital':
        s.politics.capital = clamp(s.politics.capital + v, 0, 100);
        break;
      case 'researchPoints':
        s.tech.points = Math.max(0, s.tech.points + v);
        break;
      case 'oilPrice':
        s.econ.oilPrice = clamp(s.econ.oilPrice + v, 20, 250);
        break;
      case 'policyRate':
        s.econ.policyRate = clamp(s.econ.policyRate + v, 0, 25);
        break;
      case 'population':
        s.society.population = Math.max(100, s.society.population + v);
        break;
      case 'relation':
        if (ctx.targetId && nations[ctx.targetId]) nations[ctx.targetId].relation = clamp(nations[ctx.targetId].relation + v, 0, 100);
        break;
      case 'relationAll':
        for (const n of Object.values(nations)) n.relation = clamp(n.relation + v, 0, 100);
        break;
      case 'partySupport': {
        const sup = { ...s.politics.support };
        for (const [key, d] of Object.entries(v)) {
          const p = resolveParty(s, key);
          if (p) sup[p] = (sup[p] ?? 0) + d;
        }
        s.politics.support = normalizeSupport(sup);
        break;
      }
      case 'energy':
        for (const [k, d] of Object.entries(v)) s.energy[k] = Math.max(0, s.energy[k] + d);
        break;
      case 'chain': {
        const chains = Array.isArray(v) ? v : [v];
        for (const c of chains) {
          if (c.chance != null && rng && !rng.chance(c.chance)) continue;
          const [a, b] = c.delay ?? [30, 30];
          const delay = rng ? rng.int(a, b) : a;
          s.events.scheduled.push({ id: c.event, day: s.day + delay, ctx: { ...ctx, ...(c.ctx ?? {}) } });
        }
        break;
      }
      case 'flags':
        s.events.flags = { ...s.events.flags, ...v };
        break;
      case 'special': {
        const list = Array.isArray(v) ? v : [v];
        for (const sp of list) SPECIALS[sp]?.(s, ctx, rng);
        break;
      }
      case 'log':
        addLog(s, v, 'event');
        break;
      default:
        break;
    }
  }
}

// ---------- UI向けの効果説明 ----------

const LABELS = {
  corruption: { label: '汚職', invert: true },
  tension: { label: '社会の緊張', invert: true },
  education: { label: '教育水準' },
  health: { label: '健康水準' },
  environment: { label: '環境' },
  infrastructure: { label: 'インフラ' },
  reputation: { label: '国際評価' },
  military: { label: '軍事力' },
  militaryPct: { label: '軍事力', unit: '%' },
  capital: { label: '政治資本' },
  researchPoints: { label: '研究ポイント' },
  oilPrice: { label: '原油価格', neutral: true },
  policyRate: { label: '政策金利', unit: '%', neutral: true },
  population: { label: '人口', unit: '万人' },
  relation: { label: '対象国との関係' },
  relationAll: { label: '全外国との関係' },
};

const MOD_LABELS = {
  growth: { label: '成長率', unit: '%' },
  potential: { label: '潜在成長率', unit: '%' },
  inflation: { label: 'インフレ率', unit: '%', invert: true },
  naturalUnemp: { label: '失業率', unit: '%', invert: true },
  bondPremium: { label: '国債利回り', unit: '%', invert: true },
  research: { label: '研究/月' },
  healthTarget: { label: '健康水準' },
  eduTarget: { label: '教育水準' },
  tensionTarget: { label: '社会の緊張', invert: true },
  relationDrift: { label: '各国関係/月' },
};

const chip = (text, good, neutral = false) => ({ text, tone: neutral ? 'neutral' : good ? 'good' : 'bad' });
const signed = (v, unit = '', digits = 0) => `${v > 0 ? '+' : ''}${digits ? v.toFixed(digits) : Math.round(v)}${unit}`;

/** 効果オブジェクトを「国庫 -2.5兆」のようなチップの配列に変換する */
export function describeEffects(eff, s) {
  const out = [];
  if (!eff) return out;
  for (const [key, v] of Object.entries(eff)) {
    if (key === 'treasuryPct') out.push(chip(`国庫 ${v > 0 ? '+' : '−'}${fmtTrillion((Math.abs(v) * s.econ.gdp) / 100)}`, v > 0));
    else if (key === 'treasury') out.push(chip(`国庫 ${v > 0 ? '+' : '−'}${fmtTrillion(Math.abs(v))}`, v > 0));
    else if (key === 'pops') for (const [p, d] of Object.entries(v)) out.push(chip(`${getPop(p).name} ${signed(d)}`, d > 0));
    else if (key === 'allPops') out.push(chip(`全国民の満足度 ${signed(v)}`, v > 0));
    else if (key === 'partySupport') for (const [p, d] of Object.entries(v)) out.push(chip(`${s.parties?.find((x) => x.id === resolveParty(s, p))?.short ?? p}支持 ${signed(d, '%', 1)}`, d > 0, true));
    else if (key === 'modifier') {
      for (const [mk, mv] of Object.entries(v.effects ?? {})) {
        if (mk === 'popTarget') {
          for (const [p, d] of Object.entries(mv)) out.push(chip(`${getPop(p).name} ${signed(d)}（${v.months}ヶ月）`, d > 0));
        } else if (MOD_LABELS[mk]) {
          const m = MOD_LABELS[mk];
          out.push(chip(`${m.label} ${signed(mv, m.unit ?? '', Math.abs(mv) < 1 ? 1 : 0)}（${v.months}ヶ月）`, m.invert ? mv < 0 : mv > 0));
        }
      }
    } else if (key === 'energy') for (const [k, d] of Object.entries(v)) out.push(chip(`${k === 'renewable' ? '再エネ' : k === 'nuclear' ? '原子力' : '火力'}発電 ${signed(d)}`, d > 0));
    else if (key === 'chain') out.push(chip('後日、続報あり', true, true));
    else if (key === 'special') {
      const SPECIAL_LABELS = {
        acceptTrade: ['貿易協定を締結（成長率+0.25%）', true],
        formAlliance: ['同盟を締結', true],
        snapElection: ['ただちに総選挙', false, true],
        acceptSurrender: ['州を併合し賠償金を獲得', true],
        promise_taxcut: ['公約：減税', true, true],
        promise_welfare: ['公約：福祉充実', true, true],
        promise_jobs: ['公約：雇用創出', true, true],
        promise_green: ['公約：脱炭素', true, true],
      };
      for (const sp of [].concat(v)) if (SPECIAL_LABELS[sp]) out.push(chip(...SPECIAL_LABELS[sp]));
    }
    else if (LABELS[key]) {
      const l = LABELS[key];
      out.push(chip(`${l.label} ${signed(v, l.unit ?? '')}`, l.invert ? v < 0 : v > 0, l.neutral));
    }
  }
  return out;
}
