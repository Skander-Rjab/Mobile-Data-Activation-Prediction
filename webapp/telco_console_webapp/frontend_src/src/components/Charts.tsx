import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Line, PieChart, Pie, Cell, LabelList,
} from 'recharts';
import { CHART_COLORS } from '../lib/api';

const axisStyle = { fontSize: 11, fill: '#6f7d99', fontFamily: 'JetBrains Mono, monospace' };
const gridStroke = '#223050';

function ThemedTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: '#182238',
        border: '1px solid #2c3c60',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12.5,
        fontFamily: 'Inter, sans-serif',
        color: '#eaf0fb',
        boxShadow: '0 12px 24px -12px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ color: '#a7b3ca', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="mono">{formatter ? formatter(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Bar chart: activation rate (%) by segment, sorted by the caller. */
export function ActivationRateChart({
  data,
  height = 300,
}: {
  data: { segment: string; activation_rate: number; customers: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis dataKey="segment" tick={axisStyle} interval={0} angle={-28} textAnchor="end" height={70} />
        <YAxis tick={axisStyle} tickFormatter={(v) => `${Math.round(v * 100)}%`} width={44} />
        <Tooltip
          content={
            <ThemedTooltip formatter={(v: number, name: string) =>
              name === 'activation_rate' ? `${(v * 100).toFixed(1)}%` : v.toLocaleString()
            } />
          }
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="activation_rate" name="Activation rate" fill={CHART_COLORS.signal} radius={[6, 6, 0, 0]} maxBarSize={46} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Combo chart: customer count (bars) + activation rate (line) across ordered buckets. */
export function BucketComboChart({
  data,
  height = 280,
}: {
  data: { bucket: string; customers: number; activation_rate: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis dataKey="bucket" tick={axisStyle} />
        <YAxis yAxisId="left" tick={axisStyle} width={48} />
        <YAxis yAxisId="right" orientation="right" tick={axisStyle} tickFormatter={(v) => `${Math.round(v * 100)}%`} width={44} />
        <Tooltip
          content={
            <ThemedTooltip formatter={(v: number, name: string) =>
              name === 'Activation rate' ? `${(v * 100).toFixed(1)}%` : v.toLocaleString()
            } />
          }
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar yAxisId="left" dataKey="customers" name="Customers" fill="rgba(53,208,186,0.25)" radius={[6, 6, 0, 0]} maxBarSize={44} />
        <Line yAxisId="right" type="monotone" dataKey="activation_rate" name="Activation rate" stroke={CHART_COLORS.amber} strokeWidth={2.5} dot={{ r: 3.5, fill: CHART_COLORS.amber }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bar chart for feature importance rankings. */
export function ImportanceChart({
  data,
  color = CHART_COLORS.signal,
  height = 340,
}: {
  data: { feature: string; importance: number }[];
  color?: string;
  height?: number;
}) {
  const sorted = [...data].sort((a, b) => a.importance - b.importance);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={gridStroke} />
        <XAxis type="number" tick={axisStyle} hide />
        <YAxis
          type="category"
          dataKey="feature"
          tick={{ ...axisStyle, fontFamily: 'Inter, sans-serif', fontSize: 12 }}
          width={150}
        />
        <Tooltip content={<ThemedTooltip formatter={(v: number) => v.toFixed(3)} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="importance" name="Importance" fill={color} radius={[0, 6, 6, 0]} maxBarSize={16}>
          <LabelList dataKey="importance" position="right" formatter={(v: number) => v.toFixed(0)} style={{ fill: '#6f7d99', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = [CHART_COLORS.signal, CHART_COLORS.violet, CHART_COLORS.coral];

export function VolumeMixDonut({
  mix,
  height = 220,
}: {
  mix: { volume_4g_share: number; volume_3g_share: number; volume_2g_share: number };
  height?: number;
}) {
  const data = [
    { name: '4G', value: mix.volume_4g_share },
    { name: '3G', value: mix.volume_3g_share },
    { name: '2G', value: mix.volume_2g_share },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <ResponsiveContainer width={height} height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={3} strokeWidth={0}>
            {data.map((_, i) => (
              <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ThemedTooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-col gap-12">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-8">
            <span className="badge-dot" style={{ color: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 26 }}>{d.name}</span>
            <span className="mono" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{(d.value * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
