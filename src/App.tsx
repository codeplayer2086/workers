import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminCompaniesPage } from './pages/admin/AdminCompaniesPage';
import { AdminAgentsPage } from './pages/admin/AdminAgentsPage';
import { AdminEmployeesPage } from './pages/admin/AdminEmployeesPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { EmployeeOverviewPage } from './pages/employee/EmployeeOverviewPage';
import { WorkersDirectoryPage } from './pages/employee/WorkersDirectoryPage';
import { WorkerNewPage } from './pages/employee/WorkerNewPage';
import { WorkerEditPage } from './pages/employee/WorkerEditPage';
import { AgentOverviewPage } from './pages/agent/AgentOverviewPage';
import { AgentCandidatesPage } from './pages/agent/AgentCandidatesPage';
import { AgentCandidateDetailPage } from './pages/agent/AgentCandidateDetailPage';
import type { UserRole } from './lib/validation';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading portal...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'EMPLOYEE') return <Navigate to="/employee" replace />;
  return <Navigate to="/agent" replace />;
}

function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactElement;
}) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Verifying session...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomeRedirect />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <RequireRole roles={['ADMIN']}>
                <AdminOverviewPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/companies"
            element={
              <RequireRole roles={['ADMIN']}>
                <AdminCompaniesPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/agents"
            element={
              <RequireRole roles={['ADMIN']}>
                <AdminAgentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <RequireRole roles={['ADMIN']}>
                <AdminEmployeesPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <RequireRole roles={['ADMIN']}>
                <AdminLogsPage />
              </RequireRole>
            }
          />

          {/* Shared Employee & Admin Worker Directory Routes */}
          <Route
            path="/employee"
            element={
              <RequireRole roles={['ADMIN', 'EMPLOYEE']}>
                <EmployeeOverviewPage />
              </RequireRole>
            }
          />
          <Route
            path="/employee/workers"
            element={
              <RequireRole roles={['ADMIN', 'EMPLOYEE']}>
                <WorkersDirectoryPage />
              </RequireRole>
            }
          />
          <Route
            path="/employee/workers/new"
            element={
              <RequireRole roles={['ADMIN', 'EMPLOYEE']}>
                <WorkerNewPage />
              </RequireRole>
            }
          />
          <Route
            path="/employee/workers/:id/edit"
            element={
              <RequireRole roles={['ADMIN', 'EMPLOYEE']}>
                <WorkerEditPage />
              </RequireRole>
            }
          />

          {/* Agent Candidate Portal & CV Engine Routes */}
          <Route
            path="/agent"
            element={
              <RequireRole roles={['AGENT']}>
                <AgentOverviewPage />
              </RequireRole>
            }
          />
          <Route
            path="/agent/candidates"
            element={
              <RequireRole roles={['AGENT']}>
                <AgentCandidatesPage />
              </RequireRole>
            }
          />
          <Route
            path="/agent/candidates/:id"
            element={
              <RequireRole roles={['AGENT', 'ADMIN', 'EMPLOYEE']}>
                <AgentCandidateDetailPage />
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
