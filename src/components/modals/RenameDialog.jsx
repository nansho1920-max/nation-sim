import { useState } from 'react';
import { Pencil } from 'lucide-react';
import Modal from './Modal';
import { Button } from '../ui/kit';
import { PARTY_COLORS } from '../../game/data/parties';

/** 国名・政党名を変更するダイアログ */
export default function RenameDialog({ title, name, short, color, maxLength = 20, onSave, onCancel }) {
  const [v, setV] = useState(name);
  const [sh, setSh] = useState(short ?? '');
  const [c, setC] = useState(color);
  const withParty = short != null;
  const submit = (e) => {
    e.preventDefault();
    if (v.trim()) onSave({ name: v.trim(), short: sh.trim(), color: c });
  };
  return (
    <Modal onClose={onCancel} className="max-w-md" labelledBy="rename-title">
      <form onSubmit={submit} className="rounded-xl border border-line-strong bg-panel p-5 shadow-2xl">
        <h3 id="rename-title" className="flex items-center gap-2 font-serif text-lg font-bold">
          <Pencil className="h-4 w-4 text-brass" />
          {title}
        </h3>
        <label htmlFor="rename-name" className="label mt-4 block">
          新しい名前
        </label>
        <input
          id="rename-name"
          autoFocus
          value={v}
          maxLength={maxLength}
          onChange={(e) => setV(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line-strong bg-night px-3 py-2 text-ink focus:border-brass focus:outline-none"
        />
        <p className="mt-0.5 text-right text-[10px] text-ink-faint">
          {v.length}/{maxLength}文字
        </p>
        {withParty && (
          <>
            <label htmlFor="rename-short" className="label mt-2 block">
              略称（3文字まで）
            </label>
            <input
              id="rename-short"
              value={sh}
              maxLength={3}
              onChange={(e) => setSh(e.target.value)}
              placeholder={v.slice(0, 2)}
              className="mt-1 w-28 rounded-lg border border-line-strong bg-night px-3 py-2 text-ink focus:border-brass focus:outline-none"
            />
            <div className="label mt-3">党の色</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {PARTY_COLORS.map((pc) => (
                <button type="button" key={pc} onClick={() => setC(pc)} className={`h-7 w-7 rounded-md border-2 ${c === pc ? 'border-white' : 'border-transparent'}`} style={{ background: pc }} aria-label={`色 ${pc}`} />
              ))}
              <input type="color" id="rename-color" value={c} onChange={(e) => setC(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-line-strong bg-transparent" aria-label="色を自由に選ぶ" />
            </div>
          </>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit" variant="primary" disabled={!v.trim()}>
            変更する
          </Button>
        </div>
      </form>
    </Modal>
  );
}
