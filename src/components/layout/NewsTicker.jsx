import { memo } from 'react';
import { Newspaper } from 'lucide-react';
import { formatYM } from '../../game/core/calendar';

const CAT_COLOR = { 経済: 'text-sky-300', 政治: 'text-brass-light', 外交: 'text-violet-300', 社会: 'text-rose-300', 技術: 'text-emerald-300', 環境: 'text-lime-300', 財政: 'text-amber-300' };

function NewsTicker({ news }) {
  if (!news.length) return null;
  const items = news.slice(0, 10);
  const row = items.map((n) => (
    <span key={n.id} className="mx-6 inline-flex items-center gap-2 whitespace-nowrap">
      <span className={`text-[11px] font-bold ${CAT_COLOR[n.category] ?? 'text-ink-dim'}`}>【{n.category}】</span>
      <span className="text-ink">{n.text}</span>
      <span className="num text-[10px] text-ink-faint">{formatYM(n.date)}</span>
    </span>
  ));
  return (
    <div className="flex items-center border-b border-line bg-panel/80 text-sm">
      <div className="flex shrink-0 items-center gap-1.5 border-r border-line bg-brass/10 px-3 py-1.5 font-serif text-xs font-bold text-brass-light">
        <Newspaper className="h-3.5 w-3.5" />
        国営通信
      </div>
      <div className="relative flex-1 overflow-hidden py-1.5" aria-live="off">
        <div className="inline-flex animate-ticker hover:[animation-play-state:paused]">
          {row}
          {row}
        </div>
      </div>
    </div>
  );
}

export default memo(NewsTicker);
