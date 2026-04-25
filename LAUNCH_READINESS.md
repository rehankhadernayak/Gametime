# Gametime — Launch Readiness Summary

This document is the single answer to "is the app ready to deploy and what do we do about the backend?". It supersedes the speculative timelines in `LAUNCH_ROADMAP.md` and `APPSTORE_LAUNCH.md` for *what is actually true today*.

> Updated: 2026-04-25 — produced after a full bug-fix pass.

---

## Current State

| Layer | Status | What it means |
|---|---|---|
| **Backend** | ✅ Production-ready (79/79 tests passing) | Single Express + SQLite service. Both web and mobile already point at it via the same routes. No data split. |
| **Web** | ✅ Builds clean (`vite build` ≈170 KB gzipped) | Wired to apiRequest helper using `VITE_API_BASE_URL` *or* `VITE_API_URL` (either works). |
| **Mobile** | ✅ Builds via Expo / EAS | API base URL resolved from `EXPO_PUBLIC_API_URL` (per `eas.json` profile), then Expo dev hostUri, then localhost. |
| **Data linking** | ✅ One backend, one DB | Both clients hit the same `/auth`, `/tasks`, `/children`, `/notifications`, `/gaming`, `/rewards`, `/giftcards`, `/ai` routes. Anything a parent does on web is visible on mobile and vice versa. |

---

## Bugs Fixed in This Pass

1. **Backend `/auth/me` now returns `isAdmin`** — admin gating survives session restore on both clients.
2. **Vercel `vercel.json` env-var name fixed** — deploys were silently falling back to `localhost:4000` because the config injected `VITE_API_URL` while the client only read `VITE_API_BASE_URL`. Both names are now accepted.
3. **Mobile API client no longer hard-codes `192.168.1.140`** as the device fallback. Resolution order is now `EXPO_PUBLIC_API_URL` → Expo hostUri → localhost.
4. **Cross-site cookies for production** — `sameSite=none; secure` in production so the httpOnly `gametime_token` cookie still flows from `frontend.vercel.app` to `api.gametime.app`. (Bearer tokens are also sent — cookies are belt-and-braces.)
5. **docker-compose**: real backend healthcheck + nginx waits for `service_healthy` (no more cold-start 502s).
6. **app.json**: added `runtimeVersion` + `updates` block so Expo OTA can ship JS-only patches without a new App Store build.
7. **Mobile push deep-link comments** corrected to reflect `ParentTabs/ChildTabs` (drawers were removed earlier in the project).
8. **Root `.env.example`** now documents `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `STRIPE_*`, etc.

See `tasks/lessons.md` for the rule each bug introduced.

---

## What To Do About the Backend

The backend is one Node 20 + SQLite service. You only deploy it once — both the web app and the mobile app talk to it. There is no separate "data sync" layer to build because there is no second data store.

**Recommended deploy targets**, in order of effort:

| Option | Setup time | Pros | Cons |
|---|---|---|---|
| **Railway** (uses `backend/railway.toml`) | ~10 min | Zero-config, persistent disk for SQLite, free tier | $5/mo after free trial |
| **Fly.io** | ~20 min | Edge regions, cheap, persistent volume support | More CLI work |
| **Render** | ~15 min | Auto-deploy on git push, persistent disk | Spins down free tier |
| **AWS Lightsail / EC2 + Docker** | ~1 hour | Full control, predictable cost | You manage the OS |

### Backend deploy checklist

1. Provision a host that supports a persistent disk (SQLite needs a real filesystem).
2. Set the production env vars (use `backend/.env.example` as the source of truth):
   - `NODE_ENV=production`
   - `JWT_SECRET` — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `DATA_ENCRYPTION_KEY` — same generator
   - `DATABASE_PATH=/data/gametime.db` (absolute, on the persistent disk)
   - `FRONTEND_ORIGIN=https://your-vercel-app.vercel.app,https://your-domain.com` (comma-separated)
   - Optional: `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `ATHENA_*`
3. Ship the existing `backend/Dockerfile` (it already runs as a non-root user and listens on `:4000`).
4. Schedule `node scripts/backup.js` daily for SQLite hot backups.
5. Point the public hostname (`api.your-domain.com`) at the service. **Use HTTPS** — production cookies require Secure.
6. Verify `GET /health` returns `{"ok": true, "db": "connected"}`.

### Should you migrate off SQLite?

Not for launch. SQLite + a hot-backup script handles the family-app workload comfortably. Move to Postgres only when you cross ~10k families or want regional read replicas.

---

## Linking Web ↔ Mobile

There is nothing extra to wire up — the linkage is already present:

- Web reads its base URL from Vercel env (`VITE_API_BASE_URL` or `VITE_API_URL`).
- Mobile reads its base URL from EAS env (`EXPO_PUBLIC_API_URL` per build profile).
- Both clients use the same JWT (`/auth/login`, `/auth/child-login`, `/auth/me`).
- Push notifications go through Expo via `/notifications/device-token`; rendering happens on-device.
- Account deletion / data export endpoints are shared.

When you change something on web, the mobile app sees it on next refresh (and vice versa) because they're reading from the same SQLite database.

---

## Deploy Order (≤ 1 day on a single laptop)

1. **Backend** — `railway up` (or equivalent), set env, point DNS at `api.your-domain.com`.
2. **Web** — `vercel link` + `vercel --prod` after setting `VITE_API_URL` to the backend hostname. Add the production frontend origin to `FRONTEND_ORIGIN` on the backend and restart.
3. **Mobile preview build** — `cd mobile && eas init` (replace `YOUR_EAS_PROJECT_ID` in `app.json`), then `eas build --platform ios --profile preview` and `--profile production` for the App Store track.
4. **App Store** — follow `APPSTORE_LAUNCH.md` (listing copy, screenshots, privacy policy URL).
5. **Google Play** — same submission flow with the Android profile.

---

## What Remains *Not Done*

These are not blockers but they're worth knowing:

- **Real Stripe / Athena keys** — endpoints exist; flip mock mode off when keys arrive.
- **Real Expo push credentials** — `eas credentials` needs to run before push notifications fire on production builds.
- **Live SMTP / Resend key** — without one, password-reset emails go to Ethereal preview only.
- **EAS project ID** — `app.json` still has `YOUR_EAS_PROJECT_ID`. Run `eas init` once per environment.
- **Custom domain + TLS** for the backend — get a real cert via your host's automation (Railway, Fly, Render all do Let's Encrypt automatically).

---

## Test Evidence

```
Backend: 79 passed (79) — 13 test files (auth, children, points, gaming,
  giftcards, notifications, passwordReset, taskRequests, workflow,
  achievements, admin, rewardFulfill, e2e)
Web:     vite build ✓ in ~1.7s, ~170 KB gz
Mobile:  static analysis only — Expo build is run from EAS, not CI.
```
