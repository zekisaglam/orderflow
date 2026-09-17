import { useCallback, useEffect, useState } from 'react';

type DashboardProps = {
  role: string;
  clientId: string | null;
  onLogout: () => void;
};

type Campaign = {
  _id: string;
  name: string;
  budget: number;
  impressions: number;
  clicks: number;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Dashboard({ role, clientId, onLogout }: DashboardProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'x-user-role': role };
    if (clientId) {
      headers['x-client-id'] = clientId;
    }
    return headers;
  }, [role, clientId]);

  const fetchCampaigns = useCallback(() => {
    setLoading(true);
    setError(null);

    return fetch('http://localhost:3000/campaigns', { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setCampaigns(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    fetch('http://localhost:3000/campaigns', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, budget: Number(budget) }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then(() => {
        setName('');
        setBudget('');
        return fetchCampaigns();
      })
      .catch((err) => setSubmitError(err.message))
      .finally(() => setSubmitting(false));
  };

  const totalCampaigns = campaigns.length;
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Orderflow</h1>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
            {clientId && clientId !== role ? `${role} · ${clientId}` : role}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Create Campaign</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="campaign-name" className="mb-1 block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                id="campaign-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div className="sm:w-40">
              <label htmlFor="campaign-budget" className="mb-1 block text-sm font-medium text-slate-700">
                Budget
              </label>
              <input
                id="campaign-budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
          {submitError && (
            <p className="mt-3 text-sm text-red-600">Error creating campaign: {submitError}</p>
          )}
        </section>

        {loading && <p className="text-sm text-slate-500">Loading campaigns...</p>}
        {error && <p className="text-sm text-red-600">Error loading campaigns: {error}</p>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total Campaigns" value={totalCampaigns.toLocaleString()} />
              <StatCard label="Total Budget" value={formatCurrency(totalBudget)} />
              <StatCard label="Average CTR" value={formatPercent(averageCtr)} />
            </div>

            <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">Campaigns</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Name</th>
                      <th className="px-6 py-3 text-right font-semibold text-slate-700">Budget</th>
                      <th className="px-6 py-3 text-right font-semibold text-slate-700">
                        Impressions
                      </th>
                      <th className="px-6 py-3 text-right font-semibold text-slate-700">Clicks</th>
                      <th className="px-6 py-3 text-right font-semibold text-slate-700">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaigns.map((campaign, index) => (
                      <tr
                        key={campaign._id}
                        className={`transition-colors hover:bg-indigo-50/40 ${
                          index % 2 === 1 ? 'bg-slate-50/60' : ''
                        }`}
                      >
                        <td className="px-6 py-3 text-slate-900">{campaign.name}</td>
                        <td className="px-6 py-3 text-right text-slate-700">
                          {formatCurrency(campaign.budget)}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-700">
                          {campaign.impressions.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-700">
                          {campaign.clicks.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-700">
                          {formatPercent(
                            campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
