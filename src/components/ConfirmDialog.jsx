import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title, children, confirmLabel = '実行', tone = 'default', onConfirm, onCancel }) {
  if (!open) return null;
  const danger = tone === 'danger';
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div
        className={`w-full max-w-md animate-pop-in rounded-xl border bg-slate-900 p-5 shadow-2xl ${danger ? 'border-red-800/70' : 'border-slate-700'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 ${danger ? 'text-red-400' : 'text-amber-400'}`} />
          <h3 className="font-serif text-lg font-bold text-slate-100">{title}</h3>
        </div>
        <div className="mt-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
            キャンセル
          </button>
          <button onClick={onConfirm} className={`btn font-bold text-white ${danger ? 'bg-red-700 hover:bg-red-600' : 'bg-amber-700 hover:bg-amber-600'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
