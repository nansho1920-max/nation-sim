import { START_MONTH, START_YEAR } from './constants';

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// シード付き乱数 (mulberry32)。reducerを純粋関数に保つため、乱数シードはactionで受け取る。
export function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (p) => next() < p,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 32);

export function turnToDate(turn) {
  const idx = START_MONTH - 1 + (turn - 1);
  return { year: START_YEAR + Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function dateLabel(turn) {
  const { year, month } = turnToDate(turn);
  return `${year}年${month}月`;
}

export const formatMoney = (v) => `${Math.round(v).toLocaleString('ja-JP')}億`;

export const signed = (v) => (v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`);
