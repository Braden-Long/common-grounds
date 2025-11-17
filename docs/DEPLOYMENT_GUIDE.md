# Common Grounds - Deployment Guide

## Deployment Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Vercel        │────────▶│   Railway        │
│   (Frontend)    │  HTTPS  │   (Backend API)  │
│   React SPA     │         │   Node.js        │
└─────────────────┘         └────────┬─────────┘
                                     │
                            ┌────────┴─────────┐
                            │                  │
                        ┌───▼────┐      ┌─────▼───┐
                        │  Neon  │      │ Railway │
                        │Postgres│      │  Redis  │
                        └────────┘      └─────────┘
```

---

## Prerequisites

### Required Accounts
- [ ] GitHub account (code repository)
- [ ] Vercel account (frontend hosting)
- [ ] Railway account (backend + database + Redis)
- [ ] Neon account (PostgreSQL database)
- [ ] Resend account (email service)
- [ ] Sentry account (error tracking - optional)

### Domain Names
- [ ] Purchase domain (e.g., commongrounds.app)
- [ ] Set up DNS (Cloudflare recommended)

---

## Part 1: Database Setup (Neon PostgreSQL)

### 1.1 Create Neon Database

1. Go to https://neon.tech
2. Sign up / Log in
3. Create new project
   - Name: `common-grounds-prod`
   - Region: US East (or closest to users)
   - PostgreSQL version: 15 or 16

4. Copy database connection string
   ```
   postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```

### 1.2 Configure Database

1. Enable connection pooling (recommended)
2. Set up automatic backups (Neon does this by default)
3. Note: Neon provides 10GB free tier

---

## Part 2: Redis Setup (Railway)

### 2.1 Create Redis Instance

1. Go to https://railway.app
2. Create new project: `common-grounds`
3. Add service → Add Redis
4. Copy Redis connection URL
   ```
   redis://default:password@host.railway.internal:6379
   ```

**Alternative**: Use Upstash (serverless Redis)
- Go to https://upstash.com
- Create Redis database
- Copy connection string

---

## Part 3: Backend Deployment (Railway)

### 3.1 Prepare Backend for Deployment

**Update package.json**
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "postinstall": "prisma generate"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Create Procfile** (optional)
```
web: npm start
```

### 3.2 Deploy to Railway

1. Go to Railway dashboard
2. New Project → Deploy from GitHub repo
3. Select `common-grounds` repository
4. Select `backend` as root directory
5. Railway will auto-detect Node.js

**Build Configuration**
- Build Command: `npm run build`
- Start Command: `npm start`
- Root Directory: `/backend`

### 3.3 Configure Environment Variables

In Railway dashboard → Variables:

```bash
# Node Environment
NODE_ENV=production
PORT=3000

# Frontend URL (will update after frontend deployment)
FRONTEND_URL=https://commongrounds.app

# Database (from Neon)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Redis (from Railway or Upstash)
REDIS_URL=redis://default:password@host:6379

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=<your-generated-secret>
JWT_EXPIRATION=7d

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@commongrounds.app

# UVA SIS API
UVA_SIS_API_URL=https://sisuva.admin.virginia.edu/psc/ihprd/UVSS/SA/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearch

# Sentry (optional)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### 3.4 Run Database Migrations

**In Railway dashboard**:
1. Go to your backend service
2. Open terminal
3. Run:
   ```bash
   npx prisma migrate deploy
   ```

### 3.5 Set Up Custom Domain

1. In Railway → Service Settings → Networking
2. Add custom domain: `api.commongrounds.app`
3. Update DNS records:
   ```
   CNAME api commongrounds.up.railway.app
   ```
4. Wait for SSL certificate provisioning (5-10 minutes)

### 3.6 Verify Deployment

Test API endpoints:
```bash
curl https://api.commongrounds.app/api/health
```

Expected response:
```json
{"status": "ok", "timestamp": "2025-01-17T..."}
```

---

## Part 4: Email Setup (Resend)

### 4.1 Configure Resend

1. Go to https://resend.com
2. Sign up / Log in
3. Create API key
4. Add to Railway environment variables: `RESEND_API_KEY`

### 4.2 Verify Domain

1. In Resend → Domains → Add Domain
2. Enter: `commongrounds.app`
3. Add DNS records (provided by Resend):
   ```
   TXT @ "v=spf1 include:_spf.resend.com ~all"
   CNAME resend._domainkey xxx.resend.com
   CNAME resend2._domainkey xxx.resend.com
   ```
4. Wait for verification (5-30 minutes)
5. Test email sending

---

## Part 5: Frontend Deployment (Vercel)

### 5.1 Prepare Frontend for Deployment

**Update vite.config.ts**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```

**Create vercel.json**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 5.2 Deploy to Vercel

**Option A: Vercel CLI**
```bash
cd frontend
npm install -g vercel
vercel login
vercel
```

**Option B: Vercel Dashboard**
1. Go to https://vercel.com
2. New Project → Import from GitHub
3. Select `common-grounds` repository
4. Root Directory: `frontend`
5. Framework Preset: Vite
6. Click Deploy

### 5.3 Configure Environment Variables

In Vercel → Project Settings → Environment Variables:

```bash
VITE_API_URL=https://api.commongrounds.app
VITE_SOCKET_URL=https://api.commongrounds.app
```

### 5.4 Set Up Custom Domain

1. Vercel → Project → Domains
2. Add domain: `commongrounds.app`
3. Add domain: `www.commongrounds.app`
4. Update DNS records:
   ```
   A @ 76.76.21.21
   CNAME www cname.vercel-dns.com
   ```
5. Wait for SSL certificate provisioning

### 5.5 Verify Deployment

Visit https://commongrounds.app

---

## Part 6: CI/CD Setup (GitHub Actions)

### 6.1 Create Workflow Files

**.github/workflows/backend.yml**
```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend
      - name: Run tests
        run: npm test
        working-directory: ./backend
      - name: Build
        run: npm run build
        working-directory: ./backend

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway
        run: echo "Railway auto-deploys on push to main"
```

**.github/workflows/frontend.yml**
```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
  pull_request:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend
      - name: Run tests
        run: npm test
        working-directory: ./frontend
      - name: Build
        run: npm run build
        working-directory: ./frontend

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: echo "Vercel auto-deploys on push to main"
```

---

## Part 7: Monitoring & Logging

### 7.1 Error Tracking (Sentry)

**Backend Integration**
```typescript
// backend/src/app.ts
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
  });
}
```

**Frontend Integration**
```typescript
// frontend/src/main.tsx
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
  });
}
```

### 7.2 Uptime Monitoring

**UptimeRobot** (free tier)
1. Go to https://uptimerobot.com
2. Create monitor for:
   - `https://commongrounds.app`
   - `https://api.commongrounds.app/api/health`
3. Set up email alerts

### 7.3 Analytics (Optional)

**Plausible Analytics** (privacy-friendly)
1. Go to https://plausible.io
2. Add domain: `commongrounds.app`
3. Add script to frontend `index.html`

---

## Part 8: Post-Deployment Checklist

### Functionality Tests
- [ ] User can request magic link
- [ ] Magic link email is received
- [ ] User can verify magic link and login
- [ ] User can complete registration
- [ ] User can search for classes
- [ ] User can add classes
- [ ] User can send friend requests
- [ ] User can accept friend requests
- [ ] User can view common classes with friends
- [ ] User can send anonymous messages
- [ ] Messages appear in real-time

### Performance Tests
- [ ] Page load time < 2s
- [ ] API response time < 200ms (p95)
- [ ] WebSocket connection time < 100ms
- [ ] Lighthouse score > 90

### Security Tests
- [ ] HTTPS is enforced
- [ ] Security headers are set (check with securityheaders.com)
- [ ] Rate limiting is active
- [ ] CORS is configured correctly
- [ ] Magic links expire correctly
- [ ] JWT tokens expire correctly

### Monitoring Tests
- [ ] Sentry is receiving errors
- [ ] Uptime monitors are active
- [ ] Email alerts are working
- [ ] Logs are being collected

---

## Rollback Procedure

### Backend Rollback (Railway)
1. Go to Railway → Service → Deployments
2. Find previous working deployment
3. Click "Redeploy"

### Frontend Rollback (Vercel)
1. Go to Vercel → Project → Deployments
2. Find previous working deployment
3. Click "Promote to Production"

### Database Rollback
```bash
# SSH into Railway backend
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## Scaling Considerations

### When to Scale

**Indicators**:
- API response time > 500ms consistently
- Database CPU > 80%
- Redis memory > 80%
- Error rate > 1%

### Scaling Options

**Vertical Scaling** (Railway)
- Increase backend resources
- Increase database resources

**Horizontal Scaling**
- Deploy multiple backend instances (Railway supports this)
- Use Redis adapter for Socket.io (for multi-instance support)

**Database Scaling** (Neon)
- Upgrade to higher tier (more storage, compute)
- Enable read replicas

**CDN** (Cloudflare)
- Add Cloudflare in front of app
- Cache static assets
- DDoS protection

---

## Maintenance Windows

### Scheduled Maintenance
- Database migrations: Off-peak hours (2-4 AM)
- Dependency updates: Weekly, during low traffic
- Major updates: Announce 48 hours in advance

### Zero-Downtime Deployments
- Railway: Automatic zero-downtime deployments
- Vercel: Automatic zero-downtime deployments
- Database migrations: Use Prisma's migration strategy

---

## Support & Operations

### Incident Response
1. Monitor Sentry for errors
2. Check Railway logs for backend issues
3. Check Vercel logs for frontend issues
4. Use UptimeRobot for downtime alerts

### Backup & Recovery
- Neon: Automatic daily backups (7-day retention)
- Manual backups: Export database weekly
  ```bash
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
  ```

### Log Retention
- Railway: 30-day log retention (free tier)
- Sentry: 30-day event retention (free tier)

---

## Cost Estimate (Free Tier)

| Service | Free Tier | Estimate |
|---------|-----------|----------|
| Neon (Database) | 10GB storage | $0 |
| Railway (Backend + Redis) | $5/month credit | $0-5 |
| Vercel (Frontend) | 100GB bandwidth | $0 |
| Resend (Email) | 3,000 emails/month | $0 |
| Sentry (Errors) | 5,000 events/month | $0 |
| UptimeRobot | 50 monitors | $0 |
| **Total** | | **$0-5/month** |

**Note**: Costs increase with usage. Monitor carefully.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Status**: Ready for Deployment
