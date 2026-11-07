import { describe, expect, it } from 'vitest';
import { gameReducer as R } from '../src/game/engine/reducer';
import { approval, debtRatio } from '../src/game/engine/derived';
import { dhondt, predictVote } from '../src/game/engine/politics';
import { transferProvinces } from '../src/game/engine/diplomacy';
import { migrate } from '../src/game/save';
import { getWorldMap } from '../src/game/world/mapgen';
import { SCENARIOS } from '../src/game/data/scenarios';
import { generateRandomParties, generateRandomSetup } from '../src/game/engine/generator';
import { mapOf } from '../src/game/world/mapgen';
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
    const migrations = { 1: (d) => ({ ...d, version: 2, migrated: true }), 2: (d) => ({ ...d, version: 3 }) };
    const out = migrate(s, migrations, 3);
    expect(out.version).toBe(3);
    expect(out.migrated).toBe(true);
  });
  it('v2のセーブデータをv3に移行して、そのまま遊び続けられる', () => {
    const v3 = JSON.parse(JSON.stringify(play(newGame(), 200)));
    const v2 = { ...v3, version: 2 };
    delete v2.parties;
    delete v2.meta.worldSeed;
    delete v2.meta.scenarioName;
    delete v2.world.mapSpec;
    delete v2.world.rivalry;
    for (const n of Object.values(v2.world.nations)) {
      delete n.aggression;
      delete n.tradeAffinity;
      delete n.baseGrowth;
      delete n.environment;
      delete n.resource;
      delete n.desc;
    }
    const out = migrate(v2);
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.parties.length).toBe(6);
    const later = play(out, 400);
    expect(findNonFinite(later)).toBeNull();
    expect(later.month).toBeGreaterThan(out.month);
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

describe('自作の政党', () => {
  const custom = [
    { id: 'mine', name: '未来創造党', short: '未来', color: '#ff00aa', axes: { econ: 0.2, social: -0.4, eco: 0.6, nation: -0.2, reform: 0.8 } },
    { id: 'old', name: '伝統党', short: '伝統', color: '#335577', axes: { econ: 0.5, social: 0.9, eco: -0.3, nation: 0.6, reform: -0.5 } },
    { id: 'left', name: '労働者党', short: '労働', color: '#cc3333', axes: { econ: -0.9, social: 0.1, eco: 0, nation: 0.2, reform: 0 } },
  ];
  it('自作の政党だけで議会と政権が成立し、10年遊べる', () => {
    const s0 = newGame({ parties: custom, partyId: 'mine' });
    expect(s0.parties.map((p) => p.id)).toEqual(['mine', 'old', 'left']);
    expect(Object.keys(s0.politics.seats).sort()).toEqual(['left', 'mine', 'old']);
    expect(s0.politics.coalition).toContain('mine');
    const s = play(s0, 4000, 1);
    expect(findNonFinite(s)).toBeNull();
    expect(Object.keys(s.politics.support).sort()).toEqual(['left', 'mine', 'old']);
  });
  it('既定の政党を指すイベント効果は、政策の近い自作政党に読み替えられる', () => {
    const s = structuredClone(newGame({ parties: custom, partyId: 'mine' }));
    const before = { ...s.politics.support };
    s.events.pending = { id: 'general_strike', ctx: {}, day: s.day, date: s.date };
    const after = R(s, { type: 'RESOLVE_EVENT', index: 1 }); // 強制排除 → 社民党+3 は労働者党へ
    expect(after.politics.support.left).toBeGreaterThan(before.left);
    expect(Object.keys(after.politics.support)).not.toContain('socdem');
  });
  it('ランダムな政党構成は決定論的に生成される', () => {
    expect(generateRandomParties(5)).toEqual(generateRandomParties(5));
    expect(generateRandomParties(5, 7).length).toBe(7);
  });
});

describe('ランダムシナリオ', () => {
  it('同じシードからは同じ国・世界が生成される', () => {
    expect(generateRandomSetup(99)).toEqual(generateRandomSetup(99));
    expect(generateRandomSetup(99).scenario.countryName).not.toBe(generateRandomSetup(100).scenario.countryName);
  });
  for (const seed of [1, 2, 3, 4, 5]) {
    it(`ランダム世界 #${seed}：地図・外国が生成され、10年遊べる`, () => {
      const s0 = newGame({ scenarioId: 'random', scenarioSeed: seed });
      const map = mapOf(s0);
      expect(Object.keys(s0.world.nations).length).toBe(7);
      for (const [nation, cap] of Object.entries(s0.world.capitals)) expect(s0.world.owners[cap]).toBe(nation);
      expect(s0.world.owners.length).toBe(map.provinces.length);
      const s = play(s0, 4000, seed % 2);
      expect(findNonFinite(s)).toBeNull();
      expect(s.gameOver).not.toBeNull();
    });
  }
});

describe('ゲーム途中の新党結成と改名', () => {
  const draft = { name: '新時代党', short: '新時', color: '#ff8800', axes: { econ: 0.5, social: 0.5, eco: 0, nation: 0.3, reform: 0.2 } };
  it('自分が新党を率いると与党が入れ替わり、議員が移籍し、議席合計は変わらない', () => {
    let s = play(newGame(), 60);
    s = structuredClone(s);
    s.politics.capital = 100;
    const oldSeats = s.politics.seats.conservative;
    const out = R(s, { type: 'FOUND_PARTY', party: draft, lead: true });
    const id = out.meta.partyId;
    expect(id).not.toBe('conservative');
    expect(out.parties.find((p) => p.id === id).name).toBe('新時代党');
    expect(out.politics.seats[id]).toBeGreaterThan(0);
    expect(out.politics.seats[id] + out.politics.seats.conservative).toBe(oldSeats);
    expect(Object.values(out.politics.seats).reduce((a, b) => a + b, 0)).toBe(300);
    expect(out.politics.coalition[0]).toBe(id);
    expect(out.politics.capital).toBe(60);
    const later = play(out, 2000, 1);
    expect(findNonFinite(later)).toBeNull();
    expect(later.politics.support[id]).toBeGreaterThan(0);
  });
  it('野党の新党は議席ゼロで誕生し、選挙で議席を得られる', () => {
    let s = structuredClone(newGame());
    s.politics.capital = 100;
    s = R(s, { type: 'FOUND_PARTY', party: { ...draft, axes: { econ: -0.5, social: -0.5, eco: 0.8, nation: -0.5, reform: 0.9 } }, lead: false });
    const created = s.parties.at(-1).id;
    expect(s.meta.partyId).toBe('conservative');
    expect(s.politics.seats[created]).toBe(0);
    s = structuredClone(s);
    s.politics.nextElection = s.month + 1;
    s = play(s, 40);
    expect(s.politics.elections.length).toBeGreaterThan(0);
    expect(Object.keys(s.politics.elections.at(-1).seats)).toContain(created);
  });
  it('政党は最大8つまで、政治資本が足りなければ結成できない', () => {
    let s = structuredClone(newGame());
    s.politics.capital = 5;
    expect(R(s, { type: 'FOUND_PARTY', party: draft, lead: false }).parties.length).toBe(6);
    s.politics.capital = 100;
    s = R(s, { type: 'FOUND_PARTY', party: draft, lead: false });
    s = structuredClone(s);
    s.politics.capital = 100;
    s = R(s, { type: 'FOUND_PARTY', party: { ...draft, name: '別の党' }, lead: false });
    s = structuredClone(s);
    s.politics.capital = 100;
    expect(R(s, { type: 'FOUND_PARTY', party: { ...draft, name: '九番目' }, lead: false }).parties.length).toBe(8);
  });
  it('国名・外国名・政党名を自由に変えられる', () => {
    let s = newGame();
    s = R(s, { type: 'RENAME', kind: 'country', name: '大和帝国' });
    s = R(s, { type: 'RENAME', kind: 'nation', id: 'valdoria', name: '北方連邦' });
    s = R(s, { type: 'RENAME', kind: 'party', id: 'liberal', name: '市場第一党', short: '市場' });
    expect(s.meta.countryName).toBe('大和帝国');
    expect(s.world.nations.valdoria.name).toBe('北方連邦');
    expect(s.parties.find((p) => p.id === 'liberal')).toMatchObject({ name: '市場第一党', short: '市場' });
    expect(R(s, { type: 'RENAME', kind: 'country', name: '   ' }).meta.countryName).toBe('大和帝国');
  });
});

describe('ゲーム途中の政策変更', () => {
  it('自党の政策を変えると政治資本を使い、支持が一時的に下がり、法案への賛否が変わる', () => {
    const s = structuredClone(newGame());
    s.politics.capital = 100;
    const target = { econ: -0.8, social: 0.7, eco: -0.2, nation: 0.4, reform: -0.3 };
    const cost = R(s, { type: 'CHANGE_POLICY', id: 'conservative', axes: target });
    const p = cost.parties.find((x) => x.id === 'conservative');
    expect(p.axes.econ).toBe(-0.8);
    expect(cost.politics.capital).toBeLessThan(100);
    expect(cost.politics.support.conservative).toBeLessThan(s.politics.support.conservative);
    const law = LAWS.find((l) => l.id === 'minimum_wage');
    const before = predictVote(s, law).rows.find((r) => r.party === 'conservative').stance;
    const after = predictVote(cost, law).rows.find((r) => r.party === 'conservative').stance;
    expect(after).toBeGreaterThan(before);
  });
  it('政策が大きく離れた連立相手は政権を離脱する', () => {
    const s = structuredClone(newGame());
    s.politics.capital = 100;
    const partner = s.politics.coalition.find((p) => p !== 'conservative');
    expect(partner).toBeTruthy();
    const pa = s.parties.find((p) => p.id === partner).axes;
    const opposite = Object.fromEntries(Object.entries(pa).map(([k, v]) => [k, v >= 0 ? -1 : 1]));
    const out = R(s, { type: 'CHANGE_POLICY', id: 'conservative', axes: opposite });
    expect(out.politics.coalition).not.toContain(partner);
    expect(out.politics.coalition).toContain('conservative');
  });
  it('他党の路線も変えられ、政治資本が足りなければ変えられない', () => {
    const s = structuredClone(newGame());
    s.politics.capital = 100;
    const out = R(s, { type: 'CHANGE_POLICY', id: 'green', axes: { econ: 0.5, social: 0, eco: 0.5, nation: 0, reform: 0 } });
    expect(out.parties.find((x) => x.id === 'green').axes.econ).toBe(0.5);
    s.politics.capital = 3;
    expect(R(s, { type: 'CHANGE_POLICY', id: 'green', axes: { econ: 0.5, social: 0, eco: 0.5, nation: 0, reform: 0 } }).parties.find((x) => x.id === 'green').axes.econ).toBe(-0.3);
  });
  it('政策変更後も10年遊べる', () => {
    const s = structuredClone(newGame());
    s.politics.capital = 100;
    const out = play(R(s, { type: 'CHANGE_POLICY', id: 'conservative', axes: { econ: 0, social: 0, eco: 0.5, nation: 0, reform: 0.5 } }), 4000, 1);
    expect(findNonFinite(out)).toBeNull();
  });
});

describe('新しいゲームの設定', () => {
  it('ランダム世界の周辺国の名前を、開始前に変えられる', () => {
    const s = newGame({ scenarioId: 'random', scenarioSeed: 7, countryName: '自由な国', nationNames: { n1: '隣の大国', n3: '  ' } });
    expect(s.meta.countryName).toBe('自由な国');
    expect(s.world.nations.n1.name).toBe('隣の大国');
    expect(s.world.nations.n3.name).toBe(generateRandomSetup(7).nations[2].name);
  });
  it('1から作った政党だけで始められる', () => {
    const parties = [
      { id: 'custom1', name: 'A党', axes: { econ: 0.5 } },
      { id: 'custom2', name: 'B党', axes: { econ: -0.5 } },
      { id: 'custom3', name: 'C党', axes: { eco: 0.8 } },
    ];
    const s = play(newGame({ parties, partyId: 'custom2' }), 1500);
    expect(s.parties.map((p) => p.name)).toEqual(['A党', 'B党', 'C党']);
    expect(findNonFinite(s)).toBeNull();
  });
});

describe('ゲーム途中の解党', () => {
  it('野党を解党すると、議員と支持者が他党へ移り、議席合計は300のまま', () => {
    let s = structuredClone(play(newGame(), 100));
    s.politics.capital = 100;
    const target = s.parties.find((p) => !s.politics.coalition.includes(p.id)).id;
    const out = R(s, { type: 'DISSOLVE_PARTY', id: target });
    expect(out.parties.map((p) => p.id)).not.toContain(target);
    expect(Object.keys(out.politics.seats)).not.toContain(target);
    expect(Object.values(out.politics.seats).reduce((a, b) => a + b, 0)).toBe(300);
    expect(Object.values(out.politics.support).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
    expect(out.politics.formerParties.at(-1).id).toBe(target);
    expect(out.politics.capital).toBe(80);
    const later = play(out, 2500, 1);
    expect(findNonFinite(later)).toBeNull();
  });
  it('連立相手を解党すると連立と内閣から消え、空いた大臣は補充される', () => {
    const s = structuredClone(newGame());
    s.politics.capital = 100;
    const partner = s.politics.coalition.find((p) => p !== s.meta.partyId);
    const out = R(s, { type: 'DISSOLVE_PARTY', id: partner });
    expect(out.politics.coalition).not.toContain(partner);
    expect(Object.values(out.politics.ministers).every((m) => m.party !== partner)).toBe(true);
    expect(Object.keys(out.politics.ministers).length).toBe(7);
  });
  it('自分の党・最低3党・政治資本不足のときは解党できない', () => {
    const s = structuredClone(newGame());
    s.politics.capital = 100;
    expect(R(s, { type: 'DISSOLVE_PARTY', id: s.meta.partyId }).parties.length).toBe(6);
    let t = s;
    for (const id of ['green', 'reform', 'socdem']) t = structuredClone(R(t, { type: 'DISSOLVE_PARTY', id }));
    expect(t.parties.length).toBe(3);
    t.politics.capital = 100;
    const other = t.parties.find((p) => p.id !== t.meta.partyId).id;
    expect(R(t, { type: 'DISSOLVE_PARTY', id: other }).parties.length).toBe(3);
    const poor = structuredClone(newGame());
    poor.politics.capital = 10;
    expect(R(poor, { type: 'DISSOLVE_PARTY', id: 'green' }).parties.length).toBe(6);
  });
});
