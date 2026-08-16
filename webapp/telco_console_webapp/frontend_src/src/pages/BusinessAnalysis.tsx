import React, { useEffect, useState } from 'react';
import { apiGet, fmtInt, fmtPct, fmtTnd } from '../lib/api';
import type { AnalyticsBundle } from '../lib/types';
import { StatCard, SectionHeading, Skeleton, ErrorNote } from '../components/Common';
import { ActivationRateChart, BucketComboChart, VolumeMixDonut } from '../components/Charts';

export default function BusinessAnalysis() {
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<AnalyticsBundle>('/api/analytics/bundle/').then(setBundle).catch((e) => setError(String(e)));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!bundle) {
    return (
      <div className="flex-col gap-24">
        <Skeleton height={110} />
        <Skeleton height={320} />
      </div>
    );
  }

  const k = bundle.kpis;
  const topRegionsByRate = [...bundle.by_region].sort((a, b) => b.activation_rate - a.activation_rate).slice(0, 10);
  const topOffersByVolume = bundle.by_offer.slice(0, 8);

  return (
    <div className="flex-col gap-24">
      <div className="stat-grid">
        <StatCard label="Overall activation rate" value={fmtPct(k.activation_rate)} delta="of 30,000 customers, next month" />
        <StatCard label="Avg ARPU" value={fmtTnd(k.avg_arpu, 2)} unit="TND" />
        <StatCard label="Avg spend among activators" value={fmtTnd(k.avg_spend_among_activators, 2)} unit="TND" />
        <StatCard label="Avg evaporation score" value={k.avg_evaporation.toFixed(3)} delta="churn-risk indicator, 0\u20131" />
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <SectionHeading title="Activation rate by device generation" sub="A 2G handset technically can't run most data packages \u2014 this shows up directly in the numbers." />
          <ActivationRateChart data={bundle.by_handset} height={260} />
        </div>
        <div className="card card-pad">
          <SectionHeading title="ARPU tier vs. activation" sub="Higher-value customers are dramatically more likely to activate data next month \u2014 15% at the lowest ARPU tier, 82% at the highest." />
          <BucketComboChart data={bundle.arpu_distribution} height={260} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <SectionHeading title="Top 10 regions by activation rate" />
          <ActivationRateChart data={topRegionsByRate} height={300} />
        </div>
        <div className="card card-pad">
          <SectionHeading title="Data volume mix by generation" sub="Share of total session data volume carried on each network generation." />
          <VolumeMixDonut mix={bundle.volume_mix} height={200} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <SectionHeading title="Tenure vs. activation" sub="Loyalty barely moves the needle \u2014 activation rate is roughly flat from 6 months to 8 years." />
          <BucketComboChart data={bundle.tenure_distribution} height={260} />
        </div>
        <div className="card card-pad">
          <SectionHeading title="Top offers by subscriber count" sub="Activation rate for the most-subscribed plans." />
          <ActivationRateChart data={topOffersByVolume} height={260} />
        </div>
      </div>

      <div className="card card-pad">
        <SectionHeading title="Traffic status (STATUT_RGS90) is one of the strongest single signals" />
        <div className="grid-2" style={{ marginTop: 8 }}>
          {bundle.by_statut_rgs90.map((row) => (
            <div key={row.segment} className="stat-card">
              <div className="stat-label">STATUT_RGS90 = {row.segment}</div>
              <div className="stat-value">
                {fmtPct(row.activation_rate)}
                <span className="unit">activation rate</span>
              </div>
              <div className="stat-delta">{fmtInt(row.customers)} customers &middot; avg next month {fmtTnd(row.avg_next_month)} TND</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
