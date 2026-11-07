import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { Button } from '../ui/kit';

export default function ConfirmDialog({ title, children, confirmLabel = '実行', onConfirm, onCancel, danger }) {
  return (
    <Modal onClose={onCancel} className="max-w-md" labelledBy="confirm-title">
      <div className={`rounded-xl border bg-panel p-5 shadow-2xl ${danger ? 'border-red-800/70' : 'border-line-strong'}`}>
        <h3 id="confirm-title" className="flex items-center gap-2 font-serif text-lg font-bold">
          <AlertTriangle className={`h-5 w-5 ${danger ? 'text-red-400' : 'text-brass'}`} />
          {title}
        </h3>
        <div className="mt-3 text-sm text-ink-dim">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel}>キャンセル</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
