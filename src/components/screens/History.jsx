import { useState } from 'react';
import { ScrollText, Vote } from 'lucide-react';
import { Panel } from '../ui/kit';
import { formatDate, formatYM } from '../../game/core/calendar';
import { PARTIES } from '../../game/data/parties';

const FILTERS = [
  ['all', 'すべて'],
  ['event', 'イベント'],
  ['politics', '政治'],
  ['economy', '経済'],
  ['diplomacy', '外交'],
  ['tech', '技術'],
];
const STYLE = {
  info: 'border-slate-600',
  good: 'border-emerald-500',
  bad: 'border-red-500',
  warn: 'border-amber-500',
  war: 'border-red-600 bg-red-950/20',
  event: 'border-fuchsia-500',
  action: 'border-sky-500',
  politics: 'border-brass',
  report: 'border-line-strong text-ink-dim text-xs',
};

export default function History({ state: s }) {
  const [filter, setFilter] = useState('all');
  const [showReports, setShowReports] = useState(false);
  const logs = s.logs.filter((l) => (filter === 'all' || l.category === filter) && (showReports || l.type !== 'report'));
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl font-bold tracking-wider">歴史</h1>
      {s.politics.elections.length > 0 && (
        <Panel title="総選挙の記録" icon={Vote} bodyClass="overflow-x-auto p-0">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] text-ink-faint">
                <th className="px-3 py-2 text-left font-medium">日付</th>
                {PARTIES.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-right font-medium" style={{ color: p.color }}>
                    {p.short}
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-medium">連立</th>
              </tr>
            </thead>
            <tbody>
              {s.politics.elections.map((e, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="num px-3 py-1.5">{formatYM(e.date)}</td>
                  {PARTIES.map((p) => (
                    <td key={p.id} className={`num px-2 py-1.5 text-right ${e.coalition.includes(p.id) ? 'font-bold text-ink' : 'text-ink-dim'}`}>
                      {e.seats[p.id]}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-[12px]">{e.coalition.map((c) => PARTIES.find((p) => p.id === c).short).join('・')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      <Panel
        title="国家の記録"
        icon={ScrollText}
        actions={
          <label className="flex items-center gap-1.5 text-xs text-ink-dim">
            <input type="checkbox" checked={showReports} onChange={(e) => setShowReports(e.target.checked)} id="show-reports" />
            月次報告を表示
          </label>
        }
      >
        <div className="mb-3 flex flex-wrap gap-1">
          {FILTERS.map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={`rounded-full border px-3 py-1 text-xs ${filter === id ? 'border-brass bg-brass/15 text-brass-light' : 'border-line text-ink-dim hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        <ol className="space-y-1.5">
          {logs.slice(0, 200).map((l) => (
            <li key={l.id} className={`rounded-r-md border-l-2 px-3 py-1.5 text-[13px] leading-relaxed ${STYLE[l.type] ?? STYLE.info}`}>
              <span className="num mr-2 text-[11px] text-ink-faint">{formatDate(l.date)}</span>
              {l.text}
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
