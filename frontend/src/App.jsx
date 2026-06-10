import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Accounts from './pages/Accounts';
import AccountDetail from './pages/AccountDetail';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Activities from './pages/Activities';
import Quotes from './pages/Quotes';
import Tasks from './pages/Tasks';
import Reports from './pages/Reports';
import Contracts from './pages/Contracts';
import Integrations from './pages/Integrations';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="accounts/:id" element={<AccountDetail />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="contacts/:id" element={<ContactDetail />} />
        <Route path="activities" element={<Activities />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
