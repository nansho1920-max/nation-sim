import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Panel } from '../ui/kit';
import { POPS } from '../../game/data/pops';

const GROUPS = [
  { id: 'gdp', label: 'GDP', series: [{ key: 'gdp', label: 'GDP（兆）', color: '#d4a24c' }] },
  { id: 'growth', label: '成長・物価・雇用', series: [{ key: 'growth', label: '成長率', color: '#4cb782' }, { key: 'inflation', label: 'インフレ率', color: '#e07a5f' }, { key: 'unemployment', label: '失業率', color: '#4f9fd6' }], zero: true, unit: '%' },
  { id: 'fiscal', label: '財政', series: [{ key: 'debtRatio', label: '債務GDP比', color: '#c77dff' }], unit: '%' },
  { id: 'rates', label: '金利', series: [{ key: 'policyRate', label: '政策金利', color: '#d4a24c' }, { key: 'bondYield', label: '国債利回り', color: '#e05252' }], unit: '%' },
  { id: 'approval', label: '支持率', series: [{ key: 'approval', label: '支持率', color: '#4cb782' }], unit: '%', domain: [0, 100] },
  { id: 'pops', label: '人口集団', series: POPS.map((p, i) => ({ key: `pops.${p.id}`, label: p.name, color: ['#e07a5f', '#d4a24c', '#7d9a4a', '#4f9fd6', '#c77dff', '#e07a9a'][i] })), domain: [0, 100] },
  { id: 'parties', label: '政党支持率', series: [], unit: '%' },
  { id: 'society', label: '社会指標', series: [{ key: 'education', label: '教育', color: '#4f9fd6' }, { key: 'health', label: '健康', color: '#e07a9a' }, { key: 'corruption', label: '汚職', color: '#c77dff' }, { key: 'tension', label: '緊張', color: '#e05252' }], domain: [0, 100] },
  { id: 'environment', label: '環境', series: [{ key: 'environment', label: '環境指数', color: '#3fae6a' }, { key: 'renewableShare', label: '再エネ比率', color: '#7cc3a0' }, { key: 'co2', label: 'CO₂', color: '#a0663c' }] },
  { id: 'population', label: '人口', series: [{ key: 'population', label: '人口（万人）', color: '#7cc3a0' }] },
];

const get = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);

export default function Stats({ state: s }) {
  const [group, setGroup] = useState('gdp');
  const base = GROUPS.find((x) => x.id === group);
  const g = useMemo(
    () => (base.id === 'parties' ? { ...base, series: s.parties.map((p) => ({ key: `support.${p.id}`, label: p.name, color: p.color })) } : base),
    [base, s.parties],
  );
  const data = useMemo(
    () =>
      s.history.map((h) => {
        const row = { label: `${h.y}/${String(h.m).padStart(2, '0')}` };
        for (const ser of g.series) row[ser.key] = Number((get(h, ser.key) ?? 0).toFixed(2));
        return row;
      }),
    [s.history, g],
  );
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl font-bold tracking-wider">統計</h1>
      <div className="flex flex-wrap gap-1">
        {GROUPS.map((x) => (
          <button key={x.id} onClick={() => setGroup(x.id)} className={`rounded-full border px-3 py-1 text-xs ${group === x.id ? 'border-brass bg-brass/15 text-brass-light' : 'border-line text-ink-dim hover:text-ink'}`}>
            {x.label}
          </button>
        ))}
      </div>
      <Panel title={g.label} bodyClass="p-2 sm:p-4">
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="#202b40" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: '#9aa3b6', fontSize: 11 }} stroke="#2e3b55" minTickGap={24} />
              <YAxis tick={{ fill: '#9aa3b6', fontSize: 11 }} stroke="#2e3b55" domain={g.domain ?? ['auto', 'auto']} unit={g.unit} width={52} />
              {g.zero && <ReferenceLine y={0} stroke="#5f6a82" />}
              <Tooltip contentStyle={{ background: '#0f1524', border: '1px solid #2e3b55', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#ecc77e' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {g.series.map((ser) => (
                <Line key={ser.key} type="monotone" dataKey={ser.key} name={ser.label} stroke={ser.color} strokeWidth={2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
