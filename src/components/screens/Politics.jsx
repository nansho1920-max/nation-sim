import { memo, useMemo, useState } from 'react';
import { Briefcase, Check, Flag, Gavel, Landmark, Pencil, Scale, SlidersHorizontal, Star, Trash2, UserPlus, UserMinus, Vote } from 'lucide-react';
import ConfirmDialog from '../modals/ConfirmDialog';
import PolicyDialog from '../modals/PolicyDialog';
import RenameDialog from '../modals/RenameDialog';
import FoundPartyModal from '../modals/FoundPartyModal';
import { Panel, Button, Chip, Bar, Sparkline, Tabs } from '../ui/kit';
import { compat as compatOf, partyOf, seatOrder, stanceOf } from '../../game/engine/parties';
import { ideologyLabel } from '../../game/data/parties';
import { LAWS, LAW_CATEGORIES } from '../../game/data/laws';
import { MINISTRIES, competenceToEff } from '../../game/data/cabinet';
import { MAJORITY, SUPERMAJORITY } from '../../game/data/balance';
import { DISSOLVE_COST, canDissolve, canInvite, canProposeLaw, getPromise, lawCost, nextElectionLabel, predictVote, previewDissolve } from '../../game/engine/politics';
import { getTech } from '../../game/data/techs';
import { formatYM } from '../../game/core/calendar';


function hemicyclePositions(total, rows = 9) {
  const radii = Array.from({ length: rows }, (_, i) => 0.38 + (0.62 * i) / (rows - 1));
  const sumR = radii.reduce((a, b) => a + b, 0);
  let counts = radii.map((r) => Math.round((total * r) / sumR));
  counts[counts.length - 1] += total - counts.reduce((a, b) => a + b, 0);
  const pts = [];
  radii.forEach((r, i) => {
    const n = counts[i];
    for (let k = 0; k < n; k++) {
      const a = Math.PI - (Math.PI * (k + 0.5)) / n;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, a });
    }
  });
  return pts.sort((p, q) => q.a - p.a);
}
const POSITIONS = hemicyclePositions(300);

const Parliament = memo(function Parliament({ seats, coalition, order, parties }) {
  const colors = [];
  for (const pid of order) for (let i = 0; i < (seats[pid] ?? 0); i++) colors.push(pid);
  return (
    <svg viewBox="-1.05 -1.05 2.1 1.12" className="w-full" role="img" aria-label="議会の議席配置">
      {POSITIONS.map((p, i) => {
        const pid = colors[i];
        const party = parties.find((p) => p.id === pid);
        return <circle key={i} cx={p.x} cy={-p.y} r={0.026} fill={party?.color ?? '#333'} opacity={coalition.includes(pid) ? 1 : 0.38} />;
      })}
      <line x1={0} y1={-1.03} x2={0} y2={0.02} stroke="#ecc77e" strokeWidth="0.006" strokeDasharray="0.02 0.02" opacity="0.6" />
    </svg>
  );
});

const Stars = ({ n, label }) => (
  <span className="inline-flex items-center gap-0.5" title={`${label} ${n}/5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-3 w-3 ${i < n ? 'fill-brass text-brass' : 'text-line-strong'}`} />
    ))}
  </span>
);

function ParliamentTab({ s, d, dispatch, onFound, onRename, onPolicy, onDissolve }) {
  const pol = s.politics;
  const player = s.meta.partyId;
  const hist = s.history.slice(-36);
  const last = pol.elections.at(-1);
  const promise = pol.promise;
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <Panel title="議会（定数300）" icon={Landmark}>
        <Parliament seats={pol.seats} coalition={pol.coalition} order={seatOrder(s)} parties={s.parties} />
        <div className="mt-1 text-center">
          <span className="num text-3xl font-bold text-brass-light">{d.coalitionSeats}</span>
          <span className="text-ink-dim"> / 300 議席（与党連合）</span>
          <div className="mt-1 flex justify-center gap-2">
            <Chip tone={d.coalitionSeats >= MAJORITY ? 'good' : 'bad'}>{d.coalitionSeats >= MAJORITY ? '過半数' : '少数与党'}（{MAJORITY}）</Chip>
            <Chip tone={d.coalitionSeats >= SUPERMAJORITY ? 'good' : 'neutral'}>憲法改正ライン {SUPERMAJORITY}</Chip>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-night/50 p-3">
            <div className="label">次期総選挙</div>
            <div className="num font-serif text-lg font-bold">{nextElectionLabel(s)}</div>
            <div className="text-[11px] text-ink-dim">あと{pol.nextElection - s.month}ヶ月</div>
          </div>
          <div className="rounded-lg border border-line bg-night/50 p-3">
            <div className="label">政権疲れ</div>
            <div className="num font-serif text-lg font-bold text-amber-300">−{(pol.fatigue ?? 0).toFixed(1)}</div>
            <div className="text-[11px] text-ink-dim">全国民の満足度に影響</div>
          </div>
          <div className="rounded-lg border border-line bg-night/50 p-3">
            <div className="label">選挙公約</div>
            {promise ? (
              <>
                <div className="font-bold text-ink">{getPromise(promise.type).label}</div>
                <div className="text-[11px] text-ink-dim">{promise.deadline ? `期限まであと${promise.deadline - s.month}ヶ月` : '選挙後18ヶ月以内に実現'}</div>
                <div className="text-[10px] text-ink-faint">{getPromise(promise.type).goal}</div>
              </>
            ) : (
              <div className="text-sm text-ink-faint">なし</div>
            )}
          </div>
        </div>
        {last && (
          <p className="mt-3 text-[12px] text-ink-dim">
            前回の総選挙（{formatYM(last.date)}）：
            {s.parties.filter((p) => last.seats[p.id] > 0)
              .map((p) => `${p.short}${last.seats[p.id]}`)
              .join('・')}
          </p>
        )}
      </Panel>

      <Panel
        title="政党と連立"
        icon={Vote}
        bodyClass="p-0"
        actions={
          <Button size="sm" onClick={onFound}>
            <Flag className="h-3.5 w-3.5" />
            新党を結成
          </Button>
        }
      >
        <ul className="divide-y divide-line">
          {[...s.parties]
            .sort((a, b) => pol.seats[b.id] - pol.seats[a.id])
            .map((p) => {
              const inCoalition = pol.coalition.includes(p.id);
              const isPlayer = p.id === player;
              const inv = canInvite(s, p.id);
              const compat = compatOf(s, player, p.id);
              return (
                <li key={p.id} className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm" style={{ background: p.color }} />
                      <span className="font-bold text-ink">{p.name}</span>
                      <button onClick={() => onRename(p)} className="btn h-6 w-6 text-ink-faint hover:bg-raised hover:text-ink" aria-label={`${p.name}の名前を変更`} title="名前を変更">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onPolicy(p)}
                        className="btn h-6 gap-1 rounded px-1.5 text-[10px] text-ink-faint hover:bg-raised hover:text-ink"
                        aria-label={`${p.name}の政策を変更`}
                        title={isPlayer ? '政策転換' : '路線変更（政界工作）'}
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        政策
                      </button>
                      {!isPlayer && (
                        <button
                          onClick={() => onDissolve(p)}
                          className="btn h-6 gap-1 rounded px-1.5 text-[10px] text-ink-faint hover:bg-raised hover:text-red-300"
                          aria-label={`${p.name}を解党させる`}
                          title="解党させる"
                        >
                          <Trash2 className="h-3 w-3" />
                          解党
                        </button>
                      )}
                      {isPlayer && <Chip tone="brass">与党第一党</Chip>}
                      {inCoalition && !isPlayer && <Chip tone="good">連立</Chip>}
                    </div>
                    <div className="text-[11px] text-ink-faint">{ideologyLabel(p.axes)}</div>
                    <div className="mt-1 grid grid-cols-[1fr_5rem] items-center gap-2">
                      <Sparkline data={hist.map((h) => h.support[p.id])} color={p.color} height={20} />
                      <div className="text-right">
                        <div className="num text-sm text-ink">{pol.support[p.id].toFixed(1)}%</div>
                        <div className="num text-[11px] text-ink-dim">{pol.seats[p.id]}議席</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-center gap-1">
                    {!isPlayer && <span className="text-[10px] text-ink-faint">相性 {(compat * 100).toFixed(0)}</span>}
                    {!isPlayer &&
                      (inCoalition ? (
                        <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'DISMISS_PARTY', partyId: p.id })}>
                          <UserMinus className="h-3.5 w-3.5" />
                          離脱
                        </Button>
                      ) : (
                        <Button size="sm" disabled={!inv.ok} title={inv.reason} onClick={() => dispatch({ type: 'INVITE_PARTY', partyId: p.id })}>
                          <UserPlus className="h-3.5 w-3.5" />
                          連立へ
                        </Button>
                      ))}
                  </div>
                </li>
              );
            })}
        </ul>
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-faint">連立への勧誘には政治資本15が必要。選挙後は議席に応じて自動で連立が組み直される。総選挙で与党連合が過半数を割り、かつ第一党でもなければ政権交代となる。</p>
      </Panel>
    </div>
  );
}

function StanceDot({ stance }) {
  const map = { 2: 'bg-emerald-400', 1: 'bg-emerald-700', 0: 'bg-slate-500', '-1': 'bg-red-800', '-2': 'bg-red-500' };
  const label = { 2: '強く賛成', 1: '賛成', 0: '中立', '-1': '反対', '-2': '強く反対' };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[stance]}`} title={label[stance]} />;
}

function LawsTab({ s, dispatch }) {
  const [cat, setCat] = useState('all');
  const laws = LAWS.filter((l) => cat === 'all' || l.category === cat);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {[['all', 'すべて'], ...Object.entries(LAW_CATEGORIES)].map(([id, label]) => (
          <button key={id} onClick={() => setCat(id)} className={`rounded-full border px-3 py-1 text-xs ${cat === id ? 'border-brass bg-brass/15 text-brass-light' : 'border-line text-ink-dim hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {laws.map((law) => {
          const active = !!s.politics.laws[law.id];
          const vote = predictVote(s, law, active);
          const can = canProposeLaw(s, law, active);
          const cost = lawCost(law, active);
          const techMissing = law.requiresTech && !s.tech.researched.includes(law.requiresTech);
          return (
            <article key={law.id} className={`panel p-4 ${active ? 'border-brass/50' : ''}`}>
              <header className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-serif font-bold text-ink">{law.name}</h3>
                    {active && (
                      <Chip tone="brass">
                        <Check className="h-3 w-3" />
                        施行中
                      </Chip>
                    )}
                    {law.constitutional && <Chip tone="warn">憲法改正</Chip>}
                  </div>
                  <div className="text-[11px] text-ink-faint">{LAW_CATEGORIES[law.category]}</div>
                </div>
              </header>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">{law.desc}</p>
              {techMissing && <p className="mt-1 text-[11px] text-amber-300">技術「{getTech(law.requiresTech).name}」の研究が必要</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-dim">
                {s.parties.map((p) => (
                  <span key={p.id} className="flex items-center gap-1">
                    <StanceDot stance={stanceOf(s, law, p.id) * (active ? -1 : 1)} />
                    {p.short}
                  </span>
                ))}
              </div>
              <div className="mt-2">
                <Bar value={vote.yes} max={300} color={vote.passes ? '#4cb782' : '#e05252'} marker={vote.needed} height="h-2" />
                <div className="num mt-0.5 flex justify-between text-[11px]">
                  <span className={vote.passes ? 'text-emerald-300' : 'text-red-300'}>
                    賛成見込み {vote.yes} / 必要 {vote.needed}
                  </span>
                  <span className="text-ink-faint">{vote.passes ? '可決見込み' : '否決見込み'}</span>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant={active ? 'default' : 'primary'}
                  disabled={!can.ok}
                  title={can.reason}
                  onClick={() => dispatch({ type: 'PROPOSE_LAW', lawId: law.id, repeal: active })}
                >
                  <Gavel className="h-3.5 w-3.5" />
                  {active ? '廃止法案を提出' : '法案を提出'}（政治資本{cost}）
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="text-[11px] text-ink-faint">否決されても政治資本は戻らない。連立与党は「強く反対」でない限り賛成し、野党は「賛成」以上の法案にだけ賛成票を投じる。</p>
    </div>
  );
}

function CabinetTab({ s, dispatch }) {
  const pol = s.politics;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {MINISTRIES.map((m) => {
        const cur = pol.ministers[m.id];
        const cands = pol.candidates[m.id] ?? [];
        return (
          <section key={m.id} className="panel p-4">
            <header className="flex items-baseline justify-between">
              <h3 className="font-serif font-bold">{m.name}</h3>
              <span className="text-[11px] text-ink-faint">{m.desc}</span>
            </header>
            {cur ? (
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-brass/30 bg-brass/5 p-2.5">
                <Briefcase className="h-5 w-5 text-brass" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{cur.name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-dim">
                    <span style={{ color: partyOf(s, cur.party)?.color }}>{partyOf(s, cur.party)?.short}</span>
                    能力 <Stars n={cur.competence} label="能力" />
                    清廉 <Stars n={cur.integrity} label="清廉さ" />
                  </div>
                </div>
                <span className="num text-sm text-brass-light" title="省庁の効率">
                  ×{competenceToEff(cur.competence).toFixed(2)}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-red-300">空席</p>
            )}
            <div className="mt-2 space-y-1">
              {cands
                .filter((c) => c.id !== cur?.id)
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-[12px]">
                    <span className="min-w-0 flex-1 truncate">
                      {c.name}
                      <span className="ml-1" style={{ color: partyOf(s, c.party)?.color }}>
                        ({partyOf(s, c.party)?.short})
                      </span>
                    </span>
                    <Stars n={c.competence} label="能力" />
                    <Stars n={c.integrity} label="清廉さ" />
                    <Button size="sm" variant="ghost" disabled={pol.capital < 5} onClick={() => dispatch({ type: 'APPOINT_MINISTER', ministry: m.id, candidateId: c.id })}>
                      任命
                    </Button>
                  </div>
                ))}
            </div>
          </section>
        );
      })}
      <p className="text-[11px] text-ink-faint lg:col-span-2">能力の高い大臣ほど担当分野の効率が上がる。清廉さが低い大臣は毎月の汚職を増やす。任命には政治資本5が必要。候補者は選挙のたびに入れ替わる。</p>
    </div>
  );
}

const TABS = [
  { id: 'parliament', label: '議会・政党', icon: Landmark },
  { id: 'laws', label: '法律', icon: Scale },
  { id: 'cabinet', label: '内閣', icon: Briefcase },
];

function DissolveDialog({ s, party, dispatch, onClose }) {
  const can = canDissolve(s, party.id);
  const pv = previewDissolve(s, party.id);
  const moves = Object.entries(pv.transfers)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  return (
    <ConfirmDialog
      title={`${party.name}を解党させますか？`}
      confirmLabel={can.ok ? `解党させる（政治資本${DISSOLVE_COST}）` : '解党できません'}
      danger
      onCancel={onClose}
      onConfirm={() => {
        if (can.ok) dispatch({ type: 'DISSOLVE_PARTY', id: party.id });
        onClose();
      }}
    >
      <p>政界工作で{party.name}を解党に追い込む。所属議員と支持者は、政策の近い党へ移っていく。</p>
      {moves.length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-lg bg-night/60 p-2.5 text-[12px]">
          {moves.map(([pid, n]) => (
            <li key={pid} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: partyOf(s, pid).color }} />
              <span className="flex-1 text-ink">{partyOf(s, pid).name}</span>
              <span className="num text-ink">+{n}議席</span>
            </li>
          ))}
        </ul>
      )}
      {pv.wasPartner && (
        <p className={`mt-2 text-[12px] ${pv.coalitionSeats >= MAJORITY ? 'text-amber-300' : 'text-red-300'}`}>
          連立与党の一角が消えるため、与党連合は{pv.coalitionSeats}議席になる{pv.coalitionSeats < MAJORITY ? '（過半数割れ）' : ''}。この党の大臣は内閣から外れる。
        </p>
      )}
      {!can.ok && <p className="mt-2 text-[12px] text-red-300">{can.reason}</p>}
    </ConfirmDialog>
  );
}

export default function Politics({ state, derived, dispatch }) {
  const [tab, setTab] = useState('parliament');
  const [founding, setFounding] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [dissolving, setDissolving] = useState(null);
  const enacted = useMemo(() => Object.keys(state.politics.laws).length, [state.politics.laws]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-bold tracking-wider">政治</h1>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="brass">政治資本 {Math.floor(state.politics.capital)}（+{(state.politics.lastCapitalGain ?? 0).toFixed(1)}/月）</Chip>
          <Chip>施行中の法律 {enacted}</Chip>
        </div>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'parliament' && <ParliamentTab s={state} d={derived} dispatch={dispatch} onFound={() => setFounding(true)} onRename={setRenaming} onPolicy={setPolicy} onDissolve={setDissolving} />}
      {dissolving && <DissolveDialog s={state} party={dissolving} dispatch={dispatch} onClose={() => setDissolving(null)} />}
      {policy && (
        <PolicyDialog
          state={state}
          party={state.parties.find((p) => p.id === policy.id)}
          onCancel={() => setPolicy(null)}
          onApply={(axes) => {
            dispatch({ type: 'CHANGE_POLICY', id: policy.id, axes });
            setPolicy(null);
          }}
        />
      )}
      {founding && (
        <FoundPartyModal
          state={state}
          onCancel={() => setFounding(false)}
          onFound={(party, lead) => {
            dispatch({ type: 'FOUND_PARTY', party, lead });
            setFounding(false);
          }}
        />
      )}
      {renaming && (
        <RenameDialog
          title={`${renaming.name}の名前を変更`}
          name={renaming.name}
          short={renaming.short}
          color={renaming.color}
          maxLength={14}
          onCancel={() => setRenaming(null)}
          onSave={({ name, short, color }) => {
            dispatch({ type: 'RENAME', kind: 'party', id: renaming.id, name, short, color });
            setRenaming(null);
          }}
        />
      )}
      {tab === 'laws' && <LawsTab s={state} dispatch={dispatch} />}
      {tab === 'cabinet' && <CabinetTab s={state} dispatch={dispatch} />}
    </div>
  );
}
