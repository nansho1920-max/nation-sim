// 共通UI部品
import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

export function Panel({ title, icon: Icon, actions, children, className = '', bodyClass = 'p-4' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="panel-title">
            {Icon && <Icon className="h-4 w-4 text-brass" />}
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Button({ children, variant = 'default', size = 'md', className = '', ...props }) {
  const variants = {
    default: 'border border-line-strong bg-raised text-ink hover:border-brass/60 hover:text-white',
    primary: 'bg-brass text-night font-bold hover:bg-brass-light',
    danger: 'bg-red-800/80 text-red-50 hover:bg-red-700',
    good: 'bg-emerald-800/80 text-emerald-50 hover:bg-emerald-700',
    ghost: 'text-ink-dim hover:bg-raised hover:text-ink',
  };
  const sizes = { sm: 'px-2 py-1 text-xs', md: 'px-3 py-1.5 text-sm', lg: 'px-5 py-2.5 text-base' };
  return (
    <button className={`btn ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Chip({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'border-line-strong bg-raised text-ink-dim',
    good: 'border-emerald-700/50 bg-emerald-950/60 text-emerald-300',
    bad: 'border-red-800/50 bg-red-950/60 text-red-300',
    warn: 'border-amber-700/50 bg-amber-950/50 text-amber-300',
    info: 'border-sky-700/50 bg-sky-950/50 text-sky-300',
    brass: 'border-brass/50 bg-brass/10 text-brass-light',
  };
  return <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${tones[tone]} ${className}`}>{children}</span>;
}

export function Bar({ value, max = 100, color = '#d4a24c', height = 'h-1.5', marker, className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-night/70 ${height} ${className}`}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      {marker != null && <div className="absolute top-0 h-full w-0.5 bg-white/70" style={{ left: `${Math.max(0, Math.min(100, (marker / max) * 100))}%` }} />}
    </div>
  );
}

export function Delta({ value, digits = 1, unit = '', invert = false, className = '' }) {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < 10 ** -digits / 2) return <span className={`text-ink-faint ${className}`}>±0</span>;
  const good = invert ? value < 0 : value > 0;
  return (
    <span className={`${good ? 'text-emerald-400' : 'text-red-400'} ${className}`}>
      {value > 0 ? '▲' : '▼'}
      {Math.abs(value).toFixed(digits)}
      {unit}
    </span>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-night/60 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${value === t.id ? 'bg-raised text-brass-light shadow' : 'text-ink-dim hover:text-ink'}`}
        >
          {t.icon && <t.icon className="h-4 w-4" />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function KV({ label, children, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <dt className="flex items-center gap-1 text-ink-dim">
        {label}
        {hint && (
          <span title={hint}>
            <Info className="h-3 w-3 text-ink-faint" />
          </span>
        )}
      </dt>
      <dd className="num text-right text-ink">{children}</dd>
    </div>
  );
}

export function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-1 text-left text-xs text-ink-dim hover:text-ink">
        {title}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="animate-fade-in">{children}</div>}
    </div>
  );
}

export function Sparkline({ data, color = '#d4a24c', height = 28, min, max }) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  const lo = min ?? Math.min(...data);
  const hi = max ?? Math.max(...data);
  const span = hi - lo || 1;
  const w = 100;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, height - ((v - lo) / span) * (height - 4) - 2]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `0,${height} ${line} ${w},${height}`;
  const last = pts.at(-1);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Empty({ children }) {
  return <p className="py-6 text-center text-sm text-ink-faint">{children}</p>;
}
