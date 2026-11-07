import { memo, useMemo, useState } from 'react';
import { MAP_W, MAP_H } from '../../game/world/mapgen';
import { RELATION_SCALE, HEAT_SCALE, ENV_SCALE, mix, scale } from '../ui/colors';
import { fmtPopulation, fmtTrillion } from '../../game/core/format';

export const MAP_MODES = [
  { id: 'political', label: '政治' },
  { id: 'diplomacy', label: '外交' },
  { id: 'economy', label: '経済' },
  { id: 'population', label: '人口' },
  { id: 'development', label: '開発' },
  { id: 'trade', label: '貿易' },
  { id: 'alliance', label: '同盟・機構' },
  { id: 'environment', label: '環境' },
];

const PLAYER_COLOR = '#e3b341';

function nationInfo(world, player, id) {
  if (id === 'player') return { ...player, id: 'player', color: PLAYER_COLOR };
  const n = world.nations[id];
  return n;
}

function WorldMap({ map, world, player, mode, selected, onSelect }) {
  const [hover, setHover] = useState(null);
  const owners = world.owners;

  // 各国の州の重み合計（州人口の推計に使う）
  const weightTotals = useMemo(() => {
    const t = {};
    for (const p of map.provinces) t[owners[p.id]] = (t[owners[p.id]] ?? 0) + p.popWeight;
    return t;
  }, [owners, map.provinces]);

  const info = useMemo(() => {
    const ids = [...new Set(owners)];
    return Object.fromEntries(ids.map((id) => [id, nationInfo(world, player, id)]));
  }, [owners, world, player]);

  const maxGdpPc = useMemo(() => Math.max(...Object.values(info).map((n) => n.gdp / n.population)), [info]);

  const fillFor = (p) => {
    const id = owners[p.id];
    const n = info[id];
    const atWarWithPlayer = world.wars.some((w) => [w.attacker, w.defender].includes('player') && [w.attacker, w.defender].includes(id));
    switch (mode) {
      case 'diplomacy':
        if (id === 'player') return PLAYER_COLOR;
        if (atWarWithPlayer) return '#7a1f1f';
        return scale(RELATION_SCALE, n.relation / 100);
      case 'economy':
        return scale(HEAT_SCALE, n.gdp / n.population / maxGdpPc);
      case 'population': {
        const pop = (n.population * p.popWeight) / weightTotals[id];
        return scale(HEAT_SCALE, Math.log10(Math.max(1, pop)) / 3.2);
      }
      case 'development':
        return scale(HEAT_SCALE, (p.dev - 20) / 75);
      case 'trade':
        if (id === 'player') return PLAYER_COLOR;
        if (world.trade[id]) return '#2f9a8a';
        return '#2a3142';
      case 'alliance': {
        if ((world.alliances.player ?? []).includes(id) || id === 'player') return id === 'player' ? PLAYER_COLOR : '#3f8fd0';
        if (world.orgs.cso.includes(id)) return '#5a6fa8';
        if (world.orgs.cec.includes(id)) return '#4a7f74';
        return '#2a3142';
      }
      case 'environment':
        return scale(ENV_SCALE, n.environment / 100);
      default:
        return n.color;
    }
  };

  // 国境線（両側の所有国が異なる州境）
  const borders = useMemo(() => {
    let all = '';
    let sel = '';
    for (const e of map.edges) {
      const a = owners[e.a];
      const b = owners[e.b];
      if (a === b) continue;
      const seg = `M${e.x1.toFixed(1)},${e.y1.toFixed(1)}L${e.x2.toFixed(1)},${e.y2.toFixed(1)}`;
      all += seg;
      if (selected && (a === selected || b === selected)) sel += seg;
    }
    return { all, sel };
  }, [owners, map.edges, selected]);

  // 国名ラベルの位置（州の重心）
  const labels = useMemo(() => {
    const acc = {};
    for (const p of map.provinces) {
      const id = owners[p.id];
      acc[id] ??= { x: 0, y: 0, w: 0, n: 0 };
      acc[id].x += p.cx * p.popWeight;
      acc[id].y += p.cy * p.popWeight;
      acc[id].w += p.popWeight;
      acc[id].n += 1;
    }
    return Object.entries(acc).map(([id, a]) => ({ id, x: a.x / a.w, y: a.y / a.w, n: a.n }));
  }, [owners, map.provinces]);

  const capitalPos = (id) => {
    const cap = world.capitals[id];
    const p = map.provinces[cap];
    return owners[cap] === id ? [p.cx, p.cy] : null;
  };

  const lines = [];
  if (mode === 'trade' || mode === 'political' || mode === 'diplomacy') {
    const pc = capitalPos('player');
    if (pc && mode === 'trade') {
      for (const id of Object.keys(world.trade)) {
        const c = capitalPos(id);
        if (c) lines.push({ key: `t-${id}`, a: pc, b: c, color: '#4fd1c5', dash: '0', width: 2 });
      }
    }
  }
  for (const w of world.wars) {
    const a = capitalPos(w.attacker);
    const b = capitalPos(w.defender);
    if (a && b) lines.push({ key: `w-${w.id}`, a, b, color: '#ff5a4f', dash: '8 5', width: 2.5 });
  }

  const hoverInfo = hover != null ? map.provinces[hover] : null;
  const hoverOwner = hoverInfo ? info[owners[hoverInfo.id]] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="block w-full select-none rounded-lg" role="img" aria-label="大陸の地図" onMouseLeave={() => setHover(null)}>
        <defs>
          <radialGradient id="sea" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#12304d" />
            <stop offset="100%" stopColor="#081423" />
          </radialGradient>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" fill="none" stroke="#1f3d5c" strokeWidth="0.5" opacity="0.5" />
          </pattern>
          <filter id="landShadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="url(#sea)" />
        <rect width={MAP_W} height={MAP_H} fill="url(#grid)" />
        <g filter="url(#landShadow)">
          {map.provinces.map((p) => {
            const fill = fillFor(p);
            const isSel = selected && owners[p.id] === selected;
            return (
              <path
                key={p.id}
                d={p.path}
                fill={hover === p.id ? mix(fill, '#ffffff', 0.25) : isSel ? mix(fill, '#ffffff', 0.08) : fill}
                stroke={mix(fill, '#000000', 0.35)}
                strokeWidth="0.6"
                onMouseEnter={() => setHover(p.id)}
                onClick={() => onSelect(owners[p.id])}
                className="cursor-pointer"
              />
            );
          })}
        </g>
        <path d={map.coastPath} fill="none" stroke="#b9cde0" strokeWidth="1.4" opacity="0.45" strokeLinecap="round" pointerEvents="none" />
        <path d={borders.all} fill="none" stroke="#06080f" strokeWidth="2.6" strokeLinecap="round" pointerEvents="none" />
        <path d={borders.all} fill="none" stroke="#e7e3d8" strokeWidth="0.7" opacity="0.35" strokeLinecap="round" pointerEvents="none" />
        {borders.sel && <path d={borders.sel} fill="none" stroke="#ecc77e" strokeWidth="2.4" strokeLinecap="round" pointerEvents="none" />}
        {lines.map((l) => (
          <line key={l.key} x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]} stroke={l.color} strokeWidth={l.width} strokeDasharray={l.dash} strokeLinecap="round" opacity="0.9" pointerEvents="none" />
        ))}
        {Object.keys(world.capitals).map((id) => {
          const c = capitalPos(id);
          if (!c) return null;
          return (
            <g key={`cap-${id}`} transform={`translate(${c[0]},${c[1]})`} pointerEvents="none">
              <circle r="5" fill="#0b0f19" stroke={id === 'player' ? '#ecc77e' : '#e7e3d8'} strokeWidth="1.5" />
              <circle r="2" fill={id === 'player' ? '#ecc77e' : '#e7e3d8'} />
            </g>
          );
        })}
        {labels.map((l) => {
          const n = info[l.id];
          const size = Math.max(11, Math.min(20, 7 + Math.sqrt(l.n) * 1.6));
          return (
            <text
              key={`lbl-${l.id}`}
              x={l.x}
              y={l.y + size + 4}
              textAnchor="middle"
              fontSize={size}
              fontWeight="700"
              fill="#f4efe2"
              stroke="#06080f"
              strokeWidth="3.5"
              paintOrder="stroke"
              style={{ fontFamily: '"Shippori Mincho B1", "Noto Serif JP", serif', letterSpacing: '0.08em' }}
              pointerEvents="none"
            >
              {n.name}
            </text>
          );
        })}
      </svg>
      {hoverInfo && hoverOwner && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-line-strong bg-night/95 px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: `${(hoverInfo.cx / MAP_W) * 100}%`, top: `${(hoverInfo.cy / MAP_H) * 100}%`, transform: 'translate(-50%, calc(-100% - 10px))' }}
        >
          <div className="font-bold text-ink">{hoverInfo.name}州</div>
          <div className="text-ink-dim">{hoverOwner.name}</div>
          <div className="num text-ink-faint">
            開発度 {hoverInfo.dev} ・ 人口 {fmtPopulation((hoverOwner.population * hoverInfo.popWeight) / weightTotals[owners[hoverInfo.id]])}
          </div>
          {mode === 'economy' && <div className="num text-ink-faint">一人当たりGDP {((hoverOwner.gdp / hoverOwner.population) * 10000).toFixed(0)}万</div>}
          {mode === 'diplomacy' && owners[hoverInfo.id] !== 'player' && <div className="num text-ink-faint">関係値 {Math.round(hoverOwner.relation)}</div>}
          {mode === 'political' && <div className="num text-ink-faint">GDP {fmtTrillion(hoverOwner.gdp, 0)}</div>}
        </div>
      )}
    </div>
  );
}

export default memo(WorldMap);

export function MapLegend({ mode }) {
  const grad = (stops, lo, hi) => (
    <div className="flex items-center gap-2 text-[11px] text-ink-dim">
      <span>{lo}</span>
      <div className="h-2 w-32 rounded" style={{ background: `linear-gradient(to right, ${stops.join(',')})` }} />
      <span>{hi}</span>
    </div>
  );
  const sw = (c, l) => (
    <span key={l} className="flex items-center gap-1 text-[11px] text-ink-dim">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
      {l}
    </span>
  );
  switch (mode) {
    case 'diplomacy':
      return <div className="flex flex-wrap gap-3">{grad(RELATION_SCALE, '敵対', '友好')}{sw('#7a1f1f', '交戦中')}</div>;
    case 'economy':
      return grad(HEAT_SCALE, '一人当たりGDP 低', '高');
    case 'population':
      return grad(HEAT_SCALE, '人口 少', '多');
    case 'development':
      return grad(HEAT_SCALE, '開発度 低', '高');
    case 'trade':
      return <div className="flex flex-wrap gap-3">{[sw(PLAYER_COLOR, '自国'), sw('#2f9a8a', '貿易協定国'), sw('#2a3142', '協定なし')]}</div>;
    case 'alliance':
      return <div className="flex flex-wrap gap-3">{[sw(PLAYER_COLOR, '自国'), sw('#3f8fd0', '同盟国'), sw('#5a6fa8', '安全保障機構'), sw('#4a7f74', '経済共同体')]}</div>;
    case 'environment':
      return grad(ENV_SCALE, '環境 悪', '良');
    default:
      return <div className="text-[11px] text-ink-dim">各国の領土。赤い破線は戦争、首都は◎で表示。</div>;
  }
}
