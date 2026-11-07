// セーブデータの保存・読み込み・バージョン移行
import { LEGACY_SAVE_KEYS, SAVE_KEY, SAVE_VERSION } from './data/balance';

/**
 * バージョン移行関数。キーは「移行元のバージョン」。
 * 将来セーブ形式を変えたら、ここに `2: (d) => ({ ...d, version: 3, 新しい項目: 初期値 })` のように追加する。
 * 既存のセーブデータを壊さないため、移行は必ず段階的に1バージョンずつ行う。
 */
export const MIGRATIONS = {};

const REQUIRED = ['meta', 'date', 'econ', 'society', 'energy', 'pops', 'politics', 'tech', 'world', 'events', 'history', 'logs'];

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
