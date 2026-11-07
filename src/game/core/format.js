export const fmtTrillion = (v, digits = 1) => {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)}京`;
  if (Math.abs(v) < 1 && v !== 0) return `${Math.round(v * 10000).toLocaleString('ja-JP')}億`;
  return `${v.toFixed(digits)}兆`;
};
export const fmtPct = (v, digits = 1) => `${v.toFixed(digits)}%`;
export const fmtSigned = (v, digits = 1, unit = '') => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(digits)}${unit}`;
export const fmtPopulation = (man) => (man >= 10000 ? `${(man / 10000).toFixed(2)}億人` : `${Math.round(man).toLocaleString('ja-JP')}万人`);
