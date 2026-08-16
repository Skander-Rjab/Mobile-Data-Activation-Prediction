import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, YAxis,
} from 'recharts';
import { apiGet, fmtInt, fmtPct, fmtTnd, CHART_COLORS } from '../lib/api';
import type { AnalyticsBundle } from '../lib/types';
import { StatCard, Skeleton } from '../components/Common';
import { SignalMark } from '../components/SignalMark';

// Illustrative usage curve built from the real ARPU-bucket activation rates
// (monotonic relationship confirmed in the data), used purely for the
// hero's ambient chart -- not a forecast.
function buildPulseSeries(bundle: AnalyticsBundle) {
  return bundle.arpu_distribution.map((b) => ({
    name: b.bucket,
    rate: Math.round(b.activation_rate * 1000) / 10,
  }));
}

export default function HomeHero() {
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<AnalyticsBundle>('/api/analytics/bundle/').then(setBundle).catch((e) => setError(String(e)));
  }, []);

  return (
    <section className="hero">
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">
            <SignalMark pulse size={13} /> MNT_FORFAIT_DATA forecasting console
          </div>
          <h1>
            Who activates data<br />next month — <span className="text-signal">before it happens.</span>
          </h1>
          <p className="hero-lede">
            Two independently trained models score every prepaid customer against next month's
            data-package activation, built on {bundle ? fmtInt(bundle.kpis.total_customers) : '30,000'} real
            accounts across usage, revenue, recharge, and device signals.
          </p>
          <div className="hero-ctas">
            <a href="/predict/" className="btn btn-primary">Run a live prediction</a>
            <a href="/analysis/" className="btn btn-ghost">Explore the analysis</a>
          </div>
        </div>

        <div className="hero-panel card card-pad">
          {error && <div className="text-coral" style={{ fontSize: 13 }}>{error}</div>}
          {!bundle && !error && <Skeleton height={230} />}
          {bundle && (
            <>
              <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                <span className="eyebrow" style={{ marginBottom: 0 }}>Activation rate by ARPU tier</span>
                <span className="chip signal">{fmtPct(bundle.kpis.activation_rate)} overall</span>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={buildPulseSeries(bundle)} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.signal} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={CHART_COLORS.signal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: '#6f7d99', fontFamily: 'JetBrains Mono, monospace' }} />
                  <YAxis hide domain={[0, 90]} />
                  <Tooltip
                    contentStyle={{ background: '#182238', border: '1px solid #2c3c60', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: '#a7b3ca' }}
                    formatter={(v: number) => [`${v}%`, 'Activation rate']}
                  />
                  <Area type="monotone" dataKey="rate" stroke={CHART_COLORS.signal} strokeWidth={2.5} fill="url(#pulseFill)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="stat-grid" style={{ marginTop: 18, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <MiniStat label="Avg ARPU" value={fmtTnd(bundle.kpis.avg_arpu, 1)} unit="TND" />
                <MiniStat label="Data users now" value={fmtPct(bundle.kpis.current_data_user_rate, 0)} />
                <MiniStat label="Avg tenure" value={`${bundle.kpis.avg_tenure_months.toFixed(0)}`} unit="mo" />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 19, fontWeight: 600, marginTop: 3 }}>
        {value}
        {unit && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 3 }}>{unit}</span>}
      </div>
    </div>
  );
}

export function HomeKpiStrip() {
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  useEffect(() => {
    apiGet<AnalyticsBundle>('/api/analytics/bundle/').then(setBundle).catch(() => {});
  }, []);
  if (!bundle) {
    return (
      <div className="stat-grid">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={92} />)}
      </div>
    );
  }
  const k = bundle.kpis;
  return (
    <div className="stat-grid">
      <StatCard label="Customers scored" value={fmtInt(k.total_customers)} />
      <StatCard label="Predicted to activate" value={fmtPct(k.activation_rate)} delta="next month" deltaTone="up" />
      <StatCard label="Avg spend, activators" value={fmtTnd(k.avg_spend_among_activators, 2)} unit="TND" />
      <StatCard label="Projected data revenue" value={fmtInt(Math.round(k.total_projected_data_revenue))} unit="TND" delta="across full base, next month" />
    </div>
  );
}
