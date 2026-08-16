export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fmtTnd(v: number, decimals = 2): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function fmtPct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`;
}

export function fmtInt(v: number): string {
  return v.toLocaleString('en-US');
}

export const CHART_COLORS = {
  signal: '#35d0ba',
  amber: '#f5a524',
  coral: '#ff6b6b',
  violet: '#8b7cf6',
  muted: '#6f7d99',
};

export const CHART_SERIES = ['#35d0ba', '#f5a524', '#8b7cf6', '#ff6b6b', '#4f9df7', '#e6cf5e'];
