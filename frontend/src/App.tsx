import { useState } from 'react';
import Dashboard from './Dashboard';

type Role = 'admin' | 'clientA' | 'clientB' | 'clientC' | 'clientD' | 'clientE';

function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('admin');

  const handleLogin = () => {
    setRole(selectedRole);
    setClientId(selectedRole === 'admin' ? null : selectedRole);
  };

  const handleLogout = () => {
    setRole(null);
    setClientId(null);
  };

  if (role) {
    return <Dashboard role={role} clientId={clientId} onLogout={handleLogout} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg shadow-slate-200/60 ring-1 ring-slate-900/5">
        <h1 className="text-center text-2xl font-semibold text-slate-900">Orderflow</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Sign in to manage your campaigns
        </p>

        <div className="mt-6">
          <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id="role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Role)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="admin">admin</option>
            <option value="clientA">clientA</option>
            <option value="clientB">clientB</option>
            <option value="clientC">clientC</option>
            <option value="clientD">clientD</option>
            <option value="clientE">clientE</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2"
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default App;
