import React, { useEffect, useState } from 'react';
import { useAuth as useClerkAuth, useUser, OrganizationList } from '@clerk/clerk-react';
import { AuthContext } from '../contexts/AuthContext';
import { setTokenGetter, setUnauthorizedHandler } from '../utils/api';

const Spinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1763e6]"></div>
  </div>
);

function mapRole(orgRole) {
  const r = (orgRole || '').replace(/^org:/, '');
  if (r === 'admin') return 'admin';
  if (r === 'manager') return 'manager';
  return 'sales_rep';
}

// Adapts Clerk's session to the app's existing useAuth() contract, so every page
// (which calls useAuth()) keeps working unchanged. Also:
//  • feeds the Clerk session token to the API client
//  • enforces an active organization (multi-tenant requirement)
export default function ClerkAuthBridge({ children }) {
  const { isLoaded, getToken, signOut, orgId, orgRole } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    setTokenGetter(() => getToken());
    setUnauthorizedHandler(() => {}); // Clerk's <SignedOut> handles redirects
    setTokenReady(true);
  }, [getToken]);

  if (!isLoaded) return <Spinner />;

  // Multi-tenant: an organization must be selected before entering the app.
  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] p-6">
        <OrganizationList hidePersonal afterSelectOrganizationUrl="/" afterCreateOrganizationUrl="/" />
      </div>
    );
  }

  const user = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        first_name: clerkUser.firstName || '',
        last_name: clerkUser.lastName || '',
        role: mapRole(orgRole),
      }
    : null;

  const value = {
    user,
    loading: !tokenReady,
    login: async () => {},
    logout: () => signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
