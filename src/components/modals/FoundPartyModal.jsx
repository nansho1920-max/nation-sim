import { useState } from 'react';
import { Flag, Users } from 'lucide-react';
import Modal from './Modal';
import PartyEditor from './PartyEditor';
import { PARTY_COLORS } from '../../game/data/parties';
import { FOUND_COST, canFoundParty, previewFounding } from '../../game/engine/politics';
import { partyOf } from '../../game/engine/parties';

/** ゲーム途中の新党結成 */
export default function FoundPartyModal({ state: s, onFound, onCancel }) {
  const [lead, setLead] = useState(true);
  const used = new Set(s.parties.map((p) => p.color));
  const player = partyOf(s, s.meta.partyId);
  const [initial] = useState(() => ({
    id: '__new',
    name: '新しい党',
    short: '新党',
    color: PARTY_COLORS.find((c) => !used.has(c)) ?? '#e8743c',
    axes: { ...player.axes },
  }));
  const can = canFoundParty(s, lead);

  const extra = (draft) => {
    if (!lead) {
      return (
        <p className="mt-3 rounded-lg border border-line bg-night/60 p-3 text-[12px] leading-relaxed text-ink-dim">
          新党は議席ゼロで誕生し、支持を集めながら次の総選挙（得票3%以上で議席獲得）に挑む。あなたの政権には直接影響しないが、支持層が重なる政党の票を奪う。
        </p>
      );
    }
    const pv = previewFounding(s, draft);
    return (
      <div className="mt-3 rounded-lg border border-brass/40 bg-brass/5 p-3 text-[12px] leading-relaxed text-ink">
        <div className="flex items-center gap-1.5 font-bold text-brass-light">
          <Users className="h-4 w-4" />
          結成すると
        </div>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-ink-dim">
          <li>
            あなたは{player.name}を離党し、新党が与党第一党になる。{player.name}の{s.politics.seats[player.id]}議席のうち
            <span className="num font-bold text-ink">約{pv.defectors}人</span>が合流する（政策が近いほど多い）。
          </li>
          <li>{pv.oldStaysInCoalition ? `${player.name}は連立与党として残る。` : `${player.name}とは政策が離れすぎていて、野党に転じる。過半数を失う恐れがある。`}</li>
          <li>新党ブームで政権疲れが少し和らぐ。</li>
        </ul>
      </div>
    );
  };

  return (
    <Modal onClose={onCancel} className="max-w-2xl" labelledBy="found-title">
      <div className="space-y-3">
        <div className="rounded-xl border border-line-strong bg-panel p-4">
          <h2 id="found-title" className="flex items-center gap-2 font-serif text-xl font-bold">
            <Flag className="h-5 w-5 text-brass" />
            新党を結成する
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="結成のかたち">
            {[
              { v: true, title: '自分が新党を率いる', desc: `与党を乗り換える。政治資本${FOUND_COST.lead}` },
              { v: false, title: '野党の新党を誕生させる', desc: `議席ゼロから選挙に挑む。政治資本${FOUND_COST.opposition}` },
            ].map((o) => (
              <button
                key={String(o.v)}
                role="radio"
                aria-checked={lead === o.v}
                onClick={() => setLead(o.v)}
                className={`rounded-lg border p-3 text-left transition ${lead === o.v ? 'border-brass bg-brass/10' : 'border-line bg-night/40 hover:border-line-strong'}`}
              >
                <div className="font-bold">{o.title}</div>
                <div className="text-[11px] text-ink-faint">{o.desc}</div>
              </button>
            ))}
          </div>
          {!can.ok && <p className="mt-2 text-[12px] text-red-300">{can.reason}</p>}
        </div>
        <PartyEditor
          initial={initial}
          others={s.parties}
          extra={extra}
          saveLabel="新党を結成する"
          saveDisabled={!can.ok}
          onCancel={onCancel}
          onSave={(party) => onFound(party, lead)}
        />
      </div>
    </Modal>
  );
}
