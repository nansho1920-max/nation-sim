const hexToRgb = (h) => {
  const v = h.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};
const rgbToHex = (r, g, b) => `#${[r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')}`;

export function mix(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** 複数の色を0〜1で補間する */
export function scale(stops, t) {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mix(stops[i], stops[i + 1], x - i);
}

export const RELATION_SCALE = ['#9b2c2c', '#c2683f', '#7a7f8c', '#4f9a6a', '#2f8fbf'];
export const HEAT_SCALE = ['#1e2a44', '#2f5d8a', '#3f93a8', '#7cc3a0', '#e7d27a'];
export const ENV_SCALE = ['#6b4a2b', '#9a7a3c', '#7d9a4a', '#3f9a5c', '#2a7f6a'];

export const satColor = (v) => (v < 30 ? '#e05252' : v < 45 ? '#e0a03c' : v < 60 ? '#c9c27a' : '#4cb782');
