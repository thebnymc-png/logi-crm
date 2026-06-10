# LogiCRM Deployment Instructions

## Quick Deploy (when cloud computer is back online)

```bash
# On the cloud computer:
cd ~
sudo systemctl stop logisticscrm
tar xzf crm-integrations.tar.gz -C logistics-crm/
rm -f logistics-crm/backend/data/crm.db
sudo systemctl start logisticscrm
```

## Fresh Install (any Ubuntu server with Node.js 18+)

```bash
# 1. Extract the project
unzip LogiCRM-Full-WithIntegrations.zip -d logistics-crm
cd logistics-crm

# 2. Install backend dependencies
cd backend
npm install

# 3. Start the server
node server.js
# Server runs on port 3001

# 4. Open browser to http://localhost:3001
# Login: admin@logisticscrm.com / admin123
```

## Features Included

- **Dashboard** — Salesforce-level analytics with KPIs, charts, pipeline funnel
- **Opportunities/Pipeline** — Kanban board with stage management
- **Accounts** — Full account management with logistics fields
- **Contacts** — Individual contact pages with timeline, activities, follow-ups
- **Activities** — Call/email/meeting logging
- **Quotes** — Rate proposals with pricing
- **Tasks** — Priority-based task management
- **Contracts** — Monday.com-style board with timeline bars
- **Integrations** — 25+ provider connectors (TMS, WMS, ERP, Freight, Carriers)
- **Reports** — Analytics and metrics

## Integration Providers Available

### TMS (Transportation Management)
- Oracle TMS, MercuryGate, BluJay, Kuebix

### WMS (Warehouse Management)
- Manhattan Associates, Blue Yonder, HighJump

### ERP
- SAP, Oracle NetSuite, Microsoft Dynamics

### Freight Platforms
- project44, FourKites, Flexport

### Carrier APIs
- FedEx, UPS, DHL

### CRM
- Salesforce, HubSpot

### Communication
- Slack, Microsoft Teams

### Email
- Gmail, Outlook

### Documents
- DocuSign
