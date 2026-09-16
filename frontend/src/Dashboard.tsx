import { useCallback, useEffect, useState } from 'react';

type DashboardProps = {
  role: string;
  clientId: string | null;
};

type Campaign = {
  _id: string;
  name: string;
  budget: number;
  impressions: number;
  clicks: number;
};

function Dashboard({ role, clientId }: DashboardProps) {
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

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Role: {role}</p>
      <p>Client ID: {clientId ?? 'N/A'}</p>

      <h2>Create Campaign</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Budget"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
      {submitError && <p>Error creating campaign: {submitError}</p>}

      {loading && <p>Loading campaigns...</p>}
      {error && <p>Error loading campaigns: {error}</p>}

      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Budget</th>
              <th>Impressions</th>
              <th>Clicks</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign._id}>
                <td>{campaign.name}</td>
                <td>{campaign.budget}</td>
                <td>{campaign.impressions}</td>
                <td>{campaign.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;
