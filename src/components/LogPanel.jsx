import { ScrollText } from 'lucide-react';

const STYLES = {
  info: 'border-slate-600 text-slate-300',
  good: 'border-emerald-500 text-emerald-200',
  bad: 'border-rose-500 text-rose-200',
  warn: 'border-amber-500 text-amber-200',
  war: 'border-red-600 text-red-200 bg-red-950/20',
  event: 'border-fuchsia-500 text-fuchsia-200',
  action: 'border-sky-500 text-sky-200',
  report: 'border-slate-700 text-slate-400 text-xs',
};

export default function LogPanel({ logs, currentTurn }) {
  return (
    <section className="panel flex h-full min-h-[420px] flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="panel-title">
          <ScrollText className="h-4 w-4" />
          国家情勢ログ
        </h2>
        <span className="text-[11px] text-slate-500">{logs.length}件</span>
      </div>
      <ol className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto p-4 lg:max-h-[calc(100vh-260px)]">
        {logs.map((log) => (
          <li
            key={log.id}
            className={`animate-slide-in rounded-r-md border-l-2 px-3 py-1.5 text-sm leading-relaxed ${STYLES[log.type] ?? STYLES.info} ${
              log.turn === currentTurn || log.turn === currentTurn - 1 ? '' : 'opacity-60'
            }`}
          >
            {log.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
