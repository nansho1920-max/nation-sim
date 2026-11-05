// ゲームの状態遷移ロジック（純粋関数の reducer）
import {
  ACTIONS_PER_TURN,
  AID_COST,
  BANKRUPTCY_LIMIT,
  DOMESTIC_ACTIONS,
  EVENT_CHANCE,
  IDEOLOGIES,
  IDEOLOGY_CHANGE_COST,
  IDEOLOGY_COOLDOWN,
  INITIAL_COUNTRIES,
  MAX_TURNS,
  PEACE_COST,
  SAVE_VERSION,
} from './constants';
import { EVENTS, getEventById } from './events';
import { clamp, createRng, dateLabel, formatMoney, signed } from './utils';

const HISTORY_LEN = 36;

export function createInitialState() {
  const state = {
    version: SAVE_VERSION,
    turn: 1,
    approval: 60,
    treasury: 1000,
    economy: 50,
    military: 50,
    ideology: 'capitalism',
    isolation: false,
    ideologyCooldown: 0,
    actionsLeft: ACTIONS_PER_TURN,
    negativeTreasuryTurns: 0,
    countries: INITIAL_COUNTRIES.map((c) => ({ ...c, atWar: false, warTurns: 0 })),
    logs: [],
    logSeq: 0,
    pendingEvent: null,
    lastReport: null,
    history: [],
    gameOver: null,
    stats: { wars: 0, victories: 0, defeats: 0, events: 0 },
  };
  addLog(state, `${dateLabel(1)}: 新政権が発足した。国家の舵取りはあなたに委ねられた。`, 'info');
  addLog(state, `任期は${MAX_TURNS / 12}年間。支持率と国庫を守り抜け。`, 'info');
  pushHistory(state);
  return state;
}

// ---------- helpers (draft state を直接変更する) ----------

function addLog(s, text, type = 'info') {
  s.logSeq += 1;
  s.logs = [{ id: s.logSeq, turn: s.turn, text, type }, ...s.logs].slice(0, 250);
}

function pushHistory(s) {
  s.history = [
    ...s.history,
    { turn: s.turn, approval: Math.round(s.approval), treasury: Math.round(s.treasury), economy: Math.round(s.economy), military: Math.round(s.military) },
  ].slice(-HISTORY_LEN);
}

function normalize(s) {
  s.approval = clamp(s.approval, 0, 100);
  s.economy = clamp(s.economy, 1, 200);
  s.military = clamp(s.military, 0, 200);
  s.treasury = Math.round(s.treasury);
  s.countries = s.countries.map((c) => ({ ...c, relation: clamp(Math.round(c.relation), 0, 100) }));
}

function updateCountry(s, id, fn) {
  s.countries = s.countries.map((c) => (c.id === id ? { ...c, ...fn(c) } : c));
}

function applyEffect(s, effect, targetId) {
  if (effect.approval) s.approval += effect.approval;
  if (effect.treasury) s.treasury += effect.treasury;
  if (effect.economy) s.economy += effect.economy;
  if (effect.military) s.military += effect.military;
  if (effect.relationAll) {
    s.countries = s.countries.map((c) => ({ ...c, relation: c.relation + effect.relationAll }));
  }
  if (effect.relationTarget && targetId) {
    updateCountry(s, targetId, (c) => ({ relation: c.relation + effect.relationTarget }));
  }
}

function checkGameOver(s) {
  if (s.gameOver) return;
  if (s.approval <= 0) {
    s.gameOver = {
      type: 'coup',
      title: 'クーデター発生',
      reason: '支持率が0%に達し、軍部と民衆が蜂起した。大統領府は占拠され、あなたは国外へ亡命した。',
    };
  } else if (s.negativeTreasuryTurns >= BANKRUPTCY_LIMIT) {
    s.gameOver = {
      type: 'bankrupt',
      title: '財政破綻',
      reason: `国庫のマイナスが${BANKRUPTCY_LIMIT}ヶ月続き、国債がデフォルトした。国際機関の管理下に置かれ、政権は崩壊した。`,
    };
  } else if (s.turn > MAX_TURNS) {
    s.gameOver = {
      type: 'victory',
      title: '任期満了',
      reason: `${MAX_TURNS / 12}年間の任期を全うした。あなたの名は国家の歴史に刻まれるだろう。`,
    };
  }
  if (s.gameOver) addLog(s, `【${s.gameOver.title}】${s.gameOver.reason}`, s.gameOver.type === 'victory' ? 'good' : 'bad');
}

// ---------- ターン進行 ----------

function processEconomy(s, rng, report) {
  const baseTax = s.economy * 4;
  let income;
  if (s.ideology === 'capitalism') {
    income = baseTax * rng.range(0.85, 1.35);
    s.economy += rng.range(-0.5, 1.5);
  } else {
    income = baseTax; // 計画経済：変動なし
    s.economy += 0.3;
  }
  const upkeep = s.military * 1.5;
  const admin = 90 + s.turn * 1.5; // 行政費は年々増大
  let net = income - upkeep - admin;
  // 鎖国：資金の増加量が半減（赤字は軽減されない）
  if (s.isolation && net > 0) net *= 0.5;
  s.treasury += net;
  report.income = Math.round(income);
  report.upkeep = Math.round(upkeep + admin);
  report.net = Math.round(net);
}

function processApproval(s, rng, report) {
  let delta = -1; // 政権疲れ：何もしなければ支持率は徐々に低下
  if (s.ideology === 'capitalism') delta += rng.range(-4, 4);
  if (s.isolation) delta += 1;
  // 国庫が潤沢なら微増、赤字なら減少
  if (s.treasury > 2000) delta += 0.5;
  if (s.treasury < 0) delta -= 5;
  s.approval += delta;
  report.approval = delta;
}

function processDiplomacy(s, rng) {
  s.countries = s.countries.map((c) => {
    let rel = c.relation;
    if (!c.atWar) rel += rng.range(-1.5, 1.5) - (c.aggression - 0.8) * 0.8; // 自然変動（好戦国ほど悪化しやすい）
    if (s.ideology === 'communism') rel -= rng.range(0.5, 1.5);
    // 相手国の軍事力も徐々に変動
    const military = clamp(c.military + rng.range(-0.5, 1.2), 10, 200);
    return { ...c, relation: rel, military };
  });

  if (s.ideology === 'communism' && rng.chance(0.25)) {
    addLog(s, `${dateLabel(s.turn)}: 共産主義体制への警戒から、各国との関係が冷え込んでいる。`, 'warn');
  }

  // 関係値20未満の国からの宣戦布告
  for (const c of s.countries) {
    if (c.atWar || c.relation >= 20) continue;
    const chance = 0.18 * c.aggression;
    if (!rng.chance(chance)) continue;
    if (s.isolation && rng.chance(0.5)) {
      addLog(s, `${dateLabel(s.turn)}: ${c.name}が開戦を企てたが、鎖国政策による国境封鎖で断念した。`, 'good');
      continue;
    }
    startWar(s, c.id, false);
  }
}

function startWar(s, countryId, byPlayer) {
  const c = s.countries.find((x) => x.id === countryId);
  updateCountry(s, countryId, () => ({ atWar: true, warTurns: 0, relation: 0 }));
  s.stats = { ...s.stats, wars: s.stats.wars + 1 };
  if (byPlayer) {
    addLog(s, `${dateLabel(s.turn)}: 我が国は${c.name}に対し宣戦を布告した！`, 'war');
  } else {
    s.approval += 3; // 防衛戦争による結束
    addLog(s, `${dateLabel(s.turn)}: ${c.name}が我が国に宣戦布告した！国民は団結を誓っている。`, 'war');
  }
}

function processWars(s, rng, report) {
  const wars = s.countries.filter((c) => c.atWar);
  for (const enemy of wars) {
    const warTurns = enemy.warTurns + 1;
    const cost = Math.round(150 + enemy.military * 2 + warTurns * 10);
    const milLoss = rng.range(4, 8) + enemy.military * 0.04;
    s.treasury -= cost;
    s.military -= milLoss;
    report.warCost = (report.warCost || 0) + cost;
    const enemyMilitary = Math.max(10, enemy.military - rng.range(2, 6));

    // 勝敗判定（軍事力ベース）
    const myPower = Math.max(1, s.military) * rng.range(0.7, 1.3);
    const theirPower = enemyMilitary * rng.range(0.7, 1.3);
    const ratio = myPower / (myPower + theirPower);
    const roll = rng.next();

    const exhausted = s.military <= 5 || s.treasury < -500;
    if (exhausted || (ratio < 0.4 && roll < 0.35)) {
      // 敗北
      const loss = exhausted ? 35 : 25;
      s.approval -= loss;
      s.treasury -= 300;
      s.economy -= 8;
      updateCountry(s, enemy.id, () => ({ atWar: false, warTurns: 0, relation: 25, military: enemyMilitary + 10 }));
      s.stats = { ...s.stats, defeats: s.stats.defeats + 1 };
      addLog(
        s,
        `${dateLabel(s.turn)}: ${exhausted ? '戦力・資金が枯渇し' : '前線が崩壊し'}、${enemy.name}との戦争に敗北した。屈辱的な講和条約により支持率が${loss}%暴落した。`,
        'bad',
      );
    } else if (ratio > 0.55 && roll < 0.2 + (ratio - 0.55) * 1.2) {
      // 勝利
      const loot = Math.round(400 + enemy.wealth * 0.4);
      s.approval += 20;
      s.treasury += loot;
      updateCountry(s, enemy.id, (c) => ({ atWar: false, warTurns: 0, relation: 30, military: Math.max(15, enemyMilitary * 0.6), wealth: c.wealth * 0.7 }));
      s.stats = { ...s.stats, victories: s.stats.victories + 1 };
      addLog(s, `${dateLabel(s.turn)}: ${enemy.name}に勝利した！賠償金${formatMoney(loot)}を獲得し、国民は歓喜に沸いている。（支持率+20）`, 'good');
    } else {
      // 膠着
      const fatigue = warTurns > 6 ? 5 : 1.5;
      s.approval -= fatigue;
      updateCountry(s, enemy.id, () => ({ warTurns, military: enemyMilitary }));
      addLog(
        s,
        `${dateLabel(s.turn)}: ${enemy.name}との戦闘は膠着状態（${warTurns}ヶ月目）。戦費${formatMoney(cost)}を消費。${warTurns > 6 ? '長期化による厭戦気分が広がっている。' : ''}`,
        'war',
      );
    }
  }
}

function rollEvent(s, rng) {
  if (!rng.chance(EVENT_CHANCE)) return;
  const pool = EVENTS.filter((e) => !e.condition || e.condition(s)).map((e) => {
    let weight = e.weight;
    if (e.tags?.includes('riot') && s.ideology === 'capitalism') weight *= 3;
    if (e.tags?.includes('riot') && s.ideology === 'communism') weight *= 0.2;
    if (e.tags?.includes('depression') && s.ideology === 'capitalism') weight *= 1.3;
    return { e, weight };
  });
  const total = pool.reduce((a, p) => a + p.weight, 0);
  let r = rng.next() * total;
  let chosen = pool[pool.length - 1].e;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) {
      chosen = p.e;
      break;
    }
  }

  if (chosen.tags?.includes('depression') && s.ideology === 'communism') {
    addLog(s, `${dateLabel(s.turn)}: 世界恐慌が発生したが、計画経済により我が国への影響は無効化された。`, 'good');
    return;
  }
  if (chosen.tags?.includes('diplomaticNegative') && s.isolation && rng.chance(0.6)) {
    addLog(s, `${dateLabel(s.turn)}: 他国による外交的な揺さぶり（${chosen.title}）を鎖国政策が遮断した。`, 'good');
    return;
  }

  let targetId = null;
  if (chosen.needsTarget) {
    const candidates = s.countries.filter((c) => !c.atWar);
    if (candidates.length === 0) return;
    // 関係が悪い国ほど対象になりやすい
    candidates.sort((a, b) => a.relation - b.relation);
    targetId = rng.chance(0.6) ? candidates[0].id : rng.pick(candidates).id;
  }
  s.pendingEvent = { id: chosen.id, targetId, turn: s.turn };
  s.stats = { ...s.stats, events: s.stats.events + 1 };
}

function endTurn(state, seed) {
  if (state.gameOver || state.pendingEvent) return state;
  const s = { ...state };
  const rng = createRng(seed);
  const report = {};
  const prev = { approval: s.approval, treasury: s.treasury, economy: s.economy, military: s.military };

  processEconomy(s, rng, report);
  processWars(s, rng, report);
  processDiplomacy(s, rng);
  processApproval(s, rng, report);

  // 財政状況
  if (s.treasury < 0) {
    s.negativeTreasuryTurns += 1;
    addLog(
      s,
      `${dateLabel(s.turn)}: 国庫が赤字（${formatMoney(s.treasury)}）。このままでは${BANKRUPTCY_LIMIT - s.negativeTreasuryTurns}ヶ月後に財政破綻する！`,
      'bad',
    );
  } else {
    s.negativeTreasuryTurns = 0;
  }

  normalize(s);
  s.lastReport = {
    turn: s.turn,
    net: report.net,
    income: report.income,
    upkeep: report.upkeep,
    warCost: report.warCost || 0,
    deltas: {
      approval: s.approval - prev.approval,
      treasury: s.treasury - prev.treasury,
      economy: s.economy - prev.economy,
      military: s.military - prev.military,
    },
  };
  addLog(
    s,
    `${dateLabel(s.turn)} 月次報告: 税収${formatMoney(report.income)} / 歳出${formatMoney(report.upkeep)}${report.warCost ? ` / 戦費${formatMoney(report.warCost)}` : ''} → 国庫 ${signed(s.treasury - prev.treasury)}億`,
    'report',
  );

  checkGameOver(s);
  if (s.gameOver) return s;

  // 次のターンへ
  s.turn += 1;
  s.actionsLeft = ACTIONS_PER_TURN;
  s.ideologyCooldown = Math.max(0, s.ideologyCooldown - 1);
  pushHistory(s);

  checkGameOver(s); // 任期満了判定
  if (s.gameOver) return s;

  rollEvent(s, rng);
  return s;
}

// ---------- プレイヤー行動 ----------

function canAct(s) {
  return !s.gameOver && !s.pendingEvent && s.actionsLeft > 0;
}

function resolveEvent(state, optionIndex) {
  if (!state.pendingEvent) return state;
  const s = { ...state };
  const ev = getEventById(s.pendingEvent.id);
  const option = ev?.options[optionIndex];
  if (!ev || !option) {
    s.pendingEvent = null;
    return s;
  }
  const target = s.countries.find((c) => c.id === s.pendingEvent.targetId);
  applyEffect(s, option.effect, s.pendingEvent.targetId);
  addLog(s, `${dateLabel(s.turn)}: 【${ev.title}】${target ? `（${target.name}）` : ''}— 「${option.label}」を選択した。`, ev.tone === 'good' ? 'good' : 'event');
  s.pendingEvent = null;
  normalize(s);
  checkGameOver(s);
  return s;
}

function domesticAction(state, actionId) {
  const action = DOMESTIC_ACTIONS.find((a) => a.id === actionId);
  if (!action || !canAct(state) || state.treasury < action.cost) return state;
  const s = { ...state };
  s.treasury -= action.cost;
  applyEffect(s, action.effect);
  s.actionsLeft -= 1;
  addLog(s, `${dateLabel(s.turn)}: 「${action.name}」を実施した（${formatMoney(action.cost)}を支出）。`, 'action');
  normalize(s);
  checkGameOver(s);
  return s;
}

function changeIdeology(state, ideology) {
  if (!IDEOLOGIES[ideology] || state.ideology === ideology || state.ideologyCooldown > 0 || !canAct(state)) return state;
  const s = { ...state };
  s.ideology = ideology;
  s.treasury -= IDEOLOGY_CHANGE_COST.treasury;
  s.approval -= IDEOLOGY_CHANGE_COST.approval;
  s.ideologyCooldown = IDEOLOGY_COOLDOWN;
  s.actionsLeft -= 1;
  addLog(s, `${dateLabel(s.turn)}: 政治体制を「${IDEOLOGIES[ideology].name}」へ移行した。社会に大きな混乱が生じている。`, 'warn');
  if (ideology === 'communism') {
    s.countries = s.countries.map((c) => ({ ...c, relation: c.relation - 10 }));
    addLog(s, `${dateLabel(s.turn)}: 各国は我が国の共産化を強く警戒している。（全隣国の関係値-10）`, 'bad');
  }
  normalize(s);
  checkGameOver(s);
  return s;
}

function toggleIsolation(state) {
  if (state.gameOver || state.pendingEvent) return state;
  const s = { ...state };
  s.isolation = !s.isolation;
  if (s.isolation) {
    s.countries = s.countries.map((c) => ({ ...c, relation: c.relation - 5 }));
    addLog(s, `${dateLabel(s.turn)}: 鎖国令を発布した。国境と港が封鎖され、外国との交易が大幅に制限される。`, 'warn');
  } else {
    addLog(s, `${dateLabel(s.turn)}: 鎖国令を解除し、開国した。交易が再開される。`, 'info');
  }
  normalize(s);
  return s;
}

function sendAid(state, countryId, seed) {
  const c = state.countries.find((x) => x.id === countryId);
  if (!c || c.atWar || !canAct(state) || state.treasury < AID_COST) return state;
  const s = { ...state };
  const rng = createRng(seed);
  const bonus = c.id === 'ornea' ? 1.3 : 1; // 交易国は援助に敏感
  const gain = Math.round(rng.range(8, 13) * bonus * (s.isolation ? 0.6 : 1));
  s.treasury -= AID_COST;
  s.actionsLeft -= 1;
  updateCountry(s, countryId, (x) => ({ relation: x.relation + gain }));
  addLog(s, `${dateLabel(s.turn)}: ${c.name}へ${formatMoney(AID_COST)}の資金援助を行った。（関係値+${gain}）`, 'action');
  normalize(s);
  return s;
}

function declareWar(state, countryId) {
  const c = state.countries.find((x) => x.id === countryId);
  if (!c || c.atWar || !canAct(state)) return state;
  const s = { ...state };
  s.actionsLeft -= 1;
  // 正当性の低い侵略戦争は支持率低下、関係が極端に悪い相手なら支持される
  const legitimacy = c.relation < 20 ? 5 : -8;
  s.approval += legitimacy;
  startWar(s, countryId, true);
  // 他国も侵略国を警戒
  s.countries = s.countries.map((x) => (x.id === countryId ? x : { ...x, relation: x.relation - 8 }));
  normalize(s);
  checkGameOver(s);
  return s;
}

function suePeace(state, countryId) {
  const c = state.countries.find((x) => x.id === countryId);
  if (!c || !c.atWar || !canAct(state) || state.treasury < PEACE_COST) return state;
  const s = { ...state };
  s.treasury -= PEACE_COST;
  s.approval -= 10;
  s.actionsLeft -= 1;
  updateCountry(s, countryId, () => ({ atWar: false, warTurns: 0, relation: 25 }));
  addLog(s, `${dateLabel(s.turn)}: ${c.name}と講和条約を締結した。賠償金${formatMoney(PEACE_COST)}を支払った。（支持率-10）`, 'warn');
  normalize(s);
  checkGameOver(s);
  return s;
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'END_TURN':
      return endTurn(state, action.seed);
    case 'RESOLVE_EVENT':
      return resolveEvent(state, action.optionIndex);
    case 'DOMESTIC_ACTION':
      return domesticAction(state, action.actionId);
    case 'CHANGE_IDEOLOGY':
      return changeIdeology(state, action.ideology);
    case 'TOGGLE_ISOLATION':
      return toggleIsolation(state);
    case 'SEND_AID':
      return sendAid(state, action.countryId, action.seed);
    case 'DECLARE_WAR':
      return declareWar(state, action.countryId);
    case 'SUE_PEACE':
      return suePeace(state, action.countryId);
    case 'RESET':
      return createInitialState();
    default:
      return state;
  }
}
