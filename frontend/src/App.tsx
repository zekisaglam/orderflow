import { useState } from 'react';
import Dashboard from './Dashboard';

type Role = 'admin' | 'clientA' | 'clientB';

function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('admin');

  const handleLogin = () => {
    setRole(selectedRole);
    setClientId(selectedRole === 'admin' ? null : selectedRole);
  };

  if (role) {
    return <Dashboard role={role} clientId={clientId} />;
  }

  return (
    <div>
      <h1>Login</h1>
      <select
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value as Role)}
      >
        <option value="admin">admin</option>
        <option value="clientA">clientA</option>
        <option value="clientB">clientB</option>
      </select>
      <button type="button" onClick={handleLogin}>
        Login
      </button>
    </div>
  );
}

export default App;
