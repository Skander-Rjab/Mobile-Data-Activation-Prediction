import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiGet, apiPost, fmtPct, fmtTnd } from '../lib/api';
import type { FormSchemaResponse, FeatureSchemaField, PredictionResult, Customer } from '../lib/types';
import { Skeleton, ErrorNote } from '../components/Common';
import { SignalMark } from '../components/SignalMark';

function getQueryParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

export default function PredictTool() {
  const [schema, setSchema] = useState<FormSchemaResponse | null>(null);
  const [values, setValues] = useState<Record<string, number | string>>({});
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceCustomer, setSourceCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    apiGet<FormSchemaResponse>('/api/models/form-schema/').then((s) => {
      setSchema(s);
      const initial: Record<string, number | string> = {};
      s.curated_fields.forEach((f) => { initial[f.name] = f.default; });
      setValues(initial);

      const customerId = getQueryParam('customer');
      if (customerId) {
        loadCustomer(customerId, initial);
      }
    }).catch((e) => setError(String(e)));
  }, []);

  const loadCustomer = (codeContrat: string, currentDefaults: Record<string, number | string>) => {
    apiGet<Customer & { features: Record<string, unknown> }>(`/api/customers/${codeContrat}/`).then((c) => {
      setSourceCustomer(c);
      const next = { ...currentDefaults };
      Object.keys(next).forEach((k) => {
        if (c.features && k in c.features) next[k] = c.features[k] as number | string;
      });
      setValues(next);
    }).catch(() => {});
  };

  const runPrediction = useCallback((vals: Record<string, number | string>) => {
    setLoading(true);
    setError(null);
    apiPost<PredictionResult>('/api/models/predict/', vals)
      .then(setResult)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Debounced live prediction whenever inputs change.
  useEffect(() => {
    if (!schema || Object.keys(values).length === 0) return;
    const t = setTimeout(() => runPrediction(values), 350);
    return () => clearTimeout(t);
  }, [values, schema, runPrediction]);

  const surpriseMe = () => {
    setSourceCustomer(null);
    apiGet<Customer & { features: Record<string, unknown> }>('/api/customers/random/').then((c) => {
      setSourceCustomer(c);
      const next = { ...values };
      Object.keys(next).forEach((k) => {
        if (c.features && k in c.features) next[k] = c.features[k] as number | string;
      });
      setValues(next);
      window.history.replaceState(null, '', `/predict/?customer=${c.code_contrat}`);
    });
  };

  const resetDefaults = () => {
    if (!schema) return;
    const initial: Record<string, number | string> = {};
    schema.curated_fields.forEach((f) => { initial[f.name] = f.default; });
    setValues(initial);
    setSourceCustomer(null);
    window.history.replaceState(null, '', '/predict/');
  };

  if (error && !schema) return <ErrorNote message={error} />;
  if (!schema) return <Skeleton height={480} />;

  return (
    <div className="predict-grid">
      <div className="card card-pad">
        <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
          <span className="eyebrow" style={{ marginBottom: 0 }}>Build a customer</span>
          <div className="flex gap-8">
            <button className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={surpriseMe}>🎲 Surprise me</button>
            <button className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={resetDefaults}>Reset</button>
          </div>
        </div>

        {sourceCustomer && (
          <div className="source-banner">
            Loaded real customer <strong className="mono">{sourceCustomer.code_contrat}</strong> — adjust any field below to see predictions update live.
          </div>
        )}

        <div className="flex-col gap-16" style={{ marginTop: 18 }}>
          {schema.curated_fields.map((f) => (
            <FieldControl
              key={f.name}
              field={f}
              value={values[f.name]}
              onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
            />
          ))}
        </div>
      </div>

      <div className="flex-col gap-16">
        <ResultPanel result={result} loading={loading} actual={sourceCustomer?.target_next_month} />
      </div>
    </div>
  );
}

function FieldControl({
  field, value, onChange,
}: { field: FeatureSchemaField; value: number | string | undefined; onChange: (v: number | string) => void }) {
  const niceLabel = field.name
    .replace(/_/g, ' ')
    .replace(/\bmnt\b/i, 'amount')
    .replace(/\banc\b/i, 'tenure');

  if (field.type === 'categorical') {
    return (
      <div className="field">
        <label>{niceLabel}</label>
        <select value={String(value ?? field.default)} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (field.name === 'is_data_user_now') {
    const checked = Number(value ?? 0) === 1;
    return (
      <div className="field">
        <label>Currently a data user</label>
        <button
          className={`btn ${checked ? 'btn-primary' : 'btn-ghost'} btn-block`}
          onClick={() => onChange(checked ? 0 : 1)}
        >
          {checked ? 'Yes — has an active data package' : 'No — no active data package'}
        </button>
      </div>
    );
  }

  const min = field.min ?? 0;
  const max = field.max ?? 100;
  return (
    <div className="field">
      <label>
        {niceLabel}
        <span className="field-value">{Number(value ?? field.default).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={(max - min) / 100 || 1}
        value={Number(value ?? field.default)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function ResultPanel({
  result, loading, actual,
}: { result: PredictionResult | null; loading: boolean; actual?: number }) {
  return (
    <>
      <div className={`card card-pad result-hero ${loading ? 'loading' : ''}`}>
        <div className="eyebrow">
          <SignalMark pulse={loading} size={12} /> Live prediction
        </div>
        {!result ? (
          <Skeleton height={140} />
        ) : (
          <>
            <div className="result-big">
              <span className="result-value">{fmtTnd(result.consensus.average_expected_amount, 2)}</span>
              <span className="result-unit">TND expected next month</span>
            </div>
            <div className={`chip ${result.consensus.likely_to_activate ? 'signal' : 'coral'}`} style={{ marginTop: 10 }}>
              {result.consensus.likely_to_activate ? 'Likely to activate' : 'Unlikely to activate'}
            </div>
            {actual !== undefined && (
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: 14 }}>
                Actual recorded value for this customer: <span className="mono text-primary">{fmtTnd(actual, 2)} TND</span>
              </div>
            )}
          </>
        )}
      </div>

      {result && (
        <div className="grid-2" style={{ gap: 16 }}>
          <div className="card card-pad model-result">
            <div className="chip signal">Model 1 · Tweedie</div>
            <div className="result-medium">{fmtTnd(result.model1_tweedie.predicted_amount, 2)} <span className="unit">TND</span></div>
            <p className="text-muted" style={{ fontSize: 12.5 }}>Single blended expected amount.</p>
          </div>
          <div className="card card-pad model-result">
            <div className="chip" style={{ color: '#8b7cf6', borderColor: 'rgba(139,124,246,0.35)', background: 'rgba(139,124,246,0.12)' }}>Model 2 · Hurdle</div>
            <div className="result-medium">{fmtTnd(result.model2_hurdle.expected_amount, 2)} <span className="unit">TND</span></div>
            <p className="text-muted" style={{ fontSize: 12.5 }}>
              {fmtPct(result.model2_hurdle.activation_probability)} activation probability × {fmtTnd(result.model2_hurdle.predicted_amount_if_active, 2)} TND if active
            </p>
          </div>
        </div>
      )}

      <div className="card card-pad" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        Both models run live against the exact pipelines saved from training — same preprocessing,
        same feature engineering, no drift between what was trained and what's serving this prediction.
      </div>
    </>
  );
}
