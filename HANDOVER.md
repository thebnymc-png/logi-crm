# LogiCRM — Claude Code Handover Document

## Project Overview

**LogiCRM** is a full-stack logistics sales and account management CRM deployed on a persistent cloud VM. It is modeled after Salesforce Lightning and HubSpot, purpose-built for freight/logistics companies. The client is **JD Refrigerated Transport** (Queensland, Australia).

| Item | Value |
|------|-------|
| **Live URL** | http://34.139.238.90 |
| **Login** | admin@logisticscrm.com / admin123 |
| **VM IP** | 34.139.238.90 |
| **Project Dir** | `/home/ubuntu/logistics-crm/` |
| **Service** | `logisticscrm` (systemd) |
| **Node** | v22.22.3 |
| **Port** | 3001 (backend), 80 (Nginx proxy) |

---

## Architecture

```
Browser → Nginx (port 80) → Express.js (port 3001) → SQLite (sql.js)
```

- **Backend**: Express.js + sql.js (SQLite in-memory with file persistence)
- **Frontend**: React 18 + Vite 5 + TailwindCSS 3.4 + Recharts 2.10 + Lucide React icons
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **DB**: SQLite file at `backend/data/crm.db` (auto-created with seed data on first run)
- **Persistence**: sql.js loads DB into memory, saves to disk every 30s + on SIGTERM/SIGINT

---

## File Structure

```
/home/ubuntu/logistics-crm/
├── backend/
│   ├── server.js           # Main Express app, all CRUD routes
│   ├── database.js         # Schema, sql.js wrapper, seed data
│   ├── analytics.js        # Analytics endpoints (registerAnalyticsRoutes)
│   ├── integrations.js     # Integration marketplace (registerIntegrationRoutes)
│   ├── package.json        # express, sql.js, cors, bcryptjs, jsonwebtoken, multer, uuid
│   └── data/
│       └── crm.db          # SQLite database (auto-generated)
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx             # React Router routes
│   │   ├── index.css           # TailwindCSS + custom design system
│   │   ├── components/
│   │   │   └── Layout.jsx      # App shell (Salesforce-style top nav bar)
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # JWT auth state management
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx   # Executive analytics dashboard
│   │   │   ├── Pipeline.jsx    # Kanban + list view for deals
│   │   │   ├── Accounts.jsx    # Account list with filters
│   │   │   ├── AccountDetail.jsx
│   │   │   ├── Contacts.jsx    # Contact grid with detail links
│   │   │   ├── ContactDetail.jsx  # Individual contact page (NOT in App.jsx routes yet - see Known Issues)
│   │   │   ├── Activities.jsx
│   │   │   ├── Quotes.jsx
│   │   │   ├── Tasks.jsx
│   │   │   ├── Contracts.jsx   # Monday.com-style board (NOT in App.jsx routes - see Known Issues)
│   │   │   ├── Integrations.jsx # Marketplace UI (NOT in App.jsx routes - see Known Issues)
│   │   │   └── Reports.jsx     # JD-branded report builder
│   │   └── utils/
│   │       ├── api.js          # Axios-like fetch wrapper with JWT
│   │       └── format.js       # Currency, date, percentage formatters
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── postcss.config.js
│   └── dist/                   # Built static files (served by Express)
└── logisticscrm.service        # systemd unit file
```

---

## Database Schema (SQLite)

| Table | Purpose |
|-------|---------|
| `users` | Auth users (email, password hash, role) |
| `accounts` | Companies/shippers (industry, shipping_volume, modes, lanes, health) |
| `contacts` | People at accounts (title, role flags, linked to account) |
| `deals` | Sales opportunities (stage, value, probability, service_type, origin/destination) |
| `activities` | Logged interactions (call, email, meeting, note) |
| `quotes` | Rate proposals (origin, destination, mode, pricing breakdown) |
| `tasks` | Follow-ups and to-dos (priority, due_date, linked to account/contact/deal) |
| `lanes` | Shipping lanes per account (origin/dest, mode, rates) |
| `contracts` | Service agreements (Monday.com board style, SLA, DIFOT, timeline) |
| `revenue_history` | Monthly revenue vs target (12 months) |
| `integrations` | Connected third-party systems |
| `integration_logs` | Sync/event activity log |
| `webhook_events` | Inbound webhook payloads |
| `field_mappings` | Data mapping config per integration |

---

## API Routes Summary

### Auth
- `POST /api/auth/login` — Returns JWT token
- `GET /api/auth/me` — Current user info
- `POST /api/auth/register` — Create user

### Dashboard
- `GET /api/dashboard/stats` — KPI summary
- `GET /api/dashboard/pipeline-summary` — Pipeline by stage
- `GET /api/dashboard/recent-activities` — Latest 10 activities
- `GET /api/dashboard/upcoming-tasks` — Next 10 tasks
- `GET /api/dashboard/deals-by-service` — Revenue by service type

### CRUD Resources (all require `Authorization: Bearer <token>`)
- `/api/accounts` — GET (list), POST (create), GET/:id, PUT/:id, DELETE/:id
- `/api/contacts` — GET, POST, GET/:id, PUT/:id, DELETE/:id
- `/api/deals` — GET, GET/pipeline, POST, GET/:id, PUT/:id, DELETE/:id
- `/api/activities` — GET, POST, DELETE/:id
- `/api/quotes` — GET, POST, GET/:id, PUT/:id, DELETE/:id
- `/api/tasks` — GET, POST, PUT/:id, DELETE/:id
- `/api/lanes` — GET, POST, DELETE/:id
- `/api/contracts` — GET, GET/board, POST, GET/:id, PUT/:id, DELETE/:id

### Reports
- `GET /api/reports/win-rate`
- `GET /api/reports/revenue-by-service`
- `GET /api/reports/account-health`

### Analytics (registered via `analytics.js`)
- `GET /api/analytics/revenue-history`
- `GET /api/analytics/pipeline-inspection`
- `GET /api/analytics/forecast`
- `GET /api/analytics/activity-metrics`
- `GET /api/analytics/service-breakdown`
- `GET /api/analytics/top-accounts`
- `GET /api/analytics/lanes`
- `GET /api/analytics/tasks-overview`
- `GET /api/analytics/quotes-summary`

### Integrations (registered via `integrations.js`)
- `GET /api/integrations/providers` — 26 provider catalog
- `GET /api/integrations` — Connected integrations
- `POST /api/integrations` — Connect new
- `PUT /api/integrations/:id` — Update config
- `DELETE /api/integrations/:id` — Disconnect
- `POST /api/integrations/:id/sync` — Trigger sync
- `POST /api/integrations/:id/test` — Test connection
- `GET /api/integrations/:id/logs` — Activity log
- `GET /api/integrations/activity/all` — All activity
- `POST /api/webhooks/:provider_id` — Inbound webhook
- `GET /api/webhooks/events` — Webhook event log
- `GET /api/integrations/:id/mappings` — Field mappings
- `POST /api/integrations/:id/mappings` — Save mappings
- `GET /api/integrations/stats/overview` — Integration stats

---

## Known Issues & Incomplete Work

### 1. Frontend Route Registration (CRITICAL)
The `App.jsx` file is **missing routes** for:
- `/contacts/:id` → `ContactDetail.jsx` (page exists in src but route not in App.jsx)
- `/contracts` → `Contracts.jsx` (page exists in src but route not in App.jsx)
- `/integrations` → `Integrations.jsx` (page exists in src but route not in App.jsx)

**However**, the built `dist/` bundle DOES include these routes (it was built from a complete App.jsx locally). The source `App.jsx` on the server is outdated. If you rebuild from source, you must add these routes first.

**Fix**: Update `App.jsx` to add:
```jsx
import ContactDetail from './pages/ContactDetail';
import Contracts from './pages/Contracts';
import Integrations from './pages/Integrations';

// Inside <Route path="/" ...> children:
<Route path="contacts/:id" element={<ContactDetail />} />
<Route path="contracts" element={<Contracts />} />
<Route path="integrations" element={<Integrations />} />
```

### 2. Contracts Seed Data
The contracts seed data sometimes fails to insert on fresh DB creation due to the sql.js wrapper's `prepare().run()` pattern with spread arrays. The workaround used was to seed contracts manually after initial DB creation. If contracts are empty after a fresh start, run:
```bash
cd ~/logistics-crm/backend && node -e "
const initSqlJs=require('sql.js');const fs=require('fs');
const DB_PATH='./data/crm.db';
const SQL=await (async()=>await initSqlJs())();
// ... manual insert script
"
```
**Better fix**: Refactor the seed function to use `db.run(sql, params)` directly instead of the wrapper for bulk inserts.

### 3. Dashboard Pipeline Value Shows $0.0M
The dashboard's pipeline value KPI card shows `$0.0M` instead of the actual total. The API returns correct data — this is a frontend formatting issue in `Dashboard.jsx`. The value comes from the stats endpoint but may not be properly parsed from string to number.

### 4. Revenue History Chart
The revenue chart shows flat/zero values because the `revenue_history` table seed data may not persist correctly with the sql.js wrapper pattern. Verify with:
```bash
TOKEN=$(curl -s http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@logisticscrm.com","password":"admin123"}' | jq -r '.token')
curl -s http://localhost:3001/api/analytics/revenue-history -H "Authorization: Bearer $TOKEN"
```

### 5. Source Files vs Built Files Mismatch
The `frontend/src/` source files on the server may be slightly out of sync with the compiled `frontend/dist/` bundle. The dist was built locally (in a sandbox) and deployed as a tarball. If making changes, always rebuild from source:
```bash
cd ~/logistics-crm/frontend && npm install && npm run build
sudo systemctl restart logisticscrm
```

---

## JD Refrigerated Transport Branding

| Element | Value |
|---------|-------|
| **Primary Blue** | #0096e0 |
| **Dark** | #374151 |
| **Company** | JD Refrigerated Transport |
| **Location** | Queensland Intermodal Terminal, Brisbane QLD |
| **ABN** | 12 345 678 910 |
| **Logo** | SVG inline in Reports.jsx (truck + snowflake icon) |

The Reports page uses JD branding in the header and footer. The rest of the app uses a generic Salesforce Lightning color scheme (#0176d3 primary, #032d60 dark).

---

## Deployment & Operations

### Service Management
```bash
sudo systemctl start logisticscrm
sudo systemctl stop logisticscrm
sudo systemctl restart logisticscrm
sudo systemctl status logisticscrm
sudo journalctl -u logisticscrm -f    # Live logs
```

### Rebuild Frontend
```bash
cd ~/logistics-crm/frontend
npm install
npm run build
sudo systemctl restart logisticscrm
```

### Reset Database (fresh seed data)
```bash
sudo systemctl stop logisticscrm
rm -f ~/logistics-crm/backend/data/crm.db
sudo systemctl start logisticscrm
```

### Nginx
```bash
sudo systemctl restart nginx
cat /etc/nginx/sites-available/logisticscrm
```

### Backup
```bash
cp ~/logistics-crm/backend/data/crm.db ~/crm-backup-$(date +%Y%m%d).db
```

---

## What Needs to Be Done Next (Suggested Improvements)

### High Priority
1. **Fix App.jsx routes** — Add missing routes for ContactDetail, Contracts, Integrations
2. **Fix contracts seeding** — Refactor to use direct `db.run()` instead of wrapper for bulk inserts
3. **Fix Dashboard $0.0M** — Debug the pipeline value display in Dashboard.jsx
4. **Add real-time data** — Replace demo seed data with actual JD Refrigerated Transport data
5. **Email integration** — Connect to Gmail/Outlook for activity auto-logging

### Medium Priority
6. **User management** — Add user CRUD, role-based permissions (admin, manager, sales_rep)
7. **Notifications** — Real-time notifications for task due dates, deal stage changes
8. **Search** — Implement global search across accounts, contacts, deals
9. **CSV Import/Export** — Bulk data import for accounts, contacts
10. **Mobile responsive** — Optimize for tablet/phone usage

### Low Priority / Nice-to-Have
11. **Dark mode** — Toggle between light/dark themes
12. **Email templates** — Predefined templates for outreach
13. **Document storage** — File attachments on accounts/deals
14. **Activity reminders** — Scheduled email/push reminders
15. **Custom fields** — User-defined fields on any entity
16. **Audit trail** — Track all changes with who/when
17. **Multi-tenant** — Support multiple teams/organizations
18. **API rate limiting** — Add express-rate-limit for production
19. **HTTPS** — Add Let's Encrypt SSL certificate
20. **Automated backups** — Cron job for daily DB backups

---

## Tech Stack Reference

### Backend Dependencies
```json
{
  "express": "^4.18.2",
  "sql.js": "^1.10.0",
  "cors": "^2.8.5",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "multer": "^1.4.5-lts.1",
  "uuid": "^9.0.0"
}
```

### Frontend Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.21.0",
  "lucide-react": "^0.303.0",
  "recharts": "^2.10.3"
}
```

### Dev Dependencies
```json
{
  "@vitejs/plugin-react": "^4.2.1",
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.32",
  "tailwindcss": "^3.4.0",
  "vite": "^5.0.8"
}
```

---

## Other Services on This VM

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| JDT Tender Management | 8080 | http://34.139.238.90:8080 | Tender & decision engine |
| JDT Route Intelligence | 8081 | http://34.139.238.90:8081 | Embeddable map widget & API |
| MySQL | 3306 | localhost only | Used by JDT Tender |

**Do NOT** modify Nginx configs for ports 8080/8081 or the MySQL service — those belong to other projects.

---

## Quick Start for Claude Code

```bash
# SSH into the VM or use the terminal
cd ~/logistics-crm

# Check current status
sudo systemctl status logisticscrm

# Make backend changes
vim backend/server.js
sudo systemctl restart logisticscrm

# Make frontend changes
cd frontend
vim src/pages/Dashboard.jsx
npm run build
sudo systemctl restart logisticscrm

# Check logs if something breaks
sudo journalctl -u logisticscrm --no-pager -n 50

# Test API
TOKEN=$(curl -s http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@logisticscrm.com","password":"admin123"}' | jq -r '.token')
curl -s http://localhost:3001/api/dashboard/stats -H "Authorization: Bearer $TOKEN" | jq
```

---

*Document generated: 10 June 2026*
*Last deployed build: 10 June 2026 10:31 UTC*
