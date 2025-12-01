# Deployment Guide

Hetzner VM + Supabase deployment setup.

## Architecture

```
Internet → Caddy (SSL) → Frontend (Next.js :3000)
                       → Backend (Go :8080)

Supabase (PostgreSQL) ← Backend
```

## Files Created

| File | Purpose |
|------|---------|
| `Caddyfile` | Reverse proxy config - routes traffic, handles SSL |
| `docker-compose.prod.yml` | Production compose (no local DB) |
| `.env.production.example` | Environment template with Supabase format |
| `frontend/Dockerfile` | Production Next.js build |
| `frontend/next.config.js` | Added `output: 'standalone'` for Docker |

## Deployment Steps

### 1. Provision Hetzner VM

- Recommended: CPX21 (3 vCPU, 4GB RAM, ~€8/mo)
- OS: Ubuntu 22.04
- Open ports 80, 443 in firewall

### 2. Install Docker on VM

```bash
apt update && apt install -y docker.io docker-compose-plugin
systemctl enable docker
```

### 3. Set Up Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection string
3. Copy the "Transaction" pooler string (port 6543)

### 4. Run Migrations

Connect to Supabase and run migrations:

```bash
# Using psql locally or from VM
export DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"

psql "$DATABASE_URL" -f migrations/001_create_sessions.sql
psql "$DATABASE_URL" -f migrations/002_create_scenario_events.sql
psql "$DATABASE_URL" -f migrations/003_create_scenario_events.up.sql
psql "$DATABASE_URL" -f migrations/004_add_display_color.sql
```

### 5. Clone and Configure

```bash
git clone <your-repo> /opt/assetra
cd /opt/assetra

# Copy and edit environment
cp .env.production.example .env
nano .env  # Add real values

# Edit Caddyfile - replace YOUR_DOMAIN with actual domain
nano Caddyfile
```

### 6. Point DNS

Add an A record pointing your domain to the Hetzner VM IP:

```
Type: A
Name: @ (or subdomain)
Value: <VM_IP>
TTL: 300
```

### 7. Start Services

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 8. Verify

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Check logs if issues
docker compose -f docker-compose.prod.yml logs -f
```

Visit `https://YOUR_DOMAIN` - should see the app with valid SSL.

## Maintenance

### View Logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Update Deployment

```bash
cd /opt/assetra
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Restart Services

```bash
docker compose -f docker-compose.prod.yml restart
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase connection string (use pooler, port 6543) |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `PRIMARY_LLM` | `openai`, `anthropic`, or `gemini` |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GEMINI_API_KEY` | Google Gemini API key |
