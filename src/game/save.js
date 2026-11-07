// セーブデータの保存・読み込み・バージョン移行
import { LEGACY_SAVE_KEYS, SAVE_KEY, SAVE_VERSION } from './data/balance';
import { DEFAULT_PARTIES } from './data/parties';
import { NATIONS, INITIAL_OPINIONS } from './data/nations';
import { getScenario } from './data/scenarios';
import { DEFAULT_MAP_SPEC, DEFAULT_WORLD_SEED } from './world/mapgen';

/**
 * バージョン移行関数。キーは「移行元のバージョン」。
 * 将来セーブ形式を変えたら、ここに `2: (d) => ({ ...d, version: 3, 新しい項目: 初期値 })` のように追加する。
 * 既存のセーブデータを壊さないため、移行は必ず段階的に1バージョンずつ行う。
 */
export const MIGRATIONS = {
  // v2 → v3：政党と外国のデータを状態に持たせ、地図をシードで再現できるようにした
  2: (d) => {
    const nations = {};
    for (const [id, n] of Object.entries(d.world.nations)) {
      const def = NATIONS.find((x) => x.id === id) ?? {};
      nations[id] = {
        ...n,
        desc: def.desc,
        aggression: def.aggression ?? 1,
        tradeAffinity: def.tradeAffinity ?? 0.6,
        baseGrowth: def.baseGrowth ?? 1.5,
        environment: def.environment ?? 50,
        resource: !!def.resource,
      };
    }
    const rivalry = {};
    const ids = Object.keys(nations);
    for (const a of ids) for (const b of ids) if (a < b) rivalry[`${a}|${b}`] = INITIAL_OPINIONS[`${a}|${b}`] ?? INITIAL_OPINIONS[`${b}|${a}`] ?? 50;
    return {
      ...d,
      version: 3,
      parties: DEFAULT_PARTIES.map((p) => ({ ...p, axes: { ...p.axes } })),
      meta: { ...d.meta, worldSeed: DEFAULT_WORLD_SEED, scenarioName: getScenario(d.meta.scenarioId).name, scenarioSeed: null },
      world: { ...d.world, nations, mapSpec: DEFAULT_MAP_SPEC.map((x) => ({ ...x })), rivalry },
    };
  },
};

const REQUIRED = ['parties', 'meta', 'date', 'econ', 'society', 'energy', 'pops', 'politics', 'tech', 'world', 'events', 'history', 'logs'];

export function validate(d) {
  return !!d && typeof d === 'object' && REQUIRED.every((k) => k in d) && Array.isArray(d.world.owners);
}

export function migrate(data, migrations = MIGRATIONS, target = SAVE_VERSION) {
  if (!data || typeof data.version !== 'number') return null;
  let d = data;
  while (d.version < target) {
    const m = migrations[d.version];
    if (!m) return null;
    d = m(d);
  }
  if (d.version !== target || !validate(d)) return null;
  return d;
}

export function saveGame(state) {
  try {
    if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    else localStorage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function hasLegacySave() {
  try {
    return LEGACY_SAVE_KEYS.some((k) => localStorage.getItem(k));
  } catch {
    return false;
  }
}

export function clearLegacySaves() {
  try {
    for (const k of LEGACY_SAVE_KEYS) localStorage.removeItem(k);
  } catch {
    /* noop */
  }
}
