import React from 'react';

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaTone,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      {delta ? <div className={`stat-delta ${deltaTone ?? ''}`}>{delta}</div> : null}
    </div>
  );
}

export function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="section-title">{title}</h2>
      {sub ? <p className="section-sub">{sub}</p> : null}
    </div>
  );
}

export function Skeleton({ height = 220 }: { height?: number }) {
  return <div className="skeleton" style={{ height, width: '100%' }} />;
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div
      className="card card-pad"
      style={{ borderColor: 'rgba(255,107,107,0.35)', color: 'var(--text-secondary)' }}
    >
      <strong style={{ color: 'var(--coral)' }}>Couldn't load this.</strong> {message}
    </div>
  );
}
