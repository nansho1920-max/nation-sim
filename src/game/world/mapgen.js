// 架空の大陸を決定論的に生成する。
// ボロノイ分割で州（プロヴィンス）を作り、各国の首都から領土を広げて国境を決める。
// 同じシードからは常に同じ地図が生成されるため、セーブデータには州の所有者だけを保存すればよい。
import { Delaunay } from 'd3-delaunay';
import { makeRng } from '../core/rng';
import { NATIONS } from '../data/nations';

export const MAP_W = 1000;
export const MAP_H = 640;
const WORLD_SEED = 0x5eed2026;
const COLS = 26;
const ROWS = 17;
const LAND_RATIO = 0.6;

function makeNoise(rng, gridSize) {
  const G = gridSize;
  const grid = Array.from({ length: (G + 1) * (G + 1) }, () => rng.next());
  const at = (i, j) => grid[j * (G + 1) + i];
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x * G;
    const gy = y * G;
    const i = Math.min(G - 1, Math.floor(gx));
    const j = Math.min(G - 1, Math.floor(gy));
    const tx = smooth(gx - i);
    const ty = smooth(gy - j);
    const top = at(i, j) * (1 - tx) + at(i + 1, j) * tx;
    const bottom = at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}

const SYLLABLES = ['ア', 'ベ', 'ル', 'カ', 'ド', 'ミ', 'ノ', 'ラ', 'セ', 'ヴ', 'オ', 'テ', 'リ', 'ス', 'ガ', 'ナ', 'エ', 'ロ', 'キ', 'ハ', 'ム', 'ジ', 'ト', 'フ', 'レ', 'サ', 'ヤ', 'ゼ', 'ク', 'メ'];

function makeName(rng, used) {
  for (let tries = 0; tries < 50; tries++) {
    const len = rng.chance(0.55) ? 3 : 2;
    let n = '';
    for (let i = 0; i < len; i++) n += rng.pick(SYLLABLES);
    if (rng.chance(0.3)) n += 'ン';
    if (!used.has(n)) {
      used.add(n);
      return n;
    }
  }
  const fallback = `第${used.size}区`;
  used.add(fallback);
  return fallback;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function sharedEdge(polyA, polyB) {
  const eps = 1e-6;
  const common = [];
  for (const p of polyA) {
    if (common.length === 2) break;
    if (polyB.some((q) => Math.abs(p[0] - q[0]) < eps && Math.abs(p[1] - q[1]) < eps)) {
      if (!common.some((c) => Math.abs(c[0] - p[0]) < eps && Math.abs(c[1] - p[1]) < eps)) common.push(p);
    }
  }
  return common.length === 2 ? common : null;
}

function generate() {
  const rng = makeRng(WORLD_SEED);
  const noiseA = makeNoise(rng, 5);
  const noiseB = makeNoise(rng, 13);

  // 1. 点を配置（揺らぎのある格子）
  const points = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      points.push([
        ((c + 0.5 + rng.range(-0.4, 0.4)) / COLS) * MAP_W,
        ((r + 0.5 + rng.range(-0.4, 0.4)) / ROWS) * MAP_H,
      ]);
    }
  }
  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([0, 0, MAP_W, MAP_H]);

  // 2. 陸地判定（ノイズ + 中心からの距離）
  const elevation = points.map(([x, y]) => {
    const nx = x / MAP_W;
    const ny = y / MAP_H;
    const dx = (nx - 0.5) / 0.5;
    const dy = (ny - 0.5) / 0.48;
    const d = Math.sqrt(dx * dx + dy * dy);
    const edge = nx < 0.06 || nx > 0.94 || ny < 0.08 || ny > 0.92 ? -1 : 0;
    return noiseA(nx, ny) * 0.55 + noiseB(nx, ny) * 0.25 + (1 - d) * 0.9 + edge;
  });
  const sorted = [...elevation].sort((a, b) => b - a);
  const threshold = sorted[Math.floor(points.length * LAND_RATIO)];
  let isLand = elevation.map((e) => e > threshold);

  // 最大の連結成分だけを大陸として残す
  const seen = new Array(points.length).fill(false);
  let best = [];
  for (let i = 0; i < points.length; i++) {
    if (!isLand[i] || seen[i]) continue;
    const comp = [];
    const stack = [i];
    seen[i] = true;
    while (stack.length) {
      const k = stack.pop();
      comp.push(k);
      for (const nb of voronoi.neighbors(k)) {
        if (isLand[nb] && !seen[nb]) {
          seen[nb] = true;
          stack.push(nb);
        }
      }
    }
    if (comp.length > best.length) best = comp;
  }
  const mainland = new Set(best);
  isLand = isLand.map((_, i) => mainland.has(i));

  // 3. 州データ
  const cellToProv = new Map();
  const landCells = [];
  for (let i = 0; i < points.length; i++) {
    if (isLand[i]) {
      cellToProv.set(i, landCells.length);
      landCells.push(i);
    }
  }
  const polygons = landCells.map((c) => voronoi.cellPolygon(c));
  const usedNames = new Set();
  const provinces = landCells.map((cell, id) => {
    const poly = polygons[id];
    const verts = poly.slice(0, -1);
    const cx = verts.reduce((a, p) => a + p[0], 0) / verts.length;
    const cy = verts.reduce((a, p) => a + p[1], 0) / verts.length;
    const neighbors = [];
    let coastal = false;
    for (const nb of voronoi.neighbors(cell)) {
      if (isLand[nb]) neighbors.push(cellToProv.get(nb));
      else coastal = true;
    }
    return {
      id,
      name: makeName(rng, usedNames),
      path: voronoi.renderCell(cell),
      cx,
      cy,
      neighbors,
      coastal,
      dev: 0,
      popWeight: 0,
    };
  });

  // 4. 首都の配置（プレイヤーは大陸中央、他国は互いに離れた位置）
  const center = [MAP_W * 0.5, MAP_H * 0.52];
  const provPoint = (p) => [p.cx, p.cy];
  const capitals = {};
  let playerCap = 0;
  let bestD = Infinity;
  for (const p of provinces) {
    const d = dist(provPoint(p), center);
    if (d < bestD) {
      bestD = d;
      playerCap = p.id;
    }
  }
  capitals.player = playerCap;
  const chosen = [playerCap];
  for (const nation of NATIONS.filter((n) => n.id !== 'player')) {
    const scored = provinces
      .filter((p) => !chosen.includes(p.id))
      .map((p) => ({ id: p.id, d: Math.min(...chosen.map((c) => dist(provPoint(p), provPoint(provinces[c])))) }))
      .sort((a, b) => b.d - a.d);
    const pick = scored[rng.int(0, Math.min(3, scored.length - 1))].id;
    capitals[nation.id] = pick;
    chosen.push(pick);
  }

  // 5. 領土の拡大（多始点ダイクストラ）
  const owner = new Array(provinces.length).fill(null);
  const cost = new Array(provinces.length).fill(Infinity);
  const weightOf = Object.fromEntries(NATIONS.map((n) => [n.id, n.sizeWeight ?? 1]));
  const queue = [];
  for (const [nid, pid] of Object.entries(capitals)) {
    cost[pid] = 0;
    owner[pid] = nid;
    queue.push({ pid, c: 0, nid });
  }
  while (queue.length) {
    queue.sort((a, b) => a.c - b.c);
    const { pid, c, nid } = queue.shift();
    if (c > cost[pid] || owner[pid] !== nid) continue;
    for (const nb of provinces[pid].neighbors) {
      const step = (dist(provPoint(provinces[pid]), provPoint(provinces[nb])) * rng.range(0.75, 1.3)) / weightOf[nid];
      const nc = c + step;
      if (nc < cost[nb]) {
        cost[nb] = nc;
        owner[nb] = nid;
        queue.push({ pid: nb, c: nc, nid });
      }
    }
  }

  // 6. 開発度と人口の重み
  for (const p of provinces) {
    const cap = provinces[capitals[owner[p.id]]];
    const proximity = Math.max(0, 1 - dist(provPoint(p), provPoint(cap)) / 320);
    p.dev = Math.round(28 + noiseB(p.cx / MAP_W, p.cy / MAP_H) * 40 + proximity * 22 + (p.coastal ? 6 : 0));
    p.popWeight = (0.4 + p.dev / 60) * rng.range(0.75, 1.3) * (capitals[owner[p.id]] === p.id ? 3 : 1);
  }

  // 7. 境界線（州境・海岸線）
  const edges = [];
  for (const p of provinces) {
    for (const nb of p.neighbors) {
      if (nb <= p.id) continue;
      const seg = sharedEdge(polygons[p.id], polygons[nb]);
      if (seg) edges.push({ a: p.id, b: nb, x1: seg[0][0], y1: seg[0][1], x2: seg[1][0], y2: seg[1][1] });
    }
  }
  const coast = [];
  for (const p of provinces) {
    const cell = landCells[p.id];
    for (const nb of voronoi.neighbors(cell)) {
      if (isLand[nb]) continue;
      const seg = sharedEdge(polygons[p.id], voronoi.cellPolygon(nb));
      if (seg) coast.push(`M${seg[0][0].toFixed(1)},${seg[0][1].toFixed(1)}L${seg[1][0].toFixed(1)},${seg[1][1].toFixed(1)}`);
    }
  }

  return { width: MAP_W, height: MAP_H, provinces, capitals, initialOwner: owner, edges, coastPath: coast.join('') };
}

let cached = null;
export function getWorldMap() {
  if (!cached) cached = generate();
  return cached;
}
