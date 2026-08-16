import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiGet } from '../lib/api';
import type { Customer, CustomerListResponse } from '../lib/types';
import { fmtPct, fmtTnd } from '../lib/api';
import { Skeleton } from '../components/Common';

interface Facets {
  regions: string[];
  handsets: string[];
  statuts: string[];
  offers: string[];
}

const PAGE_SIZE = 25;

export default function DataExplorer() {
  const [facets, setFacets] = useState<Facets | null>(null);
  const [region, setRegion] = useState('');
  const [handset, setHandset] = useState('');
  const [statut, setStatut] = useState('');
  const [willActivate, setWillActivate] = useState('');
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('-arpu');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Customer | null>(null);

  useEffect(() => {
    apiGet<Facets>('/api/customers/facets/').then(setFacets).catch(() => {});
  }, []);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(PAGE_SIZE));
    params.set('ordering', ordering);
    if (region) params.set('region', region);
    if (handset) params.set('handset', handset);
    if (statut) params.set('statut', statut);
    if (willActivate) params.set('will_activate', willActivate);
    if (search) params.set('search', search);
    return `/api/customers/?${params.toString()}`;
  }, [page, ordering, region, handset, statut, willActivate, search]);

  useEffect(() => {
    setLoading(true);
    const url = buildUrl();
    apiGet<CustomerListResponse>(url)
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [buildUrl]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => { setPage(1); }, [region, handset, statut, willActivate, search, ordering]);

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  const columns: { key: keyof Customer; label: string; align?: 'right' }[] = [
    { key: 'code_contrat', label: 'Customer' },
    { key: 'region', label: 'Region' },
    { key: 'handset', label: 'Device' },
    { key: 'offre', label: 'Offer' },
    { key: 'anc_m', label: 'Tenure (mo)', align: 'right' },
    { key: 'arpu', label: 'ARPU', align: 'right' },
    { key: 'mnt_forfait_data', label: 'Data now', align: 'right' },
    { key: 'target_next_month', label: 'Predicted next mo.', align: 'right' },
  ];

  const sortKeyFor = (col: string) => (ordering.replace('-', '') === col ? ordering : col);

  return (
    <div>
      <div className="filter-bar card card-pad">
        <input
          type="search"
          placeholder="Search by customer ID (e.g. SN_20969210)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <Select label="Region" value={region} onChange={setRegion} options={facets?.regions ?? []} />
        <Select label="Device" value={handset} onChange={setHandset} options={facets?.handsets ?? []} />
        <Select label="Status" value={statut} onChange={setStatut} options={facets?.statuts ?? []} />
        <Select
          label="Next month"
          value={willActivate}
          onChange={setWillActivate}
          options={[]}
          customOptions={[
            { value: 'true', label: 'Will activate' },
            { value: 'false', label: "Won't activate" },
          ]}
        />
        {(region || handset || statut || willActivate || search) && (
          <button
            className="btn btn-ghost"
            style={{ padding: '9px 16px', fontSize: 12.5 }}
            onClick={() => { setRegion(''); setHandset(''); setStatut(''); setWillActivate(''); setSearch(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex justify-between items-center" style={{ margin: '18px 0 10px' }}>
        <span className="text-muted mono" style={{ fontSize: 12.5 }}>
          {data ? `${data.count.toLocaleString()} customers match` : 'Loading…'}
        </span>
        <span className="text-muted mono" style={{ fontSize: 12.5 }}>
          Page {page} / {totalPages || 1}
        </span>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading && !data ? (
          <div className="card-pad"><Skeleton height={420} /></div>
        ) : (
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => setOrdering((prev) => (prev === c.key ? `-${c.key}` : sortKeyFor(c.key)))}
                    style={{ textAlign: c.align ?? 'left', cursor: 'pointer' }}
                  >
                    {c.label}
                    {ordering.replace('-', '') === c.key && (ordering.startsWith('-') ? ' ↓' : ' ↑')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.results.map((c) => (
                <tr key={c.id} onClick={() => setSelected(c)} className="row-clickable">
                  <td className="mono">{c.code_contrat}</td>
                  <td>{c.region}</td>
                  <td><DeviceChip handset={c.handset} /></td>
                  <td className="truncate">{c.offre}</td>
                  <td align="right" className="mono">{c.anc_m}</td>
                  <td align="right" className="mono">{fmtTnd(c.arpu, 2)}</td>
                  <td align="right" className="mono">{fmtTnd(c.mnt_forfait_data, 2)}</td>
                  <td align="right" className="mono">
                    <span className={c.will_activate ? 'text-signal' : 'text-muted'}>
                      {fmtTnd(c.target_next_month, 2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-between items-center" style={{ marginTop: 16 }}>
        <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
        <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
      </div>

      {selected && <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Select({
  label, value, onChange, options, customOptions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  customOptions?: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label}: All</option>
      {(customOptions ?? options.map((o) => ({ value: o, label: o }))).map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function DeviceChip({ handset }: { handset: string }) {
  const tone = handset === '4G' ? 'signal' : handset === '3G' ? 'amber' : 'coral';
  return <span className={`chip ${tone}`}>{handset}</span>;
}

function CustomerDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer card" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
          <span className="eyebrow" style={{ marginBottom: 0 }}>Customer profile</span>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={onClose}>Close</button>
        </div>
        <h3 className="mono" style={{ fontSize: 22, marginTop: 6 }}>{customer.code_contrat}</h3>
        <div className="stat-grid" style={{ marginTop: 20 }}>
          <MiniField label="Region" value={customer.region} />
          <MiniField label="Device" value={customer.handset} />
          <MiniField label="Offer" value={customer.offre} />
          <MiniField label="Channel" value={customer.canal_de_vente} />
          <MiniField label="Tenure" value={`${customer.anc_m} mo`} />
          <MiniField label="ARPU" value={`${fmtTnd(customer.arpu)} TND`} />
          <MiniField label="Data package now" value={`${fmtTnd(customer.mnt_forfait_data)} TND`} />
          <MiniField
            label="Predicted next month"
            value={`${fmtTnd(customer.target_next_month)} TND`}
            highlight={customer.will_activate}
          />
        </div>
        <a href={`/predict/?customer=${customer.code_contrat}`} className="btn btn-primary btn-block" style={{ marginTop: 24 }}>
          Run live prediction for this customer
        </a>
      </div>
    </div>
  );
}

function MiniField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div className={highlight ? 'text-signal' : ''} style={{ fontSize: 15, marginTop: 4, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
