import { useEffect, useMemo, useState } from 'react';
import { Banknote, Building, Factory, Landmark, Percent, Plug, Printer, Receipt, Scale, Sun, Atom } from 'lucide-react';
import { Panel, Button, Chip, Bar, KV, Tabs } from '../ui/kit';
import { BUDGET_CATEGORIES, ENERGY_PROJECTS, TAXES } from '../../game/data/balance';
import { fmtTrillion } from '../../game/core/format';
import { runFiscal } from '../../game/engine/economy';
import { aggregateEffects } from '../../game/engine/derived';

const REV_LABELS = { income: '所得税', corporate: '法人税', consumption: '消費税', other: '炭素税など', resource: '資源収入' };
const SPEND_LABELS = {
  education: '教育',
  health: '医療',
  welfare: '社会保障（高齢化分を含む）',
  military: '防衛',
  infrastructure: 'インフラ',
  research: '研究開発',
  environment: '環境・エネルギー',
  laws: '法律による追加支出',
  unemployment: '失業給付',
  war: '戦費',
};

function Slider({ label, value, min, max, step, unit = '%', onChange, desc, original }) {
  const changed = Math.abs(value - original) > 1e-9;
  const id = `slider-${label}`;
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm text-ink">
          {label}
        </label>
        <span className="num text-sm">
          {changed && <span className="mr-1.5 text-ink-faint line-through">{original.toFixed(step < 1 ? 1 : 0)}</span>}
          <span className={changed ? 'font-bold text-brass-light' : 'text-ink'}>
            {value.toFixed(step < 1 ? 1 : 0)}
            {unit}
          </span>
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      {desc && <p className="text-[11px] leading-snug text-ink-faint">{desc}</p>}
    </div>
  );
}

function BudgetTab({ s, dispatch }) {
  const [taxes, setTaxes] = useState(s.econ.taxes);
  const [budget, setBudget] = useState(s.econ.budget);
  // 予算が外部で変わったら（適用後など）下書きもリセット
  const taxesKey = JSON.stringify(s.econ.taxes);
  const budgetKey = JSON.stringify(s.econ.budget);
  useEffect(() => {
    setTaxes(JSON.parse(taxesKey));
    setBudget(JSON.parse(budgetKey));
  }, [taxesKey, budgetKey]);

  const preview = useMemo(() => {
    const clone = structuredClone(s);
    clone.econ.taxes = taxes;
    clone.econ.budget = budget;
    runFiscal(clone, aggregateEffects(clone));
    return clone.econ.lastMonth;
  }, [s, taxes, budget]);

  const changed = TAXES.some((t) => taxes[t.id] !== s.econ.taxes[t.id]) || BUDGET_CATEGORIES.some((c) => Math.abs(budget[c.id] - s.econ.budget[c.id]) > 1e-9);
  const cur = s.econ.lastMonth;
  const annual = (v) => v * 12;
  const pct = (v) => ((v * 12) / s.econ.gdp) * 100;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
      <Panel title="税制" icon={Percent}>
        {TAXES.map((t) => (
          <Slider key={t.id} label={t.label} value={taxes[t.id]} original={s.econ.taxes[t.id]} min={t.min} max={t.max} step={t.step} desc={t.desc} onChange={(v) => setTaxes({ ...taxes, [t.id]: v })} />
        ))}
        <p className="mt-2 rounded-md bg-night/60 p-2 text-[11px] leading-relaxed text-ink-dim">
          増税は該当する国民層の満足度を即座に下げ、経済成長も鈍らせる。減税は満足度と成長を押し上げるが、財政赤字は国債で穴埋めされ、債務が膨らむと国債利回りが上昇する。
        </p>
      </Panel>
      <Panel title="予算配分（GDP比）" icon={Landmark}>
        {BUDGET_CATEGORIES.map((c) => (
          <Slider key={c.id} label={c.label} value={budget[c.id]} original={s.econ.budget[c.id]} min={c.min} max={c.max} step={0.1} desc={c.desc} onChange={(v) => setBudget({ ...budget, [c.id]: Math.round(v * 10) / 10 })} />
        ))}
      </Panel>
      <div className="space-y-4">
        <Panel title="収支の見通し（年換算）" icon={Scale}>
          <dl>
            <KV label="歳入">
              {fmtTrillion(annual(preview.revenue))} <span className="text-[11px] text-ink-faint">({pct(preview.revenue).toFixed(1)}%)</span>
            </KV>
            <KV label="歳出">
              {fmtTrillion(annual(preview.spending))} <span className="text-[11px] text-ink-faint">({pct(preview.spending).toFixed(1)}%)</span>
            </KV>
            <KV label="利払い">{fmtTrillion(annual(preview.interest))}</KV>
            <div className="my-1 border-t border-line" />
            <KV label="財政収支">
              <span className={preview.balance >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                {preview.balance >= 0 ? '+' : '−'}
                {fmtTrillion(Math.abs(annual(preview.balance)))}
              </span>
            </KV>
            {changed && (
              <KV label="現在との差">
                <span className={preview.balance - cur.balance >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {preview.balance - cur.balance >= 0 ? '+' : '−'}
                  {fmtTrillion(Math.abs(annual(preview.balance - cur.balance)))}/年
                </span>
              </KV>
            )}
          </dl>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" className="flex-1" disabled={!changed || s.politics.capital < 5} onClick={() => dispatch({ type: 'APPLY_BUDGET', taxes, budget })}>
              予算を成立させる（政治資本5）
            </Button>
            <Button
              disabled={!changed}
              onClick={() => {
                setTaxes(s.econ.taxes);
                setBudget(s.econ.budget);
              }}
            >
              戻す
            </Button>
          </div>
          {changed && s.politics.capital < 5 && <p className="mt-1 text-[11px] text-red-300">政治資本が足りない。</p>}
        </Panel>
      </div>
    </div>
  );
}

function MonetaryTab({ s, d, dispatch }) {
  const [rate, setRate] = useState(s.econ.policyRate);
  const [repay, setRepay] = useState(0);
  const [confirmPrint, setConfirmPrint] = useState(false);
  useEffect(() => setRate(s.econ.policyRate), [s.econ.policyRate]);
  const e = s.econ;
  const maxRepay = Math.floor(Math.min(e.treasury, e.debt));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="金融政策" icon={Percent}>
        <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-night/60 p-3">
          <div>
            <div className="text-sm font-bold text-ink">中央銀行の独立性</div>
            <div className="text-[11px] text-ink-dim">{e.cbAuto ? 'インフレと景気を見て中央銀行が自動で金利を決める' : '政府が政策金利を直接決めている'}</div>
          </div>
          <button
            role="switch"
            aria-checked={e.cbAuto}
            onClick={() => dispatch({ type: 'SET_CB_AUTO', auto: !e.cbAuto })}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition ${e.cbAuto ? 'border-brass bg-brass/80' : 'border-line-strong bg-raised'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${e.cbAuto ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        <Slider label="政策金利" value={rate} original={e.policyRate} min={0} max={15} step={0.25} onChange={setRate} desc="利上げはインフレを抑えるが景気を冷やす。利下げは成長を促すが、やりすぎるとインフレを招く。" />
        <Button className="mt-1 w-full" disabled={rate === e.policyRate} onClick={() => dispatch({ type: 'SET_POLICY_RATE', rate })}>
          {e.cbAuto ? '金利を決定（自動調整は解除される）' : '金利を決定'}
        </Button>
        <dl className="mt-3 border-t border-line pt-2">
          <KV label="インフレ率">{e.inflation.toFixed(2)}%</KV>
          <KV label="実質金利" hint="政策金利 − インフレ率">{(e.policyRate - e.inflation).toFixed(2)}%</KV>
          <KV label="潜在成長率">{e.potential.toFixed(2)}%</KV>
        </dl>
      </Panel>

      <Panel title="政府債務" icon={Receipt}>
        <dl>
          <KV label="政府債務残高">{fmtTrillion(e.debt)}</KV>
          <KV label="GDP比">
            <span className={d.debtRatio > 200 ? 'text-red-300' : d.debtRatio > 120 ? 'text-amber-300' : ''}>{d.debtRatio.toFixed(1)}%</span>
          </KV>
          <KV label="国債利回り（新規発行）" hint="政策金利＋債務・インフレ・汚職によるリスクプレミアム">{e.bondYield.toFixed(2)}%</KV>
          <KV label="平均調達金利" hint="既発債の借り換えで少しずつ新規利回りに近づく">{e.avgRate.toFixed(2)}%</KV>
          <KV label="利払い（年）">{fmtTrillion(e.lastMonth.interest * 12)}</KV>
        </dl>
        <div className="mt-2">
          <Bar value={Math.min(300, d.debtRatio)} max={300} color={d.debtRatio > 200 ? '#e05252' : d.debtRatio > 120 ? '#e0a03c' : '#4cb782'} height="h-2" />
          <div className="num mt-0.5 flex justify-between text-[10px] text-ink-faint">
            <span>0%</span>
            <span>150%</span>
            <span>300%（破綻）</span>
          </div>
        </div>
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          <Slider label="国債の繰上償還" value={Math.min(repay, maxRepay)} original={0} min={0} max={Math.max(0, maxRepay)} step={1} unit="兆" onChange={setRepay} desc={`国庫（${fmtTrillion(e.treasury)}）から債務を返済する。`} />
          <Button className="w-full" disabled={repay <= 0 || maxRepay <= 0} onClick={() => dispatch({ type: 'REPAY_DEBT', amount: repay })}>
            償還する
          </Button>
          {!confirmPrint ? (
            <Button variant="danger" className="w-full" disabled={s.politics.capital < 5} onClick={() => setConfirmPrint(true)}>
              <Printer className="h-4 w-4" />
              紙幣を増刷する（GDPの2%・政治資本5）
            </Button>
          ) : (
            <div className="rounded-lg border border-red-800/60 bg-red-950/40 p-3 text-sm">
              <p className="text-red-100">中央銀行に国債を引き受けさせ、{fmtTrillion(e.gdp * 0.02)}を国庫に入れる。インフレ率が大きく上がり、国際評価が下がる。実行する？</p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    dispatch({ type: 'PRINT_MONEY' });
                    setConfirmPrint(false);
                  }}
                >
                  増刷する
                </Button>
                <Button onClick={() => setConfirmPrint(false)}>やめる</Button>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

const PROJECT_ICONS = { fossil: Factory, renewable: Sun, nuclear: Atom };

function EnergyTab({ s, d, dispatch }) {
  const en = d.energy;
  const fx = d.fx;
  const total = Math.max(en.demand, en.generated, 1);
  const segs = [
    { label: '再エネ', v: en.renewableGen, c: '#3fae6a' },
    { label: '原子力', v: en.nuclearGen, c: '#8b7cd6' },
    { label: '火力', v: en.fossilUsed, c: '#a0663c' },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="電力需給" icon={Plug}>
        <div className="mb-1 flex justify-between text-[11px] text-ink-dim">
          <span>発電量 {en.generated.toFixed(1)}</span>
          <span>需要 {en.demand.toFixed(1)}</span>
        </div>
        <div className="relative flex h-6 overflow-hidden rounded bg-night">
          {segs.map((g) => (
            <div key={g.label} style={{ width: `${(g.v / total) * 100}%`, background: g.c }} title={`${g.label} ${g.v.toFixed(1)}`} />
          ))}
          <div className="absolute top-0 h-full w-0.5 bg-white" style={{ left: `${(en.demand / total) * 100}%` }} title="需要" />
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
          {segs.map((g) => (
            <span key={g.label} className="flex items-center gap-1 text-ink-dim">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: g.c }} />
              {g.label} <span className="num text-ink">{g.v.toFixed(1)}</span>
            </span>
          ))}
        </div>
        {en.shortage > 0.005 && <p className="mt-2 rounded bg-red-950/50 px-2 py-1 text-sm text-red-200">需要の{(en.shortage * 100).toFixed(1)}%が不足し、停電で経済成長が大きく落ち込んでいる。</p>}
        <dl className="mt-3 border-t border-line pt-2">
          <KV label="発電容量（火力／原子力／再エネ）">
            {s.energy.fossil.toFixed(0)} / {s.energy.nuclear.toFixed(0)} / {en.renewable.toFixed(0)}
          </KV>
          <KV label="再生可能エネルギー比率">{en.renewableShare.toFixed(1)}%</KV>
          <KV label="CO₂排出量（指数）">{en.co2.toFixed(1)}</KV>
          <KV label="原油価格">{s.econ.oilPrice.toFixed(0)} ドル/バレル</KV>
        </dl>
        <p className="mt-2 text-[11px] text-ink-faint">経済が成長すると電力需要も増える。不足する前に発電所を建設しておこう。</p>
      </Panel>
      <Panel title="発電所の建設" icon={Building}>
        <div className="space-y-2">
          {Object.values(ENERGY_PROJECTS).map((p) => {
            const Icon = PROJECT_ICONS[p.id];
            const mult = p.id === 'renewable' ? fx.renewableCostMult ?? 1 : p.id === 'nuclear' ? fx.nuclearCostMult ?? 1 : 1;
            const cost = (s.econ.gdp * p.costPct * mult) / 100;
            const locked = p.requiresLaw && !fx.nuclearAllowed;
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-line bg-night/40 p-3">
                <Icon className="h-6 w-6 shrink-0 text-brass" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-bold text-ink">{p.label}</span>
                    <span className="num text-[11px] text-ink-dim">
                      容量+{p.capacity} / {fmtTrillion(cost)} / {p.months}ヶ月
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-faint">{p.desc}</p>
                  {locked && <p className="text-[11px] text-amber-300">「原子力推進法」の成立が必要</p>}
                </div>
                <Button size="sm" disabled={locked || s.politics.capital < 5} onClick={() => dispatch({ type: 'BUILD_ENERGY', kind: p.id })}>
                  建設
                </Button>
              </div>
            );
          })}
        </div>
        {s.energy.projects.length > 0 && (
          <div className="mt-3 border-t border-line pt-2">
            <div className="label mb-1">建設中</div>
            {s.energy.projects.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{ENERGY_PROJECTS[p.type].label}</span>
                <span className="num text-ink-dim">あと{p.monthsLeft}ヶ月</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] text-ink-faint">建設には政治資本5を使う。費用は国庫から支払われ、足りなければ国債で賄う。</p>
      </Panel>
    </div>
  );
}

function FiscalTab({ s }) {
  const lm = s.econ.lastMonth;
  const rows = (obj, labels) =>
    Object.entries(obj)
      .filter(([, v]) => v > 0.0005)
      .sort((a, b) => b[1] - a[1]);
  const maxR = Math.max(...Object.values(lm.revenueBreakdown));
  const maxS = Math.max(...Object.values(lm.spendingBreakdown), lm.interest);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="歳入の内訳（月額）" icon={Banknote}>
        {rows(lm.revenueBreakdown).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-2 py-1 text-sm">
            <span className="text-ink-dim">{REV_LABELS[k] ?? k}</span>
            <Bar value={v} max={maxR} color="#4cb782" />
            <span className="num text-right">{fmtTrillion(v, 2)}</span>
          </div>
        ))}
      </Panel>
      <Panel title="歳出の内訳（月額）" icon={Receipt}>
        {[...rows(lm.spendingBreakdown), ['interest', lm.interest]]
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-2 py-1 text-sm">
              <span className="truncate text-ink-dim" title={SPEND_LABELS[k]}>
                {k === 'interest' ? '国債利払い' : SPEND_LABELS[k] ?? k}
              </span>
              <Bar value={v} max={maxS} color={k === 'interest' ? '#c77dff' : '#e07a5f'} />
              <span className="num text-right">{fmtTrillion(v, 2)}</span>
            </div>
          ))}
      </Panel>
    </div>
  );
}

const TABS = [
  { id: 'budget', label: '税制・予算', icon: Landmark },
  { id: 'monetary', label: '金融・債務', icon: Percent },
  { id: 'energy', label: 'エネルギー', icon: Plug },
  { id: 'fiscal', label: '財政の内訳', icon: Receipt },
];

export default function Economy({ state, derived, dispatch }) {
  const [tab, setTab] = useState('budget');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold tracking-wider">経済・財政</h1>
        <div className="flex flex-wrap gap-1.5">
          <Chip>成長率 {state.econ.growth.toFixed(1)}%</Chip>
          <Chip>潜在成長率 {state.econ.potential.toFixed(1)}%</Chip>
          <Chip>政策金利 {state.econ.policyRate.toFixed(2)}%</Chip>
        </div>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'budget' && <BudgetTab s={state} dispatch={dispatch} />}
      {tab === 'monetary' && <MonetaryTab s={state} d={derived} dispatch={dispatch} />}
      {tab === 'energy' && <EnergyTab s={state} d={derived} dispatch={dispatch} />}
      {tab === 'fiscal' && <FiscalTab s={state} />}
    </div>
  );
}
