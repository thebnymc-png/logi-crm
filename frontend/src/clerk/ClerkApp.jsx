import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, SignIn } from '@clerk/clerk-react';
import Layout from '../components/Layout';
import ClerkAuthBridge from './ClerkAuthBridge';
import { layoutChildren } from '../routes';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function CenteredSignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] p-6">
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}

// Clerk-backed application shell. Signed-out users are routed to Clerk's hosted
// sign-in; signed-in users pass through ClerkAuthBridge (which enforces an active
// organization and adapts Clerk's session to the app's useAuth() contract).
export default function ClerkApp() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/sign-in">
      <BrowserRouter>
        <SignedOut>
          <Routes>
            <Route path="/sign-in/*" element={<CenteredSignIn />} />
            <Route path="*" element={<RedirectToSignIn />} />
          </Routes>
        </SignedOut>
        <SignedIn>
          <ClerkAuthBridge>
            <Routes>
              <Route path="/" element={<Layout />}>
                {layoutChildren}
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ClerkAuthBridge>
        </SignedIn>
      </BrowserRouter>
    </ClerkProvider>
  );
}
