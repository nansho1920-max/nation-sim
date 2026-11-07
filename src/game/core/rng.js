// シード付き乱数 (mulberry32)。状態は1つの32bit整数なので、セーブデータに保存でき再現性を保てる。
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    chance: (p) => next() < p,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // 近似正規分布（平均0・標準偏差1）
    normal: () => (next() + next() + next() + next() - 2) * 1.732,
    shuffle: (arr) => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    get state() {
      return a;
    },
  };
  return rng;
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 32) >>> 0;
