import React, { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import type { ModelComparisonResponse, ModelInfo } from '../lib/types';
import { SectionHeading, Skeleton, ErrorNote } from '../components/Common';
import { ImportanceChart } from '../components/Charts';
import { CHART_COLORS } from '../lib/api';

export default function ModelsShowcase() {
  const [data, setData] = useState<ModelComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ModelComparisonResponse>('/api/models/comparison/').then(setData).catch((e) => setError(String(e)));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Skeleton height={500} />;

  return (
    <div className="flex-col gap-24">
      <div className="grid-2">
        <ModelCard model={data.model1} accent={CHART_COLORS.signal} />
        <ModelCard model={data.model2} accent={CHART_COLORS.violet} />
      </div>

      <div className="card card-pad">
        <SectionHeading title="Head-to-head on held-out test data" sub="6,000 customers the models never saw during training." />
        <div style={{ overflowX: 'auto' }}>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th align="right">Model 1 · Tweedie LightGBM</th>
                <th align="right">Model 2 · Hurdle (Random Forest)</th>
                <th align="right">Baseline: carry-forward</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow label="RMSE" a={data.model1.metrics.rmse} b={data.model2.metrics.rmse} base={data.baselines.carry_forward_current_month.rmse} lowerBetter />
              <MetricRow label="RMSE (excl. top 1% outliers)" a={data.model1.metrics.rmse_excl_top1pct} b={data.model2.metrics.rmse_excl_top1pct} lowerBetter />
              <MetricRow label="MAE" a={data.model1.metrics.mae} b={data.model2.metrics.mae} base={data.baselines.carry_forward_current_month.mae} lowerBetter />
              <MetricRow label="R²" a={data.model1.metrics.r2} b={data.model2.metrics.r2} decimals={3} />
            </tbody>
          </table>
        </div>
        {data.model2.classifier_metrics && (
          <div style={{ marginTop: 24 }}>
            <div className="eyebrow">Model 2 · Stage 1 classifier only</div>
            <div className="stat-grid">
              <MiniStat label="AUC" value={data.model2.classifier_metrics.auc.toFixed(3)} />
              <MiniStat label="F1" value={data.model2.classifier_metrics.f1.toFixed(3)} />
              <MiniStat label="Precision" value={data.model2.classifier_metrics.precision.toFixed(3)} />
              <MiniStat label="Recall" value={data.model2.classifier_metrics.recall.toFixed(3)} />
            </div>
          </div>
        )}
      </div>

      <div className="grid-3">
        <div className="card card-pad">
          <SectionHeading title="Model 1 feature importance" sub="Tweedie LightGBM, top 12" />
          <ImportanceChart data={data.feature_importance.model1_tweedie} color={CHART_COLORS.signal} />
        </div>
        <div className="card card-pad">
          <SectionHeading title="Model 2 · classifier" sub="Which features predict activation at all" />
          <ImportanceChart data={data.feature_importance.model2_classifier} color={CHART_COLORS.violet} />
        </div>
        <div className="card card-pad">
          <SectionHeading title="Model 2 · regressor" sub="Which features predict the amount, given activation" />
          <ImportanceChart data={data.feature_importance.model2_regressor} color={CHART_COLORS.amber} />
        </div>
      </div>
    </div>
  );
}

function ModelCard({ model, accent }: { model: ModelInfo; accent: string }) {
  return (
    <div className="card card-pad model-card" style={{ borderTopColor: accent }}>
      <div className="chip" style={{ color: accent, borderColor: accent + '55' }}>{model.algorithm_family}</div>
      <h3 style={{ fontSize: 21, marginTop: 12 }}>{model.name}</h3>
      <p className="text-muted" style={{ fontSize: 13.5, marginTop: 6 }}>{model.subtitle}</p>

      <div className="stat-grid" style={{ marginTop: 20 }}>
        <MiniStat label="RMSE" value={model.metrics.rmse.toFixed(2)} />
        <MiniStat label="MAE" value={model.metrics.mae.toFixed(2)} />
        <MiniStat label="R²" value={model.metrics.r2.toFixed(3)} />
        <MiniStat label="RMSE excl. outliers" value={model.metrics.rmse_excl_top1pct.toFixed(2)} />
      </div>

      <div className="grid-2" style={{ marginTop: 20, gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ color: accent }}>Strengths</div>
          <ul className="plain-list">
            {model.strengths.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <div>
          <div className="eyebrow" style={{ color: 'var(--text-muted)' }}>Trade-offs</div>
          <ul className="plain-list muted">
            {model.weaknesses.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 19, fontWeight: 600, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function MetricRow({
  label, a, b, base, lowerBetter, decimals = 2,
}: { label: string; a: number; b: number; base?: number; lowerBetter?: boolean; decimals?: number }) {
  const aBetter = lowerBetter ? a < b : a > b;
  return (
    <tr>
      <td>{label}</td>
      <td align="right" className={`mono ${aBetter ? 'text-signal' : ''}`}>{a.toFixed(decimals)}</td>
      <td align="right" className={`mono ${!aBetter ? 'text-signal' : ''}`}>{b.toFixed(decimals)}</td>
      <td align="right" className="mono text-muted">{base !== undefined ? base.toFixed(decimals) : '—'}</td>
    </tr>
  );
}
