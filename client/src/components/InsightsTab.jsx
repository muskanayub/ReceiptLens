import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api.js';
import { currentMonth, money, monthLabel } from '../lib/format.js';

export default function InsightsTab({ version }) {
  const [month, setMonth] = useState(currentMonth());
  const [currency, setCurrency] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = new URLSearchParams({ month });
    if (currency) p.set('currency', currency);
    api.get(`/stats?${p}`)
      .then((d) => { setStats(d); setError(''); })
      .catch((e) => setError(e.message));
  }, [month, currency, version]);

  const cur = stats?.currency || 'INR';
  const compact = (v) => new Intl.NumberFormat(undefined, { notation: 'compact' }).format(v);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-3xl font-bold tracking-tight">Insights</h1>
        {stats?.currencies?.length > 1 && (
          <label className="text-sm font-medium">
            <span className="sr-only">Currency</span>
            <select className="rounded-md border border-line bg-surface px-3 py-2 text-sm" value={stats.currency} onChange={(e) => setCurrency(e.target.value)}>
              {stats.currencies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        )}
        <label className="text-sm font-medium">
          <span className="sr-only">Month</span>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="rounded-md border border-line bg-surface px-3 py-2 text-sm" />
        </label>
      </div>

      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
      {!stats && !error && <p className="mt-6 text-ink-soft" role="status">Loading…</p>}

      {stats && (
        <>
          <dl className="mt-6 grid grid-cols-3 divide-x divide-line border-y border-line">
            <div className="px-4 py-5 first:pl-0">
              <dd className="font-mono text-2xl font-medium sm:text-3xl">{money(stats.total, cur)}</dd>
              <dt className="mt-1 text-sm text-ink-soft">Spent this month</dt>
            </div>
            <div className="px-4 py-5">
              <dd className="font-mono text-2xl font-medium sm:text-3xl">{stats.count}</dd>
              <dt className="mt-1 text-sm text-ink-soft">Receipts</dt>
            </div>
            <div className="px-4 py-5">
              <dd className="font-mono text-2xl font-medium sm:text-3xl">{money(stats.average, cur)}</dd>
              <dt className="mt-1 text-sm text-ink-soft">Average receipt</dt>
            </div>
          </dl>

          {stats.count === 0 && <p className="mt-6 text-ink-soft">No receipts in this month. Pick another month or scan a receipt.</p>}

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="text-lg font-semibold">By category</h2>
              {stats.byCategory.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">Nothing to show for this month.</p>
              ) : (
                <div className="mt-3 rounded-lg border border-line bg-surface p-3" style={{ height: 40 * stats.byCategory.length + 40 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid horizontal={false} stroke="#d3dcd7" />
                      <XAxis type="number" tickFormatter={compact} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="category" width={96} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#edf1ee' }} formatter={(v) => [money(v, cur), 'Spent']} />
                      <Bar dataKey="total" fill="#0e7c66" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold">Last six months</h2>
              <div className="mt-3 h-64 rounded-lg border border-line bg-surface p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }))}>
                    <CartesianGrid vertical={false} stroke="#d3dcd7" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={40} />
                    <Tooltip cursor={{ fill: '#edf1ee' }} formatter={(v) => [money(v, cur), 'Spent']} />
                    <Bar dataKey="total" fill="#0e7c66" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {stats.topMerchants.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">Top stores</h2>
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
                {stats.topMerchants.map((m) => (
                  <li key={m.merchant} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="truncate font-medium">{m.merchant}</span>
                    <span className="ml-auto w-20 shrink-0 text-right text-sm text-ink-soft">{m.count} {m.count === 1 ? 'visit' : 'visits'}</span>
                    <span className="shrink-0 font-mono">{money(m.total, cur)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
