export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** current を target へ rate の割合だけ近づける */
export const approach = (current, target, rate) => current + (target - current) * rate;
export const sum = (arr) => arr.reduce((a, b) => a + b, 0);
export const round = (v, digits = 1) => {
  const p = 10 ** digits;
  return Math.round(v * p) / p;
};
