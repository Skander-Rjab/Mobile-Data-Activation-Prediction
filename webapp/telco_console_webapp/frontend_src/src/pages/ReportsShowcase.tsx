import React, { useEffect, useState } from 'react';
import { apiGet, fmtInt, fmtPct, fmtTnd } from '../lib/api';
import type { ReportConfigResponse } from '../lib/types';
import { StatCard, SectionHeading, Skeleton, ErrorNote } from '../components/Common';
import { ActivationRateChart, BucketComboChart, VolumeMixDonut } from '../components/Charts';

export default function ReportsShowcase() {
  const [config, setConfig] = useState<ReportConfigResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ReportConfigResponse>('/api/reports/config/').then(setConfig).catch((e) => setError(String(e)));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!config) return <Skeleton height={480} />;

  return (
    <div className="flex-col gap-24">
      {config.embed_url ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="embed-notice" style={{ margin: 16, marginBottom: 0 }}>
            <span className="chip signal">Live Power BI report</span>
            <span className="text-muted" style={{ fontSize: 13 }}>
              Both report pages are navigable via the tabs inside the embed below. This is a secure
              embed — viewers need to be signed into a Power BI account with access to this report;
              otherwise you'll see a Microsoft sign-in prompt inside the frame.
            </span>
          </div>
          <div className="pbi-frame-wrap">
            <iframe
              title={config.title}
              src={config.embed_url}
              className="pbi-frame"
              frameBorder={0}
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        <div className="embed-notice">
          <span className="chip amber">No embed URL configured</span>
          <span className="text-muted" style={{ fontSize: 13 }}>
            Set <code className="mono">POWERBI_EMBED_URL</code> in settings to show the real report here.
          </span>
        </div>
      )}

      <div>
        <SectionHeading
          title="Same data, rendered natively"
          sub="Always available — no Power BI sign-in required. Built from the same live aggregates as the report above."
        />
        <NativeDashboard data={config.native} />
      </div>
    </div>
  );
}

function NativeDashboard({ data }: { data: ReportConfigResponse['native'] }) {
  const k = data.kpis;
  const topRegions = [...data.by_region].sort((a, b) => b.activation_rate - a.activation_rate).slice(0, 10);

  return (
    <div className="flex-col gap-24">
      <div className="stat-grid">
        <StatCard label="Total customers" value={fmtInt(k.total_customers)} />
        <StatCard label="Current data users" value={fmtPct(k.current_data_user_rate)} />
        <StatCard label="Avg ARPU" value={fmtTnd(k.avg_arpu, 2)} unit="TND" />
        <StatCard label="Avg tenure" value={k.avg_tenure_months.toFixed(0)} unit="months" />
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>Activation rate by device</div>
          <ActivationRateChart data={data.by_handset} height={240} />
        </div>
        <div className="card card-pad">
          <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>Data volume mix</div>
          <VolumeMixDonut mix={data.volume_mix} height={190} />
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>ARPU distribution & activation</div>
        <BucketComboChart data={data.arpu_distribution} height={260} />
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>Top regions by activation rate</div>
          <ActivationRateChart data={topRegions} height={280} />
        </div>
        <div className="card card-pad">
          <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>Top offers by subscriber count</div>
          <ActivationRateChart data={data.by_offer.slice(0, 8)} height={280} />
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>Tenure vs. activation</div>
        <BucketComboChart data={data.tenure_distribution} height={260} />
      </div>

      <div className="stat-grid">
        {data.by_statut_rgs90.map((row) => (
          <StatCard
            key={row.segment}
            label={`STATUT_RGS90 = ${row.segment}`}
            value={fmtPct(row.activation_rate)}
            delta={`${fmtInt(row.customers)} customers`}
          />
        ))}
      </div>
    </div>
  );
}
