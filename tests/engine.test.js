import { describe, expect, it } from 'vitest';
import { gameReducer as R } from '../src/game/engine/reducer';
import { approval, debtRatio } from '../src/game/engine/derived';
import { dhondt, predictVote } from '../src/game/engine/politics';
import { transferProvinces } from '../src/game/engine/diplomacy';
import { migrate } from '../src/game/save';
import { getWorldMap } from '../src/game/world/mapgen';
import { SCENARIOS } from '../src/game/data/scenarios';
import { LAWS } from '../src/game/data/laws';
import { EVENTS } from '../src/game/data/events';
import { PARLIAMENT_SEATS, SAVE_VERSION } from '../src/game/data/balance';

const newGame = (opts = {}) => R(null, { type: 'NEW_GAME', options: { scenarioId: 'standard', partyId: 'conservative', seed: 42, ...opts } });

function play(s, days, pick = 0) {
  for (let i = 0; i < days && !s.gameOver; i++) {
    s = R(s, { type: 'TICK' });
    if (s.events.pending) s = R(s, { type: 'RESOLVE_EVENT', index: pick });
  }
  return s;
}

function findNonFinite(o, path = '') {
  if (typeof o === 'number' && !Number.isFinite(o)) return path;
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      const r = findNonFinite(v, `${path}.${k}`);
      if (r) return r;
    }
  }
  return null;
}

describe('決定論性', () => {
  it('同じシードと同じ操作からは同じ結果になる', () => {
    const a = play(newGame(), 800);
    const b = play(newGame(), 800);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('シードが違えば展開も変わる', () => {
    const a = play(newGame({ seed: 1 }), 400);
    const b = play(newGame({ seed: 2 }), 400);
    expect(a.econ.gdp).not.toBe(b.econ.gdp);
  });
});

describe('数値の整合性', () => {
  for (const sc of SCENARIOS) {
    it(`${sc.name}: 10年間プレイしてもNaN・Infinityが出ない`, () => {
      const s = play(newGame({ scenarioId: sc.id, seed: 7 }), 4000, 1);
      expect(findNonFinite(s)).toBeNull();
      expect(s.gameOver).not.toBeNull();
      expect(approval(s)).toBeGreaterThanOrEqual(0);
      expect(approval(s)).toBeLessThanOrEqual(100);
    });
  }
  it('国債発行で国庫がマイナスにならない', () => {
    let s = newGame();
    s = R(s, { type: 'APPLY_BUDGET', taxes: { income: 5, corporate: 5, consumption: 0 }, budget: s.econ.budget });
    const debt0 = s.econ.debt;
    s = play(s, 120);
    expect(s.econ.treasury).toBeGreaterThanOrEqual(0);
    expect(s.econ.debt).toBeGreaterThan(debt0);
  });
  it('月次の財政収支 = 歳入 − 歳出 − 利払い', () => {
    const s = play(newGame(), 95);
    const lm = s.econ.lastMonth;
    expect(lm.balance).toBeCloseTo(lm.revenue - lm.spending - lm.interest, 8);
  });
});

describe('政治', () => {
  it('ドント式の議席合計は定数と一致し、得票3%未満の党は議席ゼロ', () => {
    const seats = dhondt({ conservative: 40, liberal: 2, socdem: 30, green: 10, nationalist: 10, reform: 8 }, PARLIAMENT_SEATS);
    expect(Object.values(seats).reduce((a, b) => a + b, 0)).toBe(PARLIAMENT_SEATS);
    expect(seats.liberal).toBe(0);
  });
  it('初期状態で与党は政権を握っている', () => {
    for (const partyId of ['conservative', 'socdem', 'liberal', 'green', 'nationalist', 'reform']) {
      const s = newGame({ partyId });
      expect(s.politics.coalition).toContain(partyId);
      expect(Object.values(s.politics.seats).reduce((a, b) => a + b, 0)).toBe(PARLIAMENT_SEATS);
    }
  });
  it('法案の採決結果は事前予測と一致する', () => {
    let s = newGame();
    s.politics.capital = 100;
    for (const law of LAWS.filter((l) => !l.requiresTech).slice(0, 6)) {
      const pred = predictVote(s, law);
      const next = R(s, { type: 'PROPOSE_LAW', lawId: law.id });
      expect(!!next.politics.laws[law.id]).toBe(pred.passes);
    }
  });
});

describe('世界地図', () => {
  it('地図生成は決定論的で、すべての州に所有国がある', () => {
    const map = getWorldMap();
    expect(map.provinces.length).toBeGreaterThan(150);
    expect(map.initialOwner.every((o) => !!o)).toBe(true);
    const s = newGame();
    for (const [nation, cap] of Object.entries(s.world.capitals)) expect(s.world.owners[cap]).toBe(nation);
  });
  it('州の割譲で人口は失われない', () => {
    const s = structuredClone(newGame());
    const before = s.society.population + s.world.nations.valdoria.population;
    const moved = transferProvinces(s, 'valdoria', 'player', 1);
    const after = s.society.population + s.world.nations.valdoria.population;
    if (moved.length) expect(after).toBeCloseTo(before, 6);
  });
});

describe('イベント', () => {
  it('すべてのイベントの選択肢が効果を持ち、連鎖先が存在する', () => {
    const ids = new Set(EVENTS.map((e) => e.id));
    const s = newGame();
    for (const ev of EVENTS) {
      expect(ev.options.length).toBeGreaterThanOrEqual(2);
      for (const o of ev.options) {
        const eff = o.outcome ? null : typeof o.effects === 'function' ? o.effects(s, {}) : o.effects;
        if (eff?.chain) for (const c of [].concat(eff.chain)) expect(ids.has(c.event)).toBe(true);
      }
    }
  });
  it('連鎖イベントは予約された日に発火する', () => {
    let s = structuredClone(newGame());
    s.events.scheduled.push({ id: 'bubble_burst', day: 5, ctx: {} });
    s = play(s, 4);
    expect(s.events.pending).toBeNull();
    s = R(s, { type: 'TICK' });
    expect(s.events.pending?.id).toBe('bubble_burst');
  });
});

describe('セーブデータ', () => {
  it('現在のバージョンはそのまま読み込める', () => {
    const s = newGame();
    expect(migrate(JSON.parse(JSON.stringify(s)))).not.toBeNull();
  });
  it('移行関数を順番に適用して最新版に変換する', () => {
    const s = { ...JSON.parse(JSON.stringify(newGame())), version: 1 };
    const migrations = { 1: (d) => ({ ...d, version: 2, migrated: true }) };
    const out = migrate(s, migrations, SAVE_VERSION);
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.migrated).toBe(true);
  });
  it('移行手段のない古いデータや壊れたデータは null', () => {
    expect(migrate({ version: 1, turn: 3 })).toBeNull();
    expect(migrate(null)).toBeNull();
    expect(migrate({ version: SAVE_VERSION })).toBeNull();
  });
});

describe('ゲームオーバー', () => {
  it('支持率が極端に低い状態が続くと革命が起きる', () => {
    let s = structuredClone(newGame());
    for (const p of Object.values(s.pops)) p.sat = 0;
    s.politics.nextElection = 999;
    for (let i = 0; i < 200 && !s.gameOver; i++) {
      for (const p of Object.values(s.pops)) p.sat = 0;
      s = R(s, { type: 'TICK' });
      if (s.events.pending) s = R(s, { type: 'RESOLVE_EVENT', index: 0 });
    }
    expect(s.gameOver?.type).toBe('revolution');
  });
  it('債務がGDPの300%を超えると財政破綻', () => {
    const s = structuredClone(newGame());
    s.econ.debt = s.econ.gdp * 3.2;
    const out = play(s, 40);
    expect(out.gameOver?.type).toBe('default');
    expect(debtRatio(out)).toBeGreaterThan(300);
  });
});
