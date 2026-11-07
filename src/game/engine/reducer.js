// ゲーム全体の reducer。
// 時間は「1日 = 1ティック」で進み、月が変わるたびに経済・社会・政治・外交の月次処理を行う。
// 乱数状態は state.rng に保存されるため、同じ状態と同じ操作からは常に同じ結果になる。
import { makeRng } from '../core/rng';
import { addDay } from '../core/calendar';
import { clamp } from '../core/math';
import { ENERGY_PROJECTS, TERM_MONTHS, TAXES, BUDGET_CATEGORIES } from '../data/balance';
import { MINISTRIES } from '../data/cabinet';
import { partyOf } from './parties';
import { getTech } from '../data/techs';
import { addLog, addModifier, applyEffects, ensureLiquidity } from './effects';
import { aggregateEffects, approval, debtRatio } from './derived';
import { runEconomy, runEnergy, runFiscal } from './economy';
import { runPops, runSociety } from './society';
import { canInvite, proposeLaw, runPolitics } from './politics';
import { checkOrgMembership, joinOrg, leaveOrg, performDiplomacy, proposePeace, runDiplomacy } from './diplomacy';
import { dueScheduled, fireEvent, fireScheduled, monthlyTriggers, pickDailyEvent, resolveEvent } from './events';
import { runTech, techAvailable } from './tech';
import { generateMonthlyNews } from './news';
import { snapshot } from './history';
import { createNewGame } from './init';

function runMonth(s, rng) {
  const fx = aggregateEffects(s);
  const prev = s.history.at(-1);
  s.month += 1;
  runEnergy(s, fx);
  runEconomy(s, fx, rng);
  runFiscal(s, fx);
  runSociety(s, fx);
  runPops(s, fx);
  runTech(s, fx);
  runDiplomacy(s, fx, rng);
  checkOrgMembership(s);
  if (s.gameOver) return;
  runPolitics(s, fx, rng);
  if (s.gameOver) return;

  // 一時的な効果の期限
  s.modifiers = s.modifiers.map((m) => ({ ...m, monthsLeft: m.monthsLeft - 1 })).filter((m) => m.monthsLeft > 0);
  monthlyTriggers(s);

  const lm = s.econ.lastMonth;
  addLog(
    s,
    `月次報告：成長率${s.econ.growth.toFixed(1)}% / 失業率${s.econ.unemployment.toFixed(1)}% / インフレ${s.econ.inflation.toFixed(1)}% / 財政収支${lm.balance >= 0 ? '+' : ''}${lm.balance.toFixed(2)}兆${lm.bondsIssued > 0 ? `（国債${lm.bondsIssued.toFixed(2)}兆を発行）` : ''}`,
    'report',
    'economy',
  );

  // ゲームオーバー判定
  const appr = approval(s);
  s.lowApprovalMonths = appr < 10 ? s.lowApprovalMonths + 1 : 0;
  if (s.lowApprovalMonths >= 3) {
    s.gameOver = { type: 'revolution', title: '革命', reason: '支持率10%未満が3ヶ月続き、全国で蜂起した民衆と軍の一部が大統領府を占拠した。あなたは国外へ亡命した。' };
  } else if (debtRatio(s) > 300 || s.econ.bondYield >= 35) {
    s.gameOver = { type: 'default', title: '財政破綻', reason: '国債の買い手が消え、政府はデフォルト（債務不履行）を宣言した。国際機関の管理下で政権は退陣に追い込まれた。' };
  } else if (s.econ.inflation > 300) {
    s.gameOver = { type: 'hyperinflation', title: 'ハイパーインフレ', reason: '通貨の価値が紙くず同然となり、経済は崩壊した。混乱の責任を取って政権は総辞職した。' };
  } else if (s.month >= TERM_MONTHS) {
    s.gameOver = { type: 'victory', title: '任期満了', reason: `${TERM_MONTHS / 12}年間の任期を全うした。あなたの政策は国家の歴史に刻まれた。` };
  }

  s.history.push(snapshot(s));
  generateMonthlyNews(s, prev, rng);
}

/** 1日進める */
function tick(state) {
  if (!state || state.gameOver || state.events.pending) return state;
  const { date, monthChanged } = addDay(state.date);
  const day = state.day + 1;
  const rng = makeRng(state.rng);

  if (!monthChanged) {
    const probe = { ...state, day };
    const due = dueScheduled(probe);
    const fx = aggregateEffects(state);
    const picked = due ? null : pickDailyEvent(probe, fx, rng);
    if (!due && !picked) return { ...state, date, day, rng: rng.state };
    const s = structuredClone(state);
    s.date = date;
    s.day = day;
    if (due) fireScheduled(s, due, fx, rng);
    else fireEvent(s, picked, {}, fx, rng);
    s.rng = rng.state;
    return s;
  }

  const s = structuredClone(state);
  s.date = date;
  s.day = day;
  runMonth(s, rng);
  if (!s.gameOver) {
    const fx = aggregateEffects(s);
    const due = dueScheduled(s);
    if (due) fireScheduled(s, due, fx, rng);
  }
  s.rng = rng.state;
  return s;
}

/** 状態を複製して変更する（プレイヤーの操作用） */
function mutate(state, fn) {
  if (!state || state.gameOver) return state;
  const s = structuredClone(state);
  const rng = makeRng(s.rng);
  fn(s, rng);
  s.rng = rng.state;
  return s;
}

function applyBudget(s, { taxes, budget }) {
  const e = s.econ;
  const changes = [];
  for (const t of TAXES) {
    const v = clamp(Math.round(taxes[t.id]), t.min, t.max);
    const d = v - e.taxes[t.id];
    if (!d) continue;
    changes.push(`${t.label}${e.taxes[t.id]}→${v}%`);
    e.taxes[t.id] = v;
    const k = d > 0 ? 1 : 0.5; // 減税の喜びは増税の怒りより小さい
    if (t.id === 'income') applyEffects(s, { pops: { workers: -d * 0.8 * k, publicServants: -d * 0.4 * k } });
    if (t.id === 'corporate') applyEffects(s, { pops: { capitalists: -d * 1.2 * k } });
    if (t.id === 'consumption') {
      applyEffects(s, { pops: { workers: -d * 1.0 * k, farmers: -d * 0.8 * k, elderly: -d * 0.6 * k } });
      if (d > 0) addModifier(s, { id: `cons_tax_${s.month}`, label: '消費税増税の物価上昇', months: 6, effects: { inflation: d * 0.35 } });
    }
  }
  for (const c of BUDGET_CATEGORIES) {
    const v = clamp(Math.round(budget[c.id] * 10) / 10, c.min, c.max);
    const d = v - e.budget[c.id];
    if (Math.abs(d) < 0.05) continue;
    changes.push(`${c.label}${e.budget[c.id].toFixed(1)}→${v.toFixed(1)}%`);
    e.budget[c.id] = v;
    if (d < 0) applyEffects(s, { pops: { publicServants: d * 1.5 } });
  }
  if (!changes.length) return;
  s.politics.capital -= 5;
  addLog(s, `予算・税制を改定した：${changes.join('、')}`, 'action', 'economy');
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME':
      return createNewGame(action.options);
    case 'LOAD':
      return action.state;
    case 'CLEAR':
      return null;
    case 'TICK':
      return tick(state);
    case 'TICK_DAYS': {
      let s = state;
      for (let i = 0; i < action.days; i++) {
        const next = tick(s);
        if (next === s) break;
        s = next;
      }
      return s;
    }
    case 'RESOLVE_EVENT':
      return mutate(state, (s, rng) => resolveEvent(s, action.index, rng));
    case 'APPLY_BUDGET':
      return state.politics.capital < 5 ? state : mutate(state, (s) => applyBudget(s, action));
    case 'SET_POLICY_RATE':
      return mutate(state, (s) => {
        const v = clamp(Math.round(action.rate * 4) / 4, 0, 20);
        s.econ.cbAuto = false;
        if (v === s.econ.policyRate) return;
        addLog(s, `中央銀行が政策金利を${s.econ.policyRate.toFixed(2)}%から${v.toFixed(2)}%へ変更した。`, 'action', 'economy');
        s.econ.policyRate = v;
      });
    case 'SET_CB_AUTO':
      return mutate(state, (s) => {
        s.econ.cbAuto = !!action.auto;
        addLog(s, action.auto ? '金融政策を独立した中央銀行に委ねた（自動調整）。' : '政府が金融政策を直接管理することにした。', 'action', 'economy');
      });
    case 'PRINT_MONEY':
      return mutate(state, (s) => {
        if (s.politics.capital < 5) return;
        const amount = s.econ.gdp * 0.02;
        s.politics.capital -= 5;
        s.econ.treasury += amount;
        s.econ.moneyShock += 4;
        s.world.reputation = clamp(s.world.reputation - 2, 0, 100);
        addLog(s, `中央銀行に国債を引き受けさせ、${amount.toFixed(1)}兆の紙幣を増刷した。インフレ圧力が高まる。`, 'warn', 'economy');
      });
    case 'REPAY_DEBT':
      return mutate(state, (s) => {
        const amount = Math.min(s.econ.treasury, action.amount, s.econ.debt);
        if (amount <= 0) return;
        s.econ.treasury -= amount;
        s.econ.debt -= amount;
        addLog(s, `国債${amount.toFixed(1)}兆を繰上償還した。`, 'action', 'economy');
      });
    case 'BUILD_ENERGY':
      return mutate(state, (s) => {
        const p = ENERGY_PROJECTS[action.kind];
        const fx = aggregateEffects(s);
        if (!p || s.politics.capital < 5) return;
        if (p.requiresLaw && !fx.nuclearAllowed) return;
        const mult = p.id === 'renewable' ? fx.renewableCostMult ?? 1 : p.id === 'nuclear' ? fx.nuclearCostMult ?? 1 : 1;
        const cost = (s.econ.gdp * p.costPct * mult) / 100;
        s.econ.treasury -= cost;
        ensureLiquidity(s);
        s.politics.capital -= 5;
        s.energy.projects.push({ type: p.id, capacity: p.capacity, monthsLeft: p.months });
        addLog(s, `${p.label}の建設を開始した（${cost.toFixed(1)}兆、完成まで${p.months}ヶ月）。`, 'action', 'economy');
      });
    case 'PROPOSE_LAW':
      return mutate(state, (s) => proposeLaw(s, action.lawId, !!action.repeal));
    case 'APPOINT_MINISTER':
      return mutate(state, (s) => {
        const cand = s.politics.candidates[action.ministry]?.find((c) => c.id === action.candidateId);
        if (!cand || s.politics.capital < 5) return;
        s.politics.capital -= 5;
        s.politics.ministers[action.ministry] = cand;
        const m = MINISTRIES.find((x) => x.id === action.ministry);
        addLog(s, `${m.name}に${cand.name}（${partyOf(s, cand.party).short}）を任命した。`, 'action', 'politics');
      });
    case 'INVITE_PARTY':
      return mutate(state, (s) => {
        if (!canInvite(s, action.partyId).ok) return;
        s.politics.capital -= 15;
        s.politics.coalition.push(action.partyId);
        addLog(s, `${partyOf(s, action.partyId).name}を連立政権に迎え入れた。`, 'politics', 'politics');
      });
    case 'DISMISS_PARTY':
      return mutate(state, (s) => {
        if (action.partyId === s.meta.partyId) return;
        s.politics.coalition = s.politics.coalition.filter((p) => p !== action.partyId);
        for (const [k, m] of Object.entries(s.politics.ministers)) if (m.party === action.partyId) delete s.politics.ministers[k];
        addLog(s, `${partyOf(s, action.partyId).name}が連立政権から離脱した。`, 'warn', 'politics');
      });
    case 'DIPLOMACY':
      return mutate(state, (s, rng) => performDiplomacy(s, action.action, action.targetId, rng));
    case 'PEACE':
      return mutate(state, (s, rng) => proposePeace(s, action.warId, action.kind, rng));
    case 'JOIN_ORG':
      return mutate(state, (s) => joinOrg(s, action.orgId));
    case 'LEAVE_ORG':
      return mutate(state, (s) => leaveOrg(s, action.orgId));
    case 'SET_RESEARCH':
      return mutate(state, (s) => {
        const t = getTech(action.techId);
        if (t && techAvailable(s, t)) s.tech.current = t.id;
      });
    default:
      return state;
  }
}
