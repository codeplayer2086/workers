import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { apiFetch } from '../../lib/api';

interface EmployeeRow {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<EmployeeRow[]>('/api/admin/employees')
      .then(setEmployees)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load staff'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    try {
      const created = await apiFetch<EmployeeRow>('/api/admin/employees', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password }),
      });
      setEmployees((prev) => [created, ...prev]);
      setFullName('');
      setEmail('');
      setPassword('');
      setFeedback(`Created Dhaka staff account for ${created.fullName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await apiFetch<{ id: string; isActive: boolean }>(
        `/api/admin/users/${id}/toggle`,
        { method: 'PATCH' }
      );
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === id ? { ...emp, isActive: res.isActive } : emp))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <DashboardShell title="Dhaka Staff Accounts" breadcrumb="Admin / Employees">
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {feedback && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {feedback}
          </div>
        )}

        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Register Internal Employee Account
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            All internal employees share the central Dhaka worker directory.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Staff Full Name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@dhakarecruit.com"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Employee</span>
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Internal Agency Staff ({employees.length})
            </h2>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading staff accounts...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td className="px-6 py-3 font-medium text-slate-900">{emp.fullName}</td>
                      <td className="px-6 py-3 font-mono-tabular text-xs text-slate-600">
                        {emp.email}
                      </td>
                      <td className="px-6 py-3 text-xs font-semibold">
                        <span className={emp.isActive ? 'text-emerald-700' : 'text-red-700'}>
                          {emp.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggle(emp.id)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {emp.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
