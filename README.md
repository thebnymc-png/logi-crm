# LogiCRM

A full-stack logistics sales & account-management CRM — part of the FreightClause
software suite. Modeled after Salesforce Lightning / HubSpot and purpose-built for
freight & logistics companies.

## Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 18 · Vite 5 · TailwindCSS 3 · Recharts · Lucide |
| Backend  | Node.js · Express 4 · better-sqlite3 (ACID SQLite, WAL) |
| Auth     | JWT (`jsonwebtoken`) · bcrypt password hashing |
| Security | Helmet headers · per-route rate limiting · env-based secrets |

## Project layout

```
backend/    Express API, SQLite schema + seed data, analytics & integrations
frontend/   React SPA (built output in frontend/dist, served by the backend)
```

## Local development

```bash
# 1. Backend
cd backend
cp .env.example .env          # then set JWT_SECRET (see the file for a generator)
npm install
npm start                     # serves API + built frontend on http://localhost:3001

# 2. Frontend (only when changing UI — hot reload)
cd frontend
npm install
npm run dev                   # http://localhost:5173, proxies /api to :3001
```

Build the frontend for production with `cd frontend && npm run build` (outputs to
`frontend/dist`, which the backend serves).

### Default login (seed data)

```
admin@logisticscrm.com  /  admin123
```

> The database (`backend/data/crm.db`) is created automatically with demo seed data
> on first run. It is gitignored. Delete the file to reseed from scratch.

## Configuration

All backend configuration is via environment variables — see `backend/.env.example`.
`JWT_SECRET` is **required** when `NODE_ENV=production` (the server refuses to start
without it).

## Production notes

- Run behind a TLS-terminating reverse proxy (e.g. Nginx). `trust proxy` is enabled.
- Set `NODE_ENV=production`, a strong `JWT_SECRET`, and `CORS_ORIGINS`.
- Health check endpoint for load balancers: `GET /api/health`.
- Back up `backend/data/crm.db` (plus its `-wal`/`-shm` siblings) regularly.

## API overview

Auth: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/register` (admin).
Users: `GET/PUT/DELETE /api/users`, `POST /api/users/:id/password`.
Core resources (all require `Authorization: Bearer <token>`): `accounts`, `contacts`,
`deals`, `activities`, `quotes`, `tasks`, `lanes`, `contracts`. Plus `dashboard`,
`reports`, `analytics`, and `integrations` route groups.
