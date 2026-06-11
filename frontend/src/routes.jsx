import { Route } from 'react-router-dom';
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

// The protected child routes that render inside <Layout/>. Shared by both the
// legacy auth shell (App.jsx) and the Clerk shell (clerk/ClerkApp.jsx).
export const layoutChildren = (
  <>
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
  </>
);
