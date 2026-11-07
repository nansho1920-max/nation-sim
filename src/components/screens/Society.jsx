import { useMemo } from 'react';
import { Activity, Baby, Users } from 'lucide-react';
import { Panel, Bar, KV, Chip } from '../ui/kit';
import { POPS } from '../../game/data/pops';
import { partyOf, popPref } from '../../game/engine/parties';
import { popTargets } from '../../game/engine/society';
import { fmtPopulation } from '../../game/core/format';
import { satColor } from '../ui/colors';
import { getIcon } from '../ui/icons';

const INDICES = [
  { key: 'education', label: '教育水準', desc: '教育予算で上がる。潜在成長率・研究力・若者の満足度に影響。', color: '#4f9fd6' },
  { key: 'health', label: '健康水準', desc: '医療予算と環境で決まる。高齢者の満足度と死亡率に影響。', color: '#e07a9a' },
  { key: 'infrastructure', label: 'インフラ', desc: 'インフラ予算で上がる。潜在成長率と農民の満足度に影響。', color: '#d4a24c' },
  { key: 'environment', label: '環境', desc: 'CO₂排出で悪化し、環境予算で改善。悪化すると災害が増える。', color: '#3fae6a' },
  { key: 'corruption', label: '汚職', desc: '放置すると毎月増える。税収を減らし、100に達すると大スキャンダル。', color: '#c77dff', invert: true },
  { key: 'tension', label: '社会の緊張', desc: '支持率の低さ・戦争・物価高で高まり、満足度を押し下げる。', color: '#e05252', invert: true },
];

export default function Society({ state: s, derived: d }) {
  const targets = useMemo(() => popTargets(s, d.fx), [s, d.fx]);
  const soc = s.society;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-bold tracking-wider">国民</h1>
        <div className="flex flex-wrap gap-1.5">
          <Chip>人口 {fmtPopulation(soc.population)}</Chip>
          <Chip tone={d.approval < 30 ? 'bad' : 'good'}>支持率 {d.approval.toFixed(1)}%</Chip>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {POPS.map((p) => {
          const Icon = getIcon(p.icon);
          const pop = s.pops[p.id];
          const t = targets[p.id];
          const prefs = Object.entries(popPref(s, p.id)).sort((a, b) => b[1] - a[1]).slice(0, 2);
          return (
            <section key={p.id} className="panel p-4">
              <header className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-raised">
                  <Icon className="h-5 w-5 text-brass" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-serif text-base font-bold">{p.name}</h3>
                    <span className="num text-xs text-ink-dim">人口の{(d.shares[p.id] * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-[11px] leading-snug text-ink-faint">{p.desc}</p>
                </div>
              </header>
              <div className="mt-3 flex items-center gap-3">
                <span className="num w-10 text-2xl font-bold" style={{ color: satColor(pop.sat) }}>
                  {pop.sat.toFixed(0)}
                </span>
                <div className="flex-1">
                  <Bar value={pop.sat} color={satColor(pop.sat)} marker={t.target} height="h-2.5" />
                  <div className="mt-0.5 text-[10px] text-ink-faint">
                    目標 {t.target.toFixed(0)} {t.target > pop.sat + 1 ? '↗ 改善中' : t.target < pop.sat - 1 ? '↘ 悪化中' : '→ 安定'}
                  </div>
                </div>
              </div>
              <ul className="mt-2 space-y-0.5 border-t border-line pt-2">
                {[...t.factors]
                  .filter((f) => Math.abs(f.value) >= 0.5)
                  .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                  .slice(0, 5)
                  .map((f) => (
                    <li key={f.label} className="flex justify-between text-[12px]">
                      <span className="text-ink-dim">{f.label}</span>
                      <span className={`num ${f.value > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {f.value > 0 ? '+' : ''}
                        {f.value.toFixed(1)}
                      </span>
                    </li>
                  ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-1">
                {prefs.map(([pid]) => {
                  const party = partyOf(s, pid);
                  return (
                    <Chip key={pid}>
                      <span className="h-2 w-2 rounded-full" style={{ background: party.color }} />
                      {party.short}支持層
                    </Chip>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="社会指標" icon={Activity}>
          <div className="space-y-3">
            {INDICES.map((i) => (
              <div key={i.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink">{i.label}</span>
                  <span className="num" style={{ color: i.color }}>
                    {soc[i.key].toFixed(0)}
                  </span>
                </div>
                <Bar value={soc[i.key]} color={i.color} />
                <p className="text-[11px] text-ink-faint">{i.desc}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="人口動態" icon={Baby}>
          <dl>
            <KV label="総人口">{fmtPopulation(soc.population)}</KV>
            <KV label="高齢化率" hint="高いほど社会保障費が膨らみ、潜在成長率が下がる">{soc.aging.toFixed(1)}%</KV>
            <KV label="出生率（人口千人あたり）" hint="子育て支援法で上昇。失業率が高いと下がる">{soc.birthRate.toFixed(1)}</KV>
            <KV label="ジニ係数（格差）" hint="0.3前後が平均的。高いと労働者の不満と社民党の支持が増える">{soc.gini.toFixed(3)}</KV>
            <KV label="貧困率（推計）">{Math.max(3, (soc.gini - 0.22) * 60 + s.econ.unemployment * 0.6).toFixed(1)}%</KV>
            <KV label="失業率">{s.econ.unemployment.toFixed(1)}%</KV>
          </dl>
          <div className="mt-3 rounded-lg bg-night/60 p-3 text-[12px] leading-relaxed text-ink-dim">
            <Users className="mb-1 h-4 w-4 text-brass" />
            支持率は各人口集団の満足度を人口比で平均したもの。選挙では集団ごとの投票率と支持政党が反映されるため、投票率の高い高齢者や資本家の声は議席に強く響く。
          </div>
        </Panel>
      </div>
    </div>
  );
}
