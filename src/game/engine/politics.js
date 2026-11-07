// 政治：政党支持率・選挙・連立・法律・内閣
import { approach, clamp, sum } from '../core/math';
import { CAPITAL_MAX, ELECTION_INTERVAL, MAJORITY, PARLIAMENT_SEATS, SUPERMAJORITY } from '../data/balance';
import { COALITION_MIN_COMPAT, MAX_PARTIES, MIN_PARTIES, axisDistance, ideologyLabel, makeParty, partyCompatibility } from '../data/parties';
import { POPS, POP_TURNOUT } from '../data/pops';
import { compat, partyIds, partyOf, popPref, stanceOf } from './parties';
import { LAWS, getLaw } from '../data/laws';
import { MINISTRIES, SURNAMES, GIVEN_NAMES } from '../data/cabinet';
import { addLog, addNews, applyEffects, normalizeSupport, registerSpecial } from './effects';
import { approval, coalitionSeats, debtRatio, energyStats, playerWars, popShares } from './derived';
import { formatYM, monthToYM } from '../core/calendar';

// ---------- 支持率 ----------

export function supportTarget(s, fx) {
  const shares = popShares(s);
  const coalition = new Set(s.politics.coalition);
  const soc = s.society;
  const val = {};
  for (const p of partyIds(s)) {
    let v = 0;
    for (const pop of POPS) {
      const sat = s.pops[pop.id].sat;
      // 与党は満足度が高くないと票を失い、野党は不満の受け皿になる
      const mood = coalition.has(p) ? 0.15 + (sat / 100) * 1.6 : 1.45 - (sat / 100) * 0.9;
      v += shares[pop.id] * POP_TURNOUT[pop.id] * popPref(s, pop.id)[p] * mood;
    }
    val[p] = v;
  }
  // 現職効果：支持率の高い政権の与党には票が集まる
  const appr = approval(s);
  const player = s.meta.partyId;
  val[player] += Math.max(0, appr - 35) * 0.0045 - Math.max(0, 35 - appr) * 0.002;
  for (const p of s.politics.coalition) if (p !== player) val[p] += Math.max(0, appr - 40) * 0.001;
  // 社会情勢に応じて、その争点を掲げる政党に追い風が吹く（政策軸の位置で判定）
  const issues = {
    reform: (soc.corruption / 100) * 0.06,
    eco: (Math.max(0, 60 - soc.environment) / 100) * 0.08 + (s.world.orgs.ccf?.includes('player') ? 0.01 : 0),
    nation: (soc.tension / 100) * 0.05 + playerWars(s).length * 0.03 + (fx.isolation ? 0.01 : 0),
    left: Math.max(0, soc.gini - 0.33) * 0.43,
    right: (Math.max(0, (s.econ.taxes.income + s.econ.taxes.corporate) / 2 - 22) / 100) * 0.33,
    discipline: (Math.max(0, debtRatio(s) - 100) / 100) * 0.05,
  };
  for (const party of s.parties) {
    const a = party.axes;
    val[party.id] +=
      Math.max(0, a.reform) * issues.reform +
      Math.max(0, a.eco) * issues.eco +
      Math.max(0, a.nation) * issues.nation +
      Math.max(0, -a.econ) * issues.left +
      Math.max(0, a.econ) * issues.right +
      Math.max(0, (a.econ + a.social) / 2) * issues.discipline;
  }
  const total = sum(Object.values(val));
  const out = {};
  for (const p of partyIds(s)) out[p] = (val[p] / total) * 100;
  return out;
}

export function runPolitics(s, fx, rng) {
  const pol = s.politics;
  const target = supportTarget(s, fx);
  const next = {};
  for (const p of partyIds(s)) next[p] = approach(pol.support[p], target[p], 0.18) + rng.normal() * 0.25;
  pol.support = normalizeSupport(next);

  // 政治資本
  const gain = 3 + approval(s) / 25 + (coalitionSeats(s) >= MAJORITY ? 1.5 : 0) + (fx.capitalGain ?? 0);
  pol.capital = clamp(pol.capital + gain, 0, CAPITAL_MAX);
  pol.lastCapitalGain = gain;

  // 政権疲れ：長く政権にいるほど国民は飽きていく
  pol.fatigue = clamp((pol.fatigue ?? 0) + 0.16, 0, 15);

  checkPromise(s);

  if (s.month >= pol.nextElection) runElection(s, rng, '任期満了に伴う総選挙');
}

// ---------- 選挙 ----------

export function dhondt(votes, seats, threshold = 3) {
  const ids = Object.keys(votes);
  const eligible = ids.filter((p) => votes[p] >= threshold);
  const out = Object.fromEntries(ids.map((p) => [p, 0]));
  for (let i = 0; i < seats; i++) {
    let best = eligible[0];
    let bestQ = -1;
    for (const p of eligible) {
      const q = votes[p] / (out[p] + 1);
      if (q > bestQ) {
        bestQ = q;
        best = p;
      }
    }
    out[best] += 1;
  }
  return out;
}

export function formCoalition(s, seats, player) {
  if (seats[player] >= MAJORITY) return [player];
  const candidates = partyIds(s).filter((p) => p !== player && seats[p] > 0 && compat(s, player, p) >= COALITION_MIN_COMPAT);
  let bestMajority = null;
  let bestMinority = [player];
  for (let mask = 1; mask < 1 << candidates.length; mask++) {
    const subset = candidates.filter((_, i) => mask & (1 << i));
    const ok = subset.every((a, i) => subset.slice(i + 1).every((b) => compat(s, a, b) >= 0.25));
    if (!ok) continue;
    const members = [player, ...subset];
    const total = sum(members.map((p) => seats[p]));
    const avgCompat = sum(subset.map((p) => compat(s, player, p))) / subset.length;
    if (total >= MAJORITY) {
      const score = [subset.length, -avgCompat, total];
      if (!bestMajority || score[0] < bestMajority.score[0] || (score[0] === bestMajority.score[0] && (score[1] < bestMajority.score[1] || (score[1] === bestMajority.score[1] && score[2] < bestMajority.score[2])))) {
        bestMajority = { members, score };
      }
    } else if (total > sum(bestMinority.map((p) => seats[p]))) {
      bestMinority = members;
    }
  }
  return bestMajority ? bestMajority.members : bestMinority;
}

export function runElection(s, rng, reason) {
  const pol = s.politics;
  const player = s.meta.partyId;
  const votes = {};
  for (const p of partyIds(s)) votes[p] = Math.max(0.3, pol.support[p] * (1 + rng.normal() * 0.05));
  const norm = normalizeSupport(votes);
  const seats = dhondt(norm, PARLIAMENT_SEATS);
  const prevSeats = { ...pol.seats };
  pol.seats = seats;
  pol.coalition = formCoalition(s, seats, player);
  const coalSeats = coalitionSeats(s);
  const largest = partyIds(s).reduce((a, b) => (seats[a] >= seats[b] ? a : b));
  pol.elections.push({ month: s.month, date: { ...s.date }, votes: norm, seats, coalition: [...pol.coalition], reason });

  const summary = s.parties.filter((p) => seats[p.id] > 0)
    .sort((a, b) => seats[b.id] - seats[a.id])
    .map((p) => `${p.short}${seats[p.id]}`)
    .join('・');
  addLog(s, `【総選挙】${reason}の結果: ${summary}（与党 ${partyOf(s, player).name} ${seats[player]}議席、前回${prevSeats[player] ?? '-'}）`, 'politics', 'politics');
  addNews(s, '政治', `総選挙の開票終了。${partyOf(s, largest).name}が第一党に（${seats[largest]}議席）`);

  if (coalSeats < MAJORITY && largest !== player) {
    s.gameOver = {
      type: 'election',
      title: '政権交代',
      reason: `総選挙で与党連合は${coalSeats}議席にとどまり過半数（${MAJORITY}）を失った。第一党となった${partyOf(s, largest).name}が新政権を樹立した。`,
    };
    return;
  }

  s.stats.electionsWon += 1;
  pol.fatigue = Math.max(0, (pol.fatigue ?? 0) - 4); // 選挙勝利後のハネムーン
  pol.capital = clamp(pol.capital + 15, 0, CAPITAL_MAX);
  pol.nextElection = s.month + ELECTION_INTERVAL;
  const partners = pol.coalition.filter((p) => p !== player).map((p) => partyOf(s, p).name);
  addLog(
    s,
    coalSeats >= MAJORITY
      ? `政権を維持した。${partners.length ? `${partners.join('・')}と連立を組み、` : '単独で'}${coalSeats}議席の安定多数を確保。`
      : `与党は過半数に届かなかったが第一党を維持し、少数与党政権（${coalSeats}議席）として続投する。法案の可決は困難になる。`,
    coalSeats >= MAJORITY ? 'good' : 'warn',
    'politics',
  );
  refreshCabinet(s, rng);
  if (pol.promise && !pol.promise.deadline) pol.promise.deadline = s.month + 18;
}

// ---------- 公約 ----------

const PROMISES = {
  taxcut: {
    label: '大型減税',
    baseline: (s) => s.econ.taxes.income + s.econ.taxes.consumption,
    fulfilled: (s, b) => s.econ.taxes.income + s.econ.taxes.consumption <= b - 3,
    goal: '所得税と消費税の合計を3ポイント以上引き下げる',
  },
  welfare: {
    label: '福祉の充実',
    baseline: (s) => s.econ.budget.welfare + s.econ.budget.health,
    fulfilled: (s, b) => s.econ.budget.welfare + s.econ.budget.health >= b + 1.5,
    goal: '社会保障と医療の予算を合計1.5ポイント以上増やす',
  },
  jobs: {
    label: '雇用の創出',
    baseline: (s) => s.econ.unemployment,
    fulfilled: (s, b) => s.econ.unemployment <= b - 1,
    goal: '失業率を1ポイント以上下げる',
  },
  green: {
    label: '脱炭素',
    baseline: (s) => energyStats(s).renewableShare,
    fulfilled: (s, b) => energyStats(s).renewableShare >= b + 8,
    goal: '再生可能エネルギー比率を8ポイント以上高める',
  },
};

export const getPromise = (type) => PROMISES[type];

for (const type of Object.keys(PROMISES)) {
  registerSpecial(`promise_${type}`, (s) => {
    s.politics.promise = { type, baseline: PROMISES[type].baseline(s), deadline: null, madeAt: s.month };
  });
}

function checkPromise(s) {
  const pr = s.politics.promise;
  if (!pr || !pr.deadline || s.month < pr.deadline) return;
  const def = PROMISES[pr.type];
  if (def.fulfilled(s, pr.baseline)) {
    applyEffects(s, { allPops: 5, partySupport: { [s.meta.partyId]: 2 } });
    addLog(s, `選挙公約「${def.label}」を実現した。国民は約束を守る政権を評価している。`, 'good', 'politics');
    s.stats.promisesKept += 1;
  } else {
    applyEffects(s, { allPops: -8, partySupport: { [s.meta.partyId]: -3 } });
    addLog(s, `選挙公約「${def.label}」は果たされなかった。「公約違反」との批判が噴出している。`, 'bad', 'politics');
  }
  s.politics.promise = null;
}

registerSpecial('snapElection', (s, ctx, rng) => runElection(s, rng, '解散総選挙'));

// ---------- 内閣 ----------

function pickWeighted(rng, items, weightFn) {
  const total = sum(items.map(weightFn));
  let r = rng.next() * total;
  for (const it of items) {
    r -= weightFn(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export function refreshCabinet(s, rng) {
  const pol = s.politics;
  const used = new Set(Object.values(pol.ministers).map((m) => m.name));
  const candidates = {};
  for (const m of MINISTRIES) {
    const list = [];
    for (let i = 0; i < 3; i++) {
      let name;
      do name = `${rng.pick(SURNAMES)} ${rng.pick(GIVEN_NAMES)}`;
      while (used.has(name));
      used.add(name);
      pol.candidateSeq = (pol.candidateSeq ?? 0) + 1;
      list.push({
        id: pol.candidateSeq,
        name,
        party: pickWeighted(rng, pol.coalition, (p) => pol.seats[p] + 5),
        competence: rng.int(1, 5),
        integrity: rng.int(1, 5),
      });
    }
    candidates[m.id] = list;
  }
  pol.candidates = candidates;
  // 連立から外れた政党の大臣、または空席は自動で補充
  for (const m of MINISTRIES) {
    const cur = pol.ministers[m.id];
    if (!cur || !pol.coalition.includes(cur.party)) {
      pol.ministers[m.id] = [...candidates[m.id]].sort((a, b) => b.competence + b.integrity - (a.competence + a.integrity))[0];
    }
  }
}

// ---------- 法律 ----------

export function predictVote(s, law, repeal = false) {
  const pol = s.politics;
  const player = s.meta.partyId;
  const needed = law.constitutional ? SUPERMAJORITY : MAJORITY;
  const rows = partyIds(s).map((p) => {
    const stance = stanceOf(s, law, p) * (repeal ? -1 : 1);
    const inCoalition = pol.coalition.includes(p);
    let vote;
    if (p === player) vote = 'yes';
    else if (inCoalition) vote = stance <= -2 ? 'no' : 'yes';
    else vote = stance >= 1 ? 'yes' : 'no';
    return { party: p, seats: pol.seats[p] ?? 0, stance, vote, inCoalition };
  });
  const yes = sum(rows.filter((r) => r.vote === 'yes').map((r) => r.seats));
  return { rows, yes, needed, passes: yes >= needed };
}

export function lawCost(law, repeal) {
  return repeal ? Math.ceil(law.cost * 0.6) : law.cost;
}

export function canProposeLaw(s, law, repeal = false) {
  if (!repeal && s.politics.laws[law.id]) return { ok: false, reason: '既に施行中' };
  if (repeal && !s.politics.laws[law.id]) return { ok: false, reason: '施行されていない' };
  if (!repeal && law.requiresTech && !s.tech.researched.includes(law.requiresTech)) return { ok: false, reason: '必要な技術が未研究' };
  if (s.politics.capital < lawCost(law, repeal)) return { ok: false, reason: '政治資本が不足' };
  return { ok: true };
}

export function proposeLaw(s, lawId, repeal = false) {
  const law = getLaw(lawId);
  if (!law || !canProposeLaw(s, law, repeal).ok) return false;
  s.politics.capital -= lawCost(law, repeal);
  const vote = predictVote(s, law, repeal);
  const verb = repeal ? '廃止法案' : '法案';
  if (!vote.passes) {
    addLog(s, `「${law.name}」${verb}は議会で否決された（賛成${vote.yes}／必要${vote.needed}）。`, 'bad', 'politics');
    return false;
  }
  if (repeal) {
    delete s.politics.laws[law.id];
  } else {
    if (law.group) {
      for (const other of LAWS) if (other.group === law.group && s.politics.laws[other.id]) delete s.politics.laws[other.id];
    }
    s.politics.laws[law.id] = { enactedMonth: s.month };
  }
  s.stats.lawsPassed += repeal ? 0 : 1;
  addLog(s, `「${law.name}」${verb}が賛成${vote.yes}票で可決・成立した。`, 'politics', 'politics');
  addNews(s, '政治', `「${law.name}」${repeal ? '廃止' : '成立'}。議会は賛成${vote.yes}票`);
  return true;
}

// ---------- 連立の組み替え ----------

export function canInvite(s, partyId) {
  const pol = s.politics;
  if (pol.coalition.includes(partyId)) return { ok: false, reason: '連立中' };
  if (compat(s, s.meta.partyId, partyId) < COALITION_MIN_COMPAT) return { ok: false, reason: '政策の隔たりが大きすぎる' };
  const conflict = pol.coalition.find((p) => compat(s, p, partyId) < 0.25);
  if (conflict) return { ok: false, reason: `${partyOf(s, conflict).short}と相容れない` };
  if (pol.capital < 15) return { ok: false, reason: '政治資本が不足（15必要）' };
  return { ok: true };
}

export function nextElectionLabel(s) {
  return formatYM(monthToYM(s.meta.startDate, s.politics.nextElection));
}

// ---------- 新党結成 ----------

export const FOUND_COST = { lead: 40, opposition: 10 };

export function canFoundParty(s, lead) {
  if (s.parties.length >= MAX_PARTIES) return { ok: false, reason: `政党は最大${MAX_PARTIES}つまで` };
  const cost = lead ? FOUND_COST.lead : FOUND_COST.opposition;
  if (s.politics.capital < cost) return { ok: false, reason: `政治資本が不足（${cost}必要）` };
  return { ok: true };
}

/**
 * 新党を見積もる：自分が率いる場合に元の党から何人がついてくるか。
 * 元の党と政策が近いほど多くの議員が移籍する。
 */
export function previewFounding(s, input) {
  const player = s.meta.partyId;
  const draft = makeParty({ ...input, id: '__draft' });
  const c = partyCompatibility(draft, partyOf(s, player));
  const defectRate = clamp(0.15 + c * 0.75, 0.15, 0.85);
  const defectors = Math.round((s.politics.seats[player] ?? 0) * defectRate);
  return { compat: c, defectRate, defectors, oldStaysInCoalition: c >= COALITION_MIN_COMPAT };
}

function newPartyId(s) {
  let i = 1;
  while (s.parties.some((p) => p.id === `new${i}`)) i += 1;
  return `new${i}`;
}

/** 新党を結成する。lead=true なら首相が新党を率い、与党が入れ替わる */
export function foundParty(s, input, lead, fx) {
  if (!canFoundParty(s, lead).ok) return null;
  const pol = s.politics;
  const oldId = s.meta.partyId;
  const oldParty = partyOf(s, oldId);
  const preview = lead ? previewFounding(s, input) : null;
  const party = makeParty({ ...input, id: newPartyId(s) });
  s.parties = [...s.parties, party];
  pol.capital -= lead ? FOUND_COST.lead : FOUND_COST.opposition;

  // 支持率：新党は本来の支持の半分程度から始まり、月ごとに本来の水準へ近づいていく
  const target = supportTarget(s, fx);
  const initial = { ...pol.support, [party.id]: (target[party.id] ?? 3) * 0.5 };
  if (lead) {
    // 首相の個人人気で、元の党の支持の一部も新党へ移る
    const moved = (pol.support[oldId] ?? 0) * preview.defectRate * 0.6;
    initial[oldId] = (initial[oldId] ?? 0) - moved;
    initial[party.id] += moved;
  }
  pol.support = normalizeSupport(initial);
  pol.seats = { ...pol.seats, [party.id]: 0 };

  if (lead) {
    pol.seats[party.id] = preview.defectors;
    pol.seats[oldId] -= preview.defectors;
    s.meta.partyId = party.id;
    pol.coalition = [party.id, ...pol.coalition.filter((p) => p !== oldId && compat(s, party.id, p) >= 0.25)];
    if (preview.oldStaysInCoalition && pol.seats[oldId] > 0) pol.coalition.push(oldId);
    pol.fatigue = Math.max(0, (pol.fatigue ?? 0) - 3); // 新党ブームで国民の目先が変わる
    addLog(
      s,
      `首相が${oldParty.name}を離党し、新党「${party.name}」を結成した。${preview.defectors}人の議員が合流。${
        preview.oldStaysInCoalition ? `${oldParty.name}は連立与党として政権を支える。` : `${oldParty.name}は野党に転じた。`
      }`,
      'politics',
      'politics',
    );
    addNews(s, '政治', `首相が新党「${party.name}」を旗揚げ。${preview.defectors}人が参加`);
  } else {
    addLog(s, `新党「${party.name}」が結成された（${ideologyLabel(party.axes)}）。議席はまだないが、次の総選挙で議席を争う。`, 'politics', 'politics');
    addNews(s, '政治', `新党「${party.name}」が結成。「${ideologyLabel(party.axes)}」を掲げる`);
  }
  return party.id;
}

// ---------- 名前の変更 ----------

export function renameParty(s, id, { name, short, color }) {
  const p = partyOf(s, id);
  if (!p || !name?.trim()) return;
  const old = p.name;
  s.parties = s.parties.map((x) => (x.id === id ? makeParty({ ...x, name: name.trim(), short: short?.trim() || name.trim().slice(0, 2), color: color ?? x.color }) : x));
  if (old !== name.trim()) addLog(s, `${old}が党名を「${name.trim()}」に改めた。`, 'politics', 'politics');
}

// ---------- 政策の変更 ----------

/** 政策を変える費用（政治資本）。動かす距離が大きいほど高い */
export function policyChangeCost(s, id, axes) {
  const p = partyOf(s, id);
  if (!p) return 0;
  const dist = axisDistance(p.axes, axes);
  return dist < 0.05 ? 0 : Math.round(5 + dist * 25);
}

/** 政策を変えた場合に連立から離脱する政党 */
export function partnersLeaving(s, id, axes) {
  const player = s.meta.partyId;
  const moved = makeParty({ ...partyOf(s, id), axes });
  const lineup = s.parties.map((p) => (p.id === id ? moved : p));
  const byId = Object.fromEntries(lineup.map((p) => [p.id, p]));
  if (!s.politics.coalition.includes(id) && id !== player) return [];
  return s.politics.coalition.filter((p) => p !== player && partyCompatibility(byId[player], byId[p]) < 0.25);
}

export function changePolicy(s, id, axes) {
  const party = partyOf(s, id);
  if (!party) return false;
  const cost = policyChangeCost(s, id, axes);
  if (cost === 0 || s.politics.capital < cost) return false;
  const dist = axisDistance(party.axes, axes);
  const leaving = partnersLeaving(s, id, axes);
  const isPlayer = id === s.meta.partyId;
  const before = ideologyLabel(party.axes);

  s.politics.capital -= cost;
  s.parties = s.parties.map((p) => (p.id === id ? makeParty({ ...p, axes }) : p));
  const after = ideologyLabel(partyOf(s, id).axes);
  const shift = before === after ? `基本路線「${after}」のまま細部を修正` : `${before} → ${after}`;

  if (isPlayer) {
    // 「変節」への批判で一時的に支持を失う
    applyEffects(s, { partySupport: { [id]: -Math.min(6, dist * 5) } });
    addLog(s, `与党${party.name}が政策を転換した（${shift}）。「変節だ」との批判も上がっている。`, 'politics', 'politics');
    addNews(s, '政治', `${party.name}が路線転換。「${after}」を掲げる`);
  } else {
    addLog(s, `政界工作により、${party.name}が路線を変更した（${shift}）。`, 'politics', 'politics');
    addNews(s, '政治', `${party.name}が党の方針を見直し、「${after}」路線へ`);
  }
  for (const p of leaving) {
    s.politics.coalition = s.politics.coalition.filter((x) => x !== p);
    for (const [k, m] of Object.entries(s.politics.ministers)) if (m.party === p) delete s.politics.ministers[k];
    addLog(s, `政策の隔たりが大きくなり、${partyOf(s, p).name}が連立政権を離脱した。`, 'warn', 'politics');
  }
  return true;
}

// ---------- 解党 ----------

export const DISSOLVE_COST = 20;

export function canDissolve(s, id) {
  if (id === s.meta.partyId) return { ok: false, reason: '自分の党は解党できない（先に新党を結成して乗り換える）' };
  if (s.parties.length <= MIN_PARTIES) return { ok: false, reason: `政党は最低${MIN_PARTIES}つ必要` };
  if (s.politics.capital < DISSOLVE_COST) return { ok: false, reason: `政治資本が不足（${DISSOLVE_COST}必要）` };
  return { ok: true };
}

/** 政策の近い党ほど多く受け取るように、数を整数で配分する（最大剰余方式） */
function splitByAffinity(total, from, targets) {
  const w = targets.map((p) => Math.exp(-2 * axisDistance(from.axes, p.axes)));
  const sumW = w.reduce((a, b) => a + b, 0) || 1;
  const raw = w.map((x) => (total * x) / sumW);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length][1]] += 1;
  return Object.fromEntries(targets.map((p, i) => [p.id, out[i]]));
}

/** 解党した場合の議席の移り先と、与党連合への影響 */
export function previewDissolve(s, id) {
  const party = partyOf(s, id);
  const rest = s.parties.filter((p) => p.id !== id);
  const transfers = splitByAffinity(s.politics.seats[id] ?? 0, party, rest);
  const coalition = s.politics.coalition.filter((p) => p !== id);
  const coalitionSeats = sum(coalition.map((p) => (s.politics.seats[p] ?? 0) + (transfers[p] ?? 0)));
  return { transfers, coalitionSeats, wasPartner: s.politics.coalition.includes(id) };
}

export function dissolveParty(s, id, rng) {
  if (!canDissolve(s, id).ok) return false;
  const party = partyOf(s, id);
  const pol = s.politics;
  const preview = previewDissolve(s, id);
  const rest = s.parties.filter((p) => p.id !== id);

  pol.capital -= DISSOLVE_COST;
  // 議席：政策の近い党へ議員が移籍する
  const seats = {};
  for (const p of rest) seats[p.id] = (pol.seats[p.id] ?? 0) + (preview.transfers[p.id] ?? 0);
  pol.seats = seats;
  // 支持者：政策の近い党へ流れる
  const supShare = splitByAffinity(1000, party, rest);
  const support = {};
  for (const p of rest) support[p.id] = (pol.support[p.id] ?? 0) + ((pol.support[id] ?? 0) * supShare[p.id]) / 1000;
  pol.support = normalizeSupport(support);

  pol.coalition = pol.coalition.filter((p) => p !== id);
  let vacancies = false;
  for (const [k, m] of Object.entries(pol.ministers)) {
    if (m.party === id) {
      delete pol.ministers[k];
      vacancies = true;
    }
  }
  pol.formerParties = [...(pol.formerParties ?? []), { ...party, dissolvedMonth: s.month }];
  s.parties = rest;
  if (vacancies && rng) refreshCabinet(s, rng);

  const top = Object.entries(preview.transfers)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pid, n]) => `${partyOf(s, pid).short}${n}`)
    .join('・');
  addLog(s, `${party.name}が解党した。${top ? `所属議員は${top}へ移籍。` : ''}${preview.wasPartner ? '連立与党の一角が消え、政権の枠組みが変わった。' : ''}`, 'politics', 'politics');
  addNews(s, '政治', `${party.name}が解党。政界再編へ`);
  return true;
}
