import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ScanTab from '../components/ScanTab.jsx';
import ReceiptsTab from '../components/ReceiptsTab.jsx';
import InsightsTab from '../components/InsightsTab.jsx';

const TABS = [
  { id: 'scan', label: 'Scan' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'insights', label: 'Insights' },
];

export default function Workspace() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('scan');
  const [version, setVersion] = useState(0); // bumps whenever data changes, so lists and charts refetch
  const changed = () => setVersion((v) => v + 1);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 px-4 sm:px-8">
          <p className="py-4 text-xl font-bold tracking-tight">ReceiptLens</p>
          <nav role="tablist" className="order-3 flex w-full gap-6 border-t border-line pt-2 sm:order-none sm:ml-4 sm:w-auto sm:self-stretch sm:border-t-0 sm:pt-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`border-b-2 px-0.5 pb-2 text-sm font-semibold sm:pb-0 ${tab === t.id ? 'border-brand text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden truncate text-ink-soft sm:inline">{user.name}</span>
            <button type="button" onClick={logout} className="font-semibold whitespace-nowrap underline underline-offset-2">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {tab === 'scan' && <ScanTab onChanged={changed} />}
        {tab === 'receipts' && <ReceiptsTab version={version} onChanged={changed} />}
        {tab === 'insights' && <InsightsTab version={version} />}
      </main>
    </div>
  );
}
