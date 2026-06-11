import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import { layoutChildren } from './routes';

// Feature flag: when a Clerk publishable key is present, the whole app runs
// under Clerk (multi-tenant orgs). Otherwise it uses the built-in JWT auth.
// The Clerk shell is lazy-loaded so it isn't bundled when Clerk isn't used.
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const ClerkApp = CLERK_KEY ? lazy(() => import('./clerk/ClerkApp')) : null;

const Spinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1763e6]"></div>
  </div>
);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function LegacyApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {layoutChildren}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default function App() {
  if (ClerkApp) {
    return (
      <Suspense fallback={<Spinner />}>
        <ClerkApp />
      </Suspense>
    );
  }
  return <LegacyApp />;
}
