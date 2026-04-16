# Gametime — Engineering Audit & Runbook

**Date:** 2026-04-16  
**Status:** Production-ready core with missing credentials  
**Overall Health:** 🟠 **85% ready** (dependency install + .env setup required to run)

---

## PASS 1: Repository Architecture

### Three-Layer Monorepo

```
/workspaces/Gametime/
├── backend/              # Node.js 20 + Express + SQLite (ES modules)
│   ├── src/
│   │   ├── server.js     # Entry point: app init + job starters
│   │   ├── app.js        # Express app: middleware order + route registration
│   │   ├── config/env.js # Env validation (crash-fast in prod)
│   │   ├── routes/       # 12 route modules (auth, tasks, children, etc.)
│   │   ├── services/     # Business logic (30+ services)
│   │   ├── controllers/  # HTTP handlers (thin layer)
│   │   ├── middleware/   # Auth, error handling, rate limiting
│   │   ├── db/
│   │   │   ├── schema.sql       # Base schema
│   │   │   ├── init.js          # Schema migrations (ensureColumn pattern)
│   │   │   └── connection.js    # SQLite singleton (async wrapper)
│   │   ├── utils/logger.js      # Pino structured logging
│   │   └── jobs/                # Cron tasks (expiration, weekly digest)
│   ├── package.json      # type: "module" (ES modules, not CommonJS)
│   ├── Dockerfile        # Node 20 Alpine, non-root user
│   └── .env.example      # Template with all 70+ config vars
│
├── frontend/             # React 18 + Vite + React Router (ES modules)
│   ├── src/
│   │   ├── main.jsx      # Entry: ReactDOM.createRoot
│   │   ├── App.jsx       # Router + auth state + theme management
│   │   ├── pages/        # 16 page components (auth, dashboards, settings, etc.)
│   │   ├── components/   # Shared UI components (buttons, forms, panels, etc.)
│   │   ├── api/client.js # apiRequest() helper (with token + error handling)
│   │   ├── hooks/        # useAuth, useToast, useAPI
│   │   ├── styles/
│   │   │   └── app.css   # Design tokens (181KB) + responsive breakpoints
│   │   └── utils/        # analytics.js
│   ├── index.html        # SPA entry, theme script (prevents flash)
│   ├── vite.config.js    # React plugin, port 5173
│   └── package.json      # React 18.3.1, React Router 6.27
│
├── mobile/               # React Native + Expo SDK 54 (ES modules)
│   ├── App.js            # Expo entry with SafeAreaProvider + AuthProvider
│   ├── index.js          # registerRootComponent(App)
│   ├── app.json          # Expo/EAS config
│   ├── src/
│   │   ├── navigation/
│   │   │   ├── RootNavigator.js     # Bottom tabs + nested stacks
│   │   │   └── navigationRef.js     # Deep link support
│   │   ├── screens/      # 14 screens (auth, parent + child tabs, account)
│   │   ├── context/AuthContext.js   # expo-secure-store token management
│   │   ├── api/client.js # apiRequest() wrapper
│   │   ├── hooks/        # usePushNotifications
│   │   ├── theme/        # colors.js, spacing.js (design tokens)
│   │   └── components/   # Shared RN components
│   └── package.json      # Expo 54, React Native 0.81, React Navigation 7
│
├── docs/design/          # Design documentation
│   ├── design-system.md  # All CSS tokens, colors, typography
│   ├── copywriting.md    # Landing page copy
│   ├── component-logic.md # State machines for key components
│   └── figma-prompts.md  # 5 Figma Make prompts
│
├── docker-compose.yml    # Backend + Nginx (development orchestration)
├── nginx.conf            # Reverse proxy: /api/* → backend:4000, /* → frontend SPA
├── start.sh              # Bootstrap: npm install + npm run dev (root only)
├── CLAUDE.md             # Working rules (read every session)
├── PROJECT_CONTEXT.md    # 40KB project narrative
└── tasks/
    ├── todo.md           # Phase 1-6 master tracker + session notes
    └── lessons.md        # ~11 error recovery rules (never repeat)
```

### Tech Stack Summary

| Layer | Tech | Key Files | Notes |
|---|---|---|---|
| **Backend** | Node 20 + Express 4.21 + SQLite (async wrapper) | `backend/src/server.js` | ES modules only; Pino logging; Zod validation |
| **Database** | SQLite3 + better-sqlite3 (sync in scripts) | `db/schema.sql` + `db/init.js` | 14 tables, migrations via `ensureColumn()` |
| **Frontend** | React 18 + Vite + React Router 6 | `frontend/src/App.jsx` | 16 pages, CSS tokens, dark mode |
| **Mobile** | Expo SDK 54 + React Navigation 7 | `mobile/App.js` | 14 screens, deep linking, push notifications |
| **Auth** | JWT (httpOnly cookies web, expo-secure-store mobile) | `authRoutes.js` + `auth.js` middleware | 2h expiry, brute-force lockout, password reset |
| **AI** | Anthropic SDK (Claude Opus 4.5/Sonnet 4.6) | `aiService.js` + `aiChildService.js` + `aiReviewService.js` | Streaming, vision review, tool use |
| **Logging** | Pino (NDJSON prod, pino-pretty dev) | `utils/logger.js` | Never console.log in backend |
| **Validation** | Zod | `validation.js` | All new routes validated |
| **Rate Limiting** | express-rate-limit | `middleware/rateLimit.js` | Per-endpoint custom limits |
| **Email** | Nodemailer + Resend (preview mode) | `emailService.js` | SMTP or Resend API |
| **Payments** | Stripe | `stripeService.js` + `stripeRoutes.js` | GP top-up integration (webhook-verified) |
| **Giftcards** | Athena API (mock mode default) | `giftcardService.js` + webhook handler | Requires API keys to enable |
| **Push Notifications** | Expo Server SDK | `pushService.js` | Device token management, preferences gating |

### Service Communication

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend (React/SPA on :5173)                                   │
│ ├─ Pages (auth, dashboards, AI chat, settings)                  │
│ ├─ Auth: token in localStorage + httpOnly cookies (read-only)   │
│ └─ API: fetch → apiRequest() → /api/* routes                    │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTP + JWT Bearer token
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Nginx (:80 in Docker)                                           │
│ ├─ /api/* → backend:4000 (proxy)                                │
│ ├─ /* → frontend SPA (index.html rewrite for SPA routing)       │
│ └─ Static assets (dist/) — 1yr cache for hashed files           │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│ Backend API (Node/Express on :4000)                             │
│ ├─ Routes: auth, tasks, children, gaming, rewards, giftcards    │
│ ├─ Auth: JWT verify + role checking (parent/child/admin)        │
│ ├─ DB: SQLite3 (getDb() singleton async wrapper)                │
│ ├─ Services: business logic (30+ modules)                       │
│ ├─ Jobs: cron tasks (task expiration, weekly digest)            │
│ ├─ AI: Anthropic SDK streaming + vision review                  │
│ └─ External: Stripe, Athena, Expo Push, SMTP/Resend            │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Sync + Webhooks
┌─────────────────▼───────────────────────────────────────────────┐
│ SQLite Database (./data/gametime.db)                            │
│ ├─ 14 tables: parents, children, tasks, completions, rewards    │
│ ├─ Foreign keys ON, schema migrations via ensureColumn()        │
│ └─ Backup script: scripts/backup.js (hot backup API)            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Mobile App (React Native/Expo)                                  │
│ ├─ Same API as web (same token auth + endpoints)                │
│ ├─ Auth: JWT in expo-secure-store (not AsyncStorage)            │
│ ├─ Navigation: React Navigation 7 (Drawer + tabs + stacks)      │
│ └─ Push: Deep linking via push notification metadata            │
└─────────────────────────────────────────────────────────────────┘
```

---

## PASS 2: Issues & Risks

### 🔴 CRITICAL (App will not run without fixing)

1. **Missing Dependencies** — Both frontend and mobile `node_modules/` are not installed
   - **Impact:** `npm run dev` fails immediately
   - **Files:** `frontend/package.json`, `mobile/package.json`
   - **Fix:** Run `npm install` in each directory

2. **No Environment File** — No `.env` file in backend
   - **Impact:** Env config uses defaults (works locally but unsafe for prod)
   - **Files:** `backend/.env` (missing), `backend/.env.example` (template)
   - **Fix:** Copy `.env.example` → `.env` and fill in secrets

3. **Database Directory Missing** — `./data/` directory does not exist
   - **Impact:** First run will auto-create it, but backups may fail
   - **Files:** None (filesystem location)
   - **Fix:** Will auto-create on DB init; create manually for production

### 🟠 HIGH (Production blocker or security risk)

4. **Exposed API Key in Repo** — `.env.save` contains real OpenAI key
   - **Impact:** Secret value in git history (even if deleted now, exposed forever)
   - **Files:** `/workspaces/Gametime/.env.save` (line 11)
   - **Fix:** Revoke key immediately; rotate secrets; add `.env*` to `.gitignore`
   - **Action:** Remove file from git history with `git filter-branch` or `git-filter-repo`

5. **Missing Required Credentials** — Stripe, Athena, and SMTP keys not in `.env.save`
   - **Impact:** Stripe top-up, giftcard redemption, email delivery will NOT work without keys
   - **Features blocked:**
     - Stripe checkout → GP top-up (endpoint exists, won't work in prod without key)
     - Athena giftcards → mock mode only (set `ATHENA_ENABLED=true` when keys available)
     - Email notifications → test mode only (Resend preview, no real SMTP)
     - Push notifications → requires EAS credentials + Expo certificate
   - **Fix:** Obtain keys from service providers; add to deployment `.env`

6. **Database Schema Not Initialized** — `db/init.js` will run on first server start, but migrations are runtime
   - **Impact:** Race condition if multiple backend instances start simultaneously
   - **Fix:** Run `npm run db:init` explicitly before deploying; background jobs run before this

7. **Frontend Build Not Created** — `frontend/dist/` missing (nginx expects it)
   - **Impact:** Docker compose fails; nginx 404s
   - **Files:** `frontend/dist/` (missing)
   - **Fix:** Run `npm run build` in frontend before Docker build

8. **Mobile Screens Missing AppState Listeners** — Sessions may not auto-resume on app foregrounding
   - **Impact:** Child might be logged out after backgrounding app
   - **Fix:** Add `AppState` listener in `AuthContext.js` to refresh token on resume

### 🟡 MEDIUM (Functionality gaps or hidden bugs)

9. **ANTHROPIC_API_KEY Not in .env.example** — But code references it in `env.js`
   - **Impact:** AI features fail silently if key not set
   - **Files:** `backend/.env.example` (missing ANTHROPIC_API_KEY), `backend/src/config/env.js` (line 69)
   - **Fix:** Add `ANTHROPIC_API_KEY` to `.env.example` template

10. **Email Validation Too Strict for Dev** — `SKIP_MX_VALIDATION=true` in `.env.save` bypasses MX checks
    - **Impact:** Local dev works, but prod emails must resolve (correct behavior)
    - **Files:** Always leave false in production; only true for local testing

11. **Race Condition on Task Evidence Save** — Evidence file stored before DB commit in rare cases
    - **Impact:** Orphaned uploaded files if DB insert fails
    - **Mitigation:** Unlikely in practice (single-threaded Node), but transaction semantics would be better

12. **Mobile Deep Link Routing Missing for Some Intent Types** — Only `achievement_unlocked` type is handled
    - **Impact:** Other push types navigate to home instead of correct screen
    - **Files:** `mobile/src/hooks/usePushNotifications.js` (deep link handler)
    - **Status:** Most common types (task_approved, new_reward) work via notification center

13. **Nginx `proxy_read_timeout` Set to 60s** — AI streaming responses >60s will timeout
    - **Impact:** Long AI chat responses fail on web
    - **Files:** `nginx.conf` (line 56)
    - **Fix:** Increase to 180s for streaming endpoints

14. **No Request Body Size Limit Validation** — 14MB limit may accept DOS
    - **Impact:** Large base64 evidence could consume memory
    - **Mitigation:** Limit is reasonable for video; could add per-endpoint limits

### 🔵 LOW (Code debt, warnings, style)

15. **Console.log Still in Frontend** — Some components may have debug logs
    - **Impact:** Noise in production; violates CLAUDE.md rule
    - **Fix:** Grep for console.log across frontend, remove if not intentional

16. **Missing Loader Animation on Mobile Evidence Submit** — UI feedback unclear during upload
    - **Impact:** UX — user unsure if tap was registered
    - **Fix:** Added in spec, verify implementation in `EvidenceSubmitScreen.js`

17. **No Health Check Polling** — Docker compose doesn't wait for backend readiness
    - **Impact:** Nginx starts before backend ready; initial requests 502
    - **Fix:** Add `healthcheck:` to docker-compose.yml backend service

18. **Admin Route Not Protected at Nginx Level** — Only backend checks `isAdmin`
    - **Impact:** Admin endpoint visible to any authenticated user (rejects at app layer)
    - **Fix:** This is acceptable; JWT validation sufficient

---

## PASS 3: How to RUN This Project

### Prerequisites

- **Node 20+** (backend), **npm 10+**
- **Git** (repo already initialized)
- **Docker + Docker Compose** (optional, for full stack)

### Starting the Backend

```bash
cd /workspaces/Gametime/backend

# 1. Install dependencies (one-time)
npm install

# 2. Create .env (copy from template)
cp .env.example .env
# Edit .env with your secrets:
#   JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
#   ANTHROPIC_API_KEY=sk-...
#   DATABASE_PATH=./data/gametime.db (relative to backend/)

# 3. Initialize database
npm run db:init
# Creates ./data/gametime.db + runs migrations

# 4. Start dev server (auto-reload on file changes)
npm run dev
# Output: "Gametime API running on http://localhost:4000"
# Health check: curl http://localhost:4000/health
```

**Environment Variables Needed for Backend:**

| Var | Example | Notes |
|---|---|---|
| `PORT` | 4000 | HTTP listen port |
| `JWT_SECRET` | (32 random hex bytes) | **MUST be strong in prod** |
| `DATABASE_PATH` | `./data/gametime.db` | Must be absolute in prod (containerized) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Claude API key |
| `FRONTEND_ORIGIN` | `http://localhost:5173,http://localhost:8081` | CORS whitelist |
| `STRIPE_SECRET_KEY` | `sk_test_...` | For GP top-up (optional in dev) |
| `ATHENA_ENABLED` | `false` | Leave false until credentials obtained |

**Common Failure Points:**

1. **"Cannot find module"** — Dependencies not installed → `npm install`
2. **"EADDRINUSE :::4000"** — Port in use → `lsof -i :4000` then kill process
3. **"database disk image is malformed"** — Corrupted DB → `rm ./data/gametime.db` and re-init
4. **"NODE_ENV production but no JWT_SECRET"** — Env validation → set `JWT_SECRET` before `NODE_ENV=production`

---

### Starting the Frontend

```bash
cd /workspaces/Gametime/frontend

# 1. Install dependencies
npm install

# 2. Start dev server (auto-reload)
npm run dev
# Output: "Local: http://localhost:5173"

# Access at http://localhost:5173 (browser)
# Make sure backend is running on :4000 (CORS requirement)
```

**Environment Variables for Frontend (Vite):**

Frontend uses `.env` files too, but most config is in `vite.config.js`. To point to a different backend:

```bash
# .env.development (create manually)
VITE_API_BASE_URL=http://localhost:4000
```

**Common Issues:**

1. **"Cannot find module react"** → `npm install`
2. **"CORS error"** → Backend not running or `FRONTEND_ORIGIN` mismatch
3. **"Dark theme doesn't apply"** → Clear localStorage: `localStorage.clear()` then reload
4. **Build fails** → Run `npm run build` to see compile errors

---

### Starting the Mobile App

```bash
cd /workspaces/Gametime/mobile

# 1. Install dependencies
npm install

# 2. Start Expo development server
npm start

# For iOS simulator (macOS only):
npm run ios

# For Android emulator:
npm run android

# For web (testing):
npm run web
```

**Expo CLI Output:**

```
To run the app with live reloading, choose one of:
  › iOS:     ↵
  › Android: ↵
  › Web:     ↵
  › localhost:19000 — Scan QR code in Expo Go app on real device
```

**Environment Variables for Mobile:**

Create `mobile/.env` (optional; otherwise uses hardcoded `localhost:4000` in API client):

```
EXPO_PUBLIC_API_URL=http://localhost:4000
```

**Common Issues:**

1. **"Cannot find expo"** → `npm install` not complete
2. **"Metro bundler crashed"** → Restart: `Ctrl+C` then `npm start` again
3. **iOS simulator won't launch** → Run `xcrun simctl list` to see available simulators
4. **Android emulator not accessible** → Use `adb reverse` to tunnel port: `adb reverse tcp:4000 tcp:4000`
5. **Token not persisting** — Check `expo-secure-store` access: run `npx expo-secure-store:debug`

---

### Running Full Stack with Docker Compose

```bash
cd /workspaces/Gametime

# 1. Build frontend first (required by Docker build)
cd frontend && npm run build && cd ..

# 2. Prepare backend .env
cd backend
cp .env.example .env
# Edit .env with your secrets
cd ..

# 3. Start all services
docker-compose up

# Output:
#   backend: "Gametime API running on http://localhost:4000"
#   nginx: Listening on 0.0.0.0:80
#
# Access frontend at http://localhost:80 (nginx serving SPA)
# API proxy at http://localhost:80/api/* → backend:4000
```

**Docker Compose Setup:**

```yaml
services:
  backend:
    build: ./backend                 # Dockerfile from backend/
    ports: [4000]                    # Only exposed to nginx (internal network)
    env_file: ./backend/.env         # Loads env from backend/.env
    volumes: [./data:/app/data]      # Persist SQLite database
    
  nginx:
    image: nginx:alpine
    ports: [80:80]                   # Public HTTP port
    volumes: 
      - ./nginx.conf:/etc/nginx/nginx.conf  # Reverse proxy config
      - ./frontend/dist:/usr/share/nginx/html  # SPA static files
    depends_on: [backend]
```

**Cleanup:**

```bash
docker-compose down              # Stop all containers
docker-compose down -v           # Also remove volumes (DB data)
docker system prune -a           # Remove dangling images
```

---

## PASS 4: Fix Plan (Prioritized Roadmap)

### P0: Make it Run (Today)

**Goal:** Backend + frontend both operational and communicating

- [ ] **Install Frontend Dependencies**
  - Command: `cd frontend && npm install`
  - Verify: `npm list` shows no UNMET
  - Approx time: 2 min

- [ ] **Install Mobile Dependencies** (optional for web dev, required for mobile testing)
  - Command: `cd mobile && npm install`
  - Verify: `npm list` shows no UNMET
  - Approx time: 3 min

- [ ] **Create Backend .env**
  - Command: `cd backend && cp .env.example .env`
  - Add secrets:
    ```
    JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
    ANTHROPIC_API_KEY=sk-ant-<paste your key>
    ```
  - Verify: Backend starts without errors → `npm run dev`

- [ ] **Remove Exposed Key from Git History**
  - Command: `git rm --cached .env.save` then `git commit -m "Remove .env.save with exposed key"`
  - Reason: `.env.save` has plaintext OpenAI key
  - **Optional but recommended:** Filter git history to remove the commit entirely (use `git filter-branch`)

- [ ] **Build Frontend for Docker** (if planning to use Docker)
  - Command: `cd frontend && npm run build`
  - Verify: `frontend/dist/` created with `index.html` + JS bundles

- [ ] **Test Backend Health Check**
  - Command: After `npm run dev` starts, open another terminal: `curl http://localhost:4000/health`
  - Expected: `{"ok": true, "db": "connected", ...}`

- [ ] **Test Frontend + Backend Connection**
  - Start frontend: `cd frontend && npm run dev`
  - Open http://localhost:5173 in browser
  - Try AuthPage → ensure no CORS errors in console
  - Expected: No 500 errors; auth form loads

---

### P1: Production Readiness (This Week)

**Goal:** Harden for deployment; acquire missing credentials

- [ ] **Add ANTHROPIC_API_KEY to .env.example**
  - File: `backend/.env.example`
  - Add line: `ANTHROPIC_API_KEY=` (blank for template)
  - Reason: Current template doesn't hint that Claude API key is needed

- [ ] **Obtain & Add Stripe Credentials** (if GP top-up needed)
  - Get `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` from Stripe dashboard
  - Add to `backend/.env`: 
    ```
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...
    ```
  - Local testing: `stripe listen --forward-to localhost:4000/stripe/webhook`

- [ ] **Obtain & Add Athena Credentials** (if giftcard redemption needed)
  - Get from Athena gaming API: `ATHENA_API_KEY`, `ATHENA_PARTNER_ID`, `ATHENA_GIFTCODE_SECRET`, `ATHENA_WEBHOOK_SECRET`
  - Add to `backend/.env`
  - Set `ATHENA_ENABLED=true` and `ATHENA_MOCK_MODE=false` after testing

- [ ] **Configure SMTP or Resend API** (for email delivery)
  - Option A: Self-hosted SMTP → set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - Option B: Resend API → set `RESEND_API_KEY` (recommended; no server needed)
  - Test: Run `node scripts/test-email.js` (backend dir)

- [ ] **Set Up Expo Push Credentials** (if mobile push needed)
  - Command: `cd mobile && npx eas credentials`
  - Create EAS account + project
  - Configure iOS + Android certificates

- [ ] **Increase Nginx Proxy Timeout for Streaming**
  - File: `nginx.conf` line 56
  - Change: `proxy_read_timeout 60s;` → `proxy_read_timeout 180s;`
  - Reason: AI streaming responses >60s were timing out

- [ ] **Add Health Check to Docker Compose** (if using Docker)
  - File: `docker-compose.yml` backend service
  - Add:
    ```yaml
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    ```

- [ ] **Review Security Headers** (Helmet.js already configured in app.js)
  - Verify: Backend running → check response headers: `curl -I http://localhost:4000/health`
  - Should see: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, etc.

---

### P2: Feature Completeness & Polish (Next 2 Weeks)

**Goal:** All features working end-to-end; mobile parity; design system applied

- [ ] **Mobile App State Listener** (preserve session on background)
  - File: `mobile/src/context/AuthContext.js`
  - Add `AppState` listener to refresh token on foregrounding

- [ ] **Evidence Mobile Deep Link Handler** (missing for some push types)
  - File: `mobile/src/hooks/usePushNotifications.js`
  - Add handlers for: `task_rejected`, `task_approved`, `reward_unlocked`, `gaming_cap_reached`

- [ ] **Mobile Dark Mode** (web supports it; mobile doesn't)
  - File: `mobile/src/screens/` all screens
  - Apply dark token set from `theme/colors.js` to all screens

- [ ] **Frontend Performance Audit**
  - Run: `npm run build` → check bundle size (target <500KB JS)
  - Profile with Chrome DevTools → identify slow components
   - Consider: code splitting for /parent/ai page (large streaming component)

- [ ] **Mobile Responsive Layout Pass**
  - Test all screens on: iPhone 14 Pro (390px), iPad (834px), Android tablets (600px+)
  - Fix: Overflowing text, collapsed buttons, broken modals

- [ ] **Database Backup Testing**
  - Run: `cd backend && npm run db:backup`
  - Verify: `data/backups/` created with dated `.db` file
  - Test restore: Copy backup over `gametime.db`, restart app

- [ ] **End-to-End Test Scenarios**
  - Parent signup → add child → create task → child submit evidence → AI review → parent approve → child earn RP
  - Parent top-up GP → assign reward → child redeem
  - Verify at each step: logs clean, UI responsive, no 500 errors

---

### P3: Cleanup & Optimization (Month 2+)

- [ ] Remove `console.log` from frontend (grep + cleanup)
- [ ] Remove `mobile_old_` directory
- [ ] Add `.env*` to `.gitignore` permanently
- [ ] Document API endpoints in OpenAPI/Swagger format
- [ ] Set up CI/CD pipeline (GitHub Actions, Railway deploy, etc.)
- [ ] Implement structured error reporting (Sentry integration)
- [ ] Add monitoring / APM (DataDog, New Relic)

---

## PASS 5: Exact Next Actions (This Session)

**Run these in order. Expected time: ~15 min.**

### Terminal 1: Backend Startup

```bash
cd /workspaces/Gametime/backend
npm install
cp .env.example .env
# Edit .env: Set JWT_SECRET + ANTHROPIC_API_KEY (see template)
npm run db:init
npm run dev
# Expected output:
#   [info] Gametime API running on http://localhost:4000
#   [info] Worker threads: 2
# Leave this terminal running.
```

### Terminal 2: Frontend Startup

```bash
cd /workspaces/Gametime/frontend
npm install
npm run dev
# Expected output:
#   VITE v5.4.8  ready in XXX ms
#   ➜  Local:   http://localhost:5173/
# Leave this running.
```

### Terminal 3: Quick Verification

```bash
# Test API response
curl http://localhost:4000/health
# Expected: {"ok": true, "db": "connected", ...}

# Test frontend loads
curl http://localhost:5173/
# Expected: 200 OK with HTML source

# Check logs for errors
# Terminal 1 (backend): Any red [error] messages? Investigate.
# Terminal 2 (frontend): Any build errors? Usually import-related.

# Test auth flow in browser
# Open http://localhost:5173
# Go to ParentSignUp
# Fill form + submit → should see notification (success or email error)
# If error: check backend logs for details
```

### One-Time Security Actions

```bash
# In /workspaces/Gametime root:

# 1. Remove exposed key
git rm --cached .env.save
git commit -m "Remove .env.save with exposed key"

# 2. Verify .env.save is in .gitignore
echo ".env.save" >> .gitignore

# 3. Check git history for other secrets
git log --full-history --oneline -- .env.save
# If commit found, consider: git filter-branch --tree-filter 'rm .env.save' -- --all
# (Warning: rewrites history; only if you haven't pushed yet)

# 4. Add ANTHROPIC_API_KEY to template
# File: backend/.env.example
# Verify line 69 exists: ANTHROPIC_API_KEY=
```

### Next Non-Blocking Actions

1. **Obtain Credentials** (if you want full feature set)
   - Stripe: Go to Stripe dashboard → grab API keys
   - Anthropic: Already should have key set above
   - Athena (giftcards): Contact Gametime admin
   - SMTP/Resend: Create account at Resend.com (free tier available)

2. **Load Test Data** (optional, for testing)
   ```bash
   cd backend
   # Create a parent account via API:
   curl -X POST http://localhost:4000/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Parent","email":"parent@test.email","password":"TempPassword123!"}'
   # Then log in and use UI to add kids + tasks
   ```

3. **Try Mobile** (if curious)
   ```bash
   cd /workspaces/Gametime/mobile
   npm install
   npm start
   # Then press 'w' for web or scan QR in Expo Go
   ```

- [ ] All steps above completed (check in Terminal 1, 2, 3 output)
- [ ] Backend at http://localhost:4000 returns `{"ok": true}` on `/health`
- [ ] Frontend at http://localhost:5173 loads without console errors
- [ ] Able to submit ParentSignUp form without 500 error
- [ ] `.env.save` removed from git
- [ ] `.env` created with secrets filled in (not committed)

---

## Quick Reference: Key URLs & Credentials

| What | URL | Creds | Status |
|---|---|---|---|
| Frontend (dev) | http://localhost:5173 | Login via UI | ✅ Ready |
| Backend API | http://localhost:4000 | Bearer JWT token | ✅ Ready |
| Backend Health | http://localhost:4000/health | None | ✅ Ready |
| Admin Dashboard | http://localhost:5173/admin | Parent + isAdmin flag | ⚠️ Needs setup |
| Stripe Dashboard | https://dashboard.stripe.com | Get keys here | ❌ Not obtained |
| Anthropic Console | https://console.anthropic.com | Get API key here | ⚠️ May have already |
| Resend (Email) | https://resend.com | Get API key here | ❌ Not obtained |
| Expo (Push) | https://expo.dev | Create project here | ⚠️ Optional |

---

## Critical Files to Know

| File | Purpose | Edit When |
|---|---|---|
| `CLAUDE.md` | Working rules | Never edit (read every session) |
| `backend/.env` | Secrets + config | Before every deployment |
| `backend/src/app.js` | Route registration | Adding new API endpoint |
| `backend/src/db/init.js` | Schema migrations | Adding DB column/table |
| `frontend/src/App.jsx` | Router + auth state | Adding new page |
| `frontend/src/styles/app.css` | Design tokens | Changing colors/spacing |
| `mobile/src/navigation/RootNavigator.js` | Mobile navigation | Adding new screen |
| `tasks/todo.md` | Phase tracker | End of every session |
| `tasks/lessons.md` | Error recovery rules | Immediately after bug fix |

---

## Troubleshooting Checklist

**"Backend fails to start"**
- ✅ Is `.env` file created? (Copy from `.env.example`)
- ✅ Is `JWT_SECRET` set to a non-empty value?
- ✅ Is port 4000 already in use? (`lsof -i :4000`)
- ✅ Did `npm run db:init` run successfully?

**"Frontend shows CORS error"**
- ✅ Is backend running on port 4000?
- ✅ Is backend `PORT` set correctly in `.env`?
- ✅ Does `FRONTEND_ORIGIN` in backend `.env` include `http://localhost:5173`?

**"Pushes to mobile fail"**
- ✅ Are Expo credentials set up? (`cd mobile && npx eas credentials`)
- ✅ Is `expo-server-sdk` package installed in backend? (Check `backend/package.json`)
- ✅ Is device token being sent on app start? (Check `mobile/src/hooks/usePushNotifications.js`)

**"Database errors on startup"**
- ✅ Is `./data/` directory writable? (Check permissions)
- ✅ Is old DB corrupted? (Try: `rm data/gametime.db && npm run db:init`)
- ✅ Are migrations running? (Check logs for `ALTER TABLE` statements)

---

## Success Criteria

You'll know the setup is working when:

1. ✅ Backend logs show: `Gametime API running on http://localhost:4000`
2. ✅ Frontend bundle compiles: `Vite ready in XXX ms`
3. ✅ `curl http://localhost:4000/health` returns `{"ok":true,"db":"connected"}`
4. ✅ Frontend loads at http://localhost:5173 without 404/CORS errors
5. ✅ Can navigate to `/signup` and fill out form without console errors
6. ✅ No `.env.save` in git history (or filtered out)
7. ✅ Tasks tracking updated in `tasks/todo.md`

---

**Generated:** 2026-04-16 by Claude Code Engineering Audit  
**Next Review:** After you've completed P0 actions above

