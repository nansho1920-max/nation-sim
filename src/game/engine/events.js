// イベントエンジン：MTTH（平均発生期間）による確率判定、連鎖イベント、強制発火
import { EVENTS, getEvent } from '../data/events';
import { EVENT_COOLDOWN_MONTHS, EVENT_GLOBAL_COOLDOWN_DAYS } from '../data/balance';
import { addLog, applyEffects } from './effects';
import { playerWars } from './derived';
import { nationName } from './diplomacy';

export function eventText(s, ev, ctx) {
  const raw = typeof ev.text === 'function' ? ev.text(s, ctx) : ev.text;
  return raw.replaceAll('{target}', ctx?.targetId ? nationName(s, ctx.targetId) : '隣国');
}

export function optionEffects(s, option, ctx) {
  if (option.outcome) return null;
  return typeof option.effects === 'function' ? option.effects(s, ctx) : option.effects;
}

function pickTarget(s, ev, rng) {
  const enemies = new Set(playerWars(s).flatMap((w) => [w.attacker, w.defender]));
  const alive = Object.values(s.world.nations).filter((n) => s.world.owners.includes(n.id) && !enemies.has(n.id));
  if (ev.target === 'hostile') {
    const hostile = alive.filter((n) => n.relation < 45).sort((a, b) => a.relation - b.relation);
    if (!hostile.length) return null;
    return (rng.chance(0.6) ? hostile[0] : rng.pick(hostile)).id;
  }
  if (ev.target === 'friendly') {
    const friends = alive.filter((n) => n.relation >= 55);
    return friends.length ? rng.pick(friends).id : null;
  }
  return alive.length ? rng.pick(alive).id : null;
}

function eligible(s, ev, fx) {
  if (ev.mtth == null) return false;
  const last = s.events.cooldowns[ev.id];
  if (last != null && s.month - last < EVENT_COOLDOWN_MONTHS) return false;
  if (ev.condition && !ev.condition(s, fx)) return false;
  return true;
}

/** イベントを発火させ、プレイヤーの判断待ち（pending）にする */
export function fireEvent(s, id, ctx, fx, rng) {
  const ev = getEvent(id);
  if (!ev) return false;
  s.events.cooldowns[id] = s.month;
  if (ev.blockedByPlanned && fx.planned) {
    addLog(s, `【${ev.title}】が発生したが、計画経済により我が国への影響は無効化された。`, 'good', 'event');
    return false;
  }
  if (ev.diplomaticNegative && fx.isolation && rng.chance(0.6)) {
    addLog(s, `他国による外交的な揺さぶり（${ev.title}）を鎖国政策が遮断した。`, 'good', 'event');
    return false;
  }
  if (ev.spy && fx.spyResist && rng.chance(0.5)) {
    addLog(s, 'サイバー防衛網が外国の諜報活動を未然に阻止した。', 'good', 'event');
    return false;
  }
  const context = { ...(ctx ?? {}) };
  if (ev.target && !context.targetId) {
    context.targetId = pickTarget(s, ev, rng);
    if (!context.targetId) return false;
  }
  s.events.pending = { id, ctx: context, day: s.day, date: { ...s.date } };
  s.events.lastEventDay = s.day;
  s.stats.events += 1;
  return true;
}

/** 今日発生するランダムイベントを選ぶ（状態は変更しない）。なければ null */
export function pickDailyEvent(s, fx, rng) {
  if (s.events.pending) return null;
  if (s.day - s.events.lastEventDay < EVENT_GLOBAL_COOLDOWN_DAYS) return null;
  const mult = s.meta.diffMods.eventMult;
  const start = rng.int(0, EVENTS.length - 1);
  for (let i = 0; i < EVENTS.length; i++) {
    const ev = EVENTS[(start + i) % EVENTS.length];
    if (!eligible(s, ev, fx)) continue;
    const w = ev.weight ? ev.weight(s, fx) : 1;
    const p = (w / (ev.mtth * 30)) * mult;
    if (rng.chance(p)) return ev.id;
  }
  return null;
}

/** 予約済み（連鎖・強制）イベントのうち期日が来たもの */
export const dueScheduled = (s) => s.events.scheduled.find((e) => e.day <= s.day) ?? null;

/** 予約済みイベントを発火させる。クールダウンは無視する */
export function fireScheduled(s, due, fx, rng) {
  s.events.scheduled = s.events.scheduled.filter((e) => e !== due && !(e.id === due.id && e.day === due.day));
  delete s.events.cooldowns[due.id];
  return fireEvent(s, due.id, due.ctx, fx, rng);
}

/** 月次の強制トリガー（閾値を超えた時に必ず起きるイベント） */
export function monthlyTriggers(s) {
  const flags = s.events.flags;
  const schedule = (id, ctx = {}) => {
    if (!s.events.scheduled.some((e) => e.id === id)) s.events.scheduled.push({ id, day: s.day, ctx });
  };
  if (s.society.corruption >= 100) {
    s.society.corruption = 85;
    schedule('corruption_scandal');
  }
  const untilElection = s.politics.nextElection - s.month;
  if (untilElection === 6 && flags.campaignFor !== s.politics.nextElection) {
    s.events.flags = { ...flags, campaignFor: s.politics.nextElection };
    schedule('campaign');
  }
}

export function resolveEvent(s, optionIndex, rng) {
  const pending = s.events.pending;
  if (!pending) return;
  const ev = getEvent(pending.id);
  const option = ev?.options[optionIndex];
  s.events.pending = null;
  if (!option) return;
  const ctx = pending.ctx ?? {};
  const target = ctx.targetId ? `（${nationName(s, ctx.targetId)}）` : '';
  if (option.outcome) {
    const res = option.outcome(s, ctx, rng);
    addLog(s, `【${ev.title}】${target}「${option.label}」— ${res.text}`, 'event', 'event');
    applyEffects(s, res.effects, ctx, rng);
  } else {
    addLog(s, `【${ev.title}】${target}「${option.label}」を選択した。`, 'event', 'event');
    applyEffects(s, optionEffects(s, option, ctx), ctx, rng);
  }
  s.history.at(-1) && (s.history.at(-1).events = [...(s.history.at(-1).events ?? []), ev.title]);
}
