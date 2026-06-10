# LogiCRM — Deployment Guide

This guide deploys LogiCRM as a **single container** (Express API + the built React
SPA on one origin) behind **Cloudflare** for DNS, TLS, CDN and a zero-trust tunnel.

```
Browser ──HTTPS──> Cloudflare edge ──Tunnel──> cloudflared ──> logicrm:3001
                                                                 ├─ /api/*  Express API (JWT auth)
                                                                 └─ /*      React SPA (static)
                                                                 └─ /data   SQLite volume (better-sqlite3, WAL)
```

Why this shape: the backend already serves the SPA, so there's **one origin and no
CORS**. SQLite (better-sqlite3) needs a persistent local disk, so the API runs on a
real host (not Workers); Cloudflare fronts it. A split "Pages + API" variant is in
the last section.

---

## 1. CI/CD pipeline (already in the repo)

Two GitHub Actions workflows under `.github/workflows/`:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | push to `main`/`claude/**`, PRs to `main` | Builds the frontend, installs the backend, boots the server and smoke-tests `/api/health` + seed login. |
| `deploy.yml` | push to `main`, `v*` tags, manual | Builds the production Docker image and pushes it to **GHCR** (`ghcr.io/thebnymc-png/logi-crm`). |

**One-time setup:**
1. Push these branches/PRs — CI runs automatically (no secrets needed).
2. The image publish uses the built-in `GITHUB_TOKEN`; no extra secrets required.
   After the first successful `deploy.yml` run, open the repo's **Packages**, select
   `logi-crm`, and set visibility to **Private** (recommended) or Public.
3. If the host pulls a **private** image, create a GitHub PAT with `read:packages`
   and `docker login ghcr.io` on the host (shown below).

---

## 2. Provision a host

Any small Linux VM with Docker works (Hetzner, DigitalOcean, AWS Lightsail, a
home server, etc.). 1 vCPU / 1 GB RAM is plenty to start.

```bash
# On the host (Debian/Ubuntu):
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # re-login after this
```

---

## 3. Configure secrets

```bash
git clone https://github.com/thebnymc-png/logi-crm.git
cd logi-crm
cp .env.example .env

# Generate a strong JWT secret and write it into .env:
echo "JWT_SECRET=$(openssl rand -hex 48)" >> .env
```

`.env` keys (see `.env.example`): `JWT_SECRET` (**required**), `CORS_ORIGINS`
(leave blank for same-origin), `TUNNEL_TOKEN` (Cloudflare, set in step 5).

> The server **refuses to start in production without `JWT_SECRET`**. Rotating it
> later invalidates all existing sessions (everyone must log in again).

---

## 4. Run it

```bash
# If using the private GHCR image, authenticate first:
echo "<YOUR_GH_PAT>" | docker login ghcr.io -u <your-gh-username> --password-stdin

docker compose up -d            # pulls ghcr.io image (or `docker compose up -d --build` to build locally)
docker compose logs -f logicrm  # expect: "Logistics CRM API running on port 3001"
curl -s http://127.0.0.1:3001/api/health   # {"status":"ok",...}
```

The port is bound to `127.0.0.1` only — nothing is publicly exposed yet. Cloudflare
reaches it through the tunnel in the next step. Data persists in the named volume
`logicrm-data` (`/data/crm.db`), seeded automatically on first run.

---

## 5. Put it behind Cloudflare (DNS + TLS + Tunnel)

Add your domain to Cloudflare first (Add Site → update nameservers at your registrar).
Then create a **remotely-managed tunnel** — no inbound ports, no manual certs:

1. Cloudflare dashboard → **Zero Trust** → **Networks → Tunnels → Create a tunnel**.
2. Type **Cloudflared**, name it `logicrm`, **Save**.
3. On the "Install connector" screen, copy the **token** (the long string after
   `--token`). Put it in `.env`:
   ```bash
   echo "TUNNEL_TOKEN=eyJ...your-token..." >> .env
   ```
4. Start the bundled connector (shares the compose network with the app):
   ```bash
   docker compose --profile tunnel up -d
   ```
5. Back in the dashboard, add a **Public Hostname** to the tunnel:
   - **Subdomain/Domain:** e.g. `crm.example.com`
   - **Service:** `HTTP` → `logicrm:3001`  ← the compose service name
   - Save. Cloudflare auto-creates the DNS record and issues TLS.

Visit `https://crm.example.com` — you should see the LogiCRM login. TLS, HTTP/2/3,
caching of static assets, and DDoS protection are handled at the edge.

---

## 6. First login & auth setup

The database seeds a default admin on first run:

```
admin@logisticscrm.com  /  admin123
```

**Immediately change that password** and create real users. Until a settings UI
exists, use the API (admin JWT required):

```bash
BASE=https://crm.example.com

# 1. Log in as the seed admin, capture the token
TOKEN=$(curl -s $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@logisticscrm.com","password":"admin123"}' | jq -r .token)

# 2. Change the admin password (user id 1; min 8 chars)
curl -s -X POST $BASE/api/users/1/password -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"password":"<a-strong-password>"}'

# 3. Create a teammate (roles: admin | manager | sales_rep)
curl -s -X POST $BASE/api/auth/register -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"email":"rep@yourco.com","password":"<temp-password>","first_name":"Sam","last_name":"Rep","role":"sales_rep"}'
```

Auth model: stateless **JWT** (7-day expiry), bcrypt-hashed passwords, login is
rate-limited (20 attempts / 15 min). `register`, user update/delete are
**admin-only**; password change is self-or-admin.

### Optional: Cloudflare Access (defense in depth)

To gate the whole app behind Cloudflare SSO/email-OTP *before* the login page is
even reachable: Zero Trust → **Access → Applications → Add** a self-hosted app for
`crm.example.com`, and add a policy (e.g. emails ending `@yourco.com`). Add a
**Bypass** policy for `crm.example.com/api/health` so uptime checks still pass.
This layers on top of LogiCRM's own login — it does not replace it.

---

## 7. Backups, updates, rollback

```bash
# Backup the SQLite volume (includes WAL sidecars)
docker run --rm -v logicrm-data:/data -v "$PWD":/backup busybox \
  tar czf /backup/logicrm-$(date +%F).tar.gz -C /data .

# Update to the latest published image
docker compose pull && docker compose up -d

# Roll back to a specific build
docker compose down
docker run -d ... ghcr.io/thebnymc-png/logi-crm:sha-<shortsha>   # or pin the tag in compose
```

Automate the backup with a daily `cron` entry; copy the archive off-host.

---

## Alternative: split deploy (Cloudflare Pages + separate API)

If you'd rather serve the SPA from Cloudflare's global CDN:

1. **Pages**: connect the repo, build command `cd frontend && npm ci && npm run build`,
   output `frontend/dist`, and set a build variable `VITE_API_URL=https://api.example.com/api`.
2. **API**: run the same container, but expose it on `api.example.com` via its own
   tunnel public hostname, and set `CORS_ORIGINS=https://crm.example.com` in `.env`.

The app reads `VITE_API_URL` at build time (`frontend/src/utils/api.js`), so no code
changes are needed — only the env var.
