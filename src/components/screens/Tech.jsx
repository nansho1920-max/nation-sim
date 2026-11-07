import { Check, FlaskConical, Lock } from 'lucide-react';
import { Panel, Bar, Chip } from '../ui/kit';
import { TECHS, TECH_BRANCHES, getTech } from '../../game/data/techs';
import { ERAS } from '../../game/data/balance';
import { researchRate, techAvailable } from '../../game/engine/tech';

export default function Tech({ state: s, derived: d, dispatch }) {
  const rate = researchRate(s, d.fx);
  const cur = s.tech.current && getTech(s.tech.current);
  const tiers = [1, 2, 3, 4];
  const nextEra = ERAS.find((e) => e.min > s.tech.researched.length);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-bold tracking-wider">技術</h1>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="brass">時代：{d.era}</Chip>
          {nextEra && <Chip>次の時代「{nextEra.label}」まであと{nextEra.min - s.tech.researched.length}技術</Chip>}
          <Chip>研究 {rate.toFixed(1)}pt/月</Chip>
        </div>
      </div>
      <Panel title="現在の研究" icon={FlaskConical}>
        {cur ? (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-lg font-bold">{cur.name}</span>
              <span className="num text-sm text-ink-dim">
                {Math.min(s.tech.points, cur.cost).toFixed(0)} / {cur.cost}pt（あと約{Math.max(0, Math.ceil((cur.cost - s.tech.points) / Math.max(0.1, rate)))}ヶ月）
              </span>
            </div>
            <Bar value={s.tech.points} max={cur.cost} height="h-2.5" className="mt-2" />
            <p className="mt-1 text-[12px] text-ink-dim">{cur.desc}</p>
          </div>
        ) : (
          <p className="text-sm text-amber-300">研究テーマが未設定（貯蓄 {s.tech.points.toFixed(0)}pt）。下の技術ツリーから選ぼう。</p>
        )}
        <p className="mt-2 text-[11px] text-ink-faint">研究ポイントは研究開発予算（GDP比）と教育水準から生まれ、文部科学大臣の能力で増減する。</p>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {TECH_BRANCHES.map((b) => (
          <section key={b.id} className="panel p-3">
            <h2 className="mb-2 flex items-center gap-2 font-serif font-bold" style={{ color: b.color }}>
              <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
              {b.label}
            </h2>
            <div className="space-y-2">
              {tiers.map((tier) =>
                TECHS.filter((t) => t.branch === b.id && t.tier === tier).map((t) => {
                  const done = s.tech.researched.includes(t.id);
                  const avail = techAvailable(s, t);
                  const active = s.tech.current === t.id;
                  return (
                    <button
                      key={t.id}
                      disabled={!avail || active}
                      onClick={() => dispatch({ type: 'SET_RESEARCH', techId: t.id })}
                      className={`w-full rounded-lg border p-2.5 text-left transition ${
                        done
                          ? 'border-emerald-700/50 bg-emerald-950/30'
                          : active
                            ? 'border-brass bg-brass/10'
                            : avail
                              ? 'border-line-strong bg-raised hover:border-brass/60'
                              : 'cursor-not-allowed border-line bg-night/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">
                          <span className="mr-1 text-[10px] text-ink-faint">T{t.tier}</span>
                          {t.name}
                        </span>
                        {done ? <Check className="h-4 w-4 text-emerald-400" /> : !avail ? <Lock className="h-3.5 w-3.5 text-ink-faint" /> : <span className="num text-[11px] text-ink-dim">{t.cost}pt</span>}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-ink-dim">{t.desc}</p>
                      {t.requires.length > 0 && !done && <p className="mt-0.5 text-[10px] text-ink-faint">前提：{t.requires.map((r) => getTech(r).name).join('・')}</p>}
                      {active && <p className="mt-0.5 text-[10px] font-bold text-brass">研究中</p>}
                    </button>
                  );
                }),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
