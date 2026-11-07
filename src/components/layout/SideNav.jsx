import { BarChart3, Cpu, Globe2, Landmark, LayoutDashboard, ScrollText, TrendingUp, Users } from 'lucide-react';

export const SCREENS = [
  { id: 'overview', label: '国家概要', icon: LayoutDashboard },
  { id: 'economy', label: '経済・財政', icon: TrendingUp },
  { id: 'society', label: '国民', icon: Users },
  { id: 'politics', label: '政治', icon: Landmark },
  { id: 'world', label: '世界', icon: Globe2 },
  { id: 'tech', label: '技術', icon: Cpu },
  { id: 'stats', label: '統計', icon: BarChart3 },
  { id: 'history', label: '歴史', icon: ScrollText },
];

export default function SideNav({ value, onChange, badges = {} }) {
  return (
    <nav className="scroll-thin flex gap-1 overflow-x-auto lg:sticky lg:top-[140px] lg:flex-col lg:overflow-visible" aria-label="画面切り替え">
      {SCREENS.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          aria-current={value === s.id ? 'page' : undefined}
          className={`relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition lg:w-full ${
            value === s.id ? 'bg-raised font-bold text-brass-light shadow-inner' : 'text-ink-dim hover:bg-raised/60 hover:text-ink'
          }`}
        >
          {value === s.id && <span className="absolute left-0 top-2 hidden h-[calc(100%-16px)] w-0.5 rounded bg-brass lg:block" />}
          <s.icon className="h-4 w-4" />
          {s.label}
          {badges[s.id] && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-red-500" />}
        </button>
      ))}
    </nav>
  );
}
