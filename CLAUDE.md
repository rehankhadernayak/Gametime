# Gametime — Claude Working Rules

> This file is read at the start of every session. Rules here are non-negotiable.
> When a mistake is corrected, append a rule to `tasks/lessons.md` immediately.

---

## Project Overview

**Gametime** is a Singapore family app where children earn gaming credits (Roblox, Steam, Razer Gold) by completing chores and homework. Parents set tasks, children submit photo/video evidence, AI reviews it, parents approve, children earn Reward Points (RP) or Giftcard Points (GP).

**Three-layer architecture:**
- `backend/` — Node.js + Express + SQLite (ES modules, `.js`)
- `frontend/` — React + Vite web app (parent + child dashboards)
- `mobile/` — React Native + Expo (iOS + Android)

---

## Tech Stack Quick Reference

| Layer | Key Tech | Notes |
|---|---|---|
| Backend | Express, SQLite (better-sqlite3 + sqlite3), Pino, Zod, JWT, bcryptjs | ES modules (`import/export`), not CommonJS |
| Frontend | React 18, Vite, CSS custom properties | No UI framework — plain CSS + design tokens |
| Mobile | Expo SDK 51, React Navigation (Drawer + Stack), expo-secure-store | Expo managed workflow |
| AI | Anthropic SDK, Claude claude-opus-4-5 | Vision review + streaming chat |
| Giftcards | Athena API (mock mode by default) | `ATHENA_ENABLED=false` until keys provided |
| Auth | JWT (httpOnly cookies on web, expo-secure-store on mobile) | |
| Logging | Pino (prod: NDJSON, dev: pino-pretty) | Never use console.log in backend |
| Email | Nodemailer | Needs real SMTP env vars to send |

---

## Workflow Rules

### 1. Plan Before Building
- For any non-trivial task, enter plan mode first
- Write the plan to `tasks/todo.md` before touching code
- Stop and re-plan if implementation goes sideways
- Ask: "Would a staff engineer approve this approach?"

### 2. Use Subagents Liberally
- Offload research, codebase exploration, and parallel analysis to specialised agents
- Use `Explore` agent for finding files/patterns before editing
- Use `Plan` agent for architecture decisions
- One clear task per subagent invocation

### 3. Self-Improvement Loop
- After **every correction**, immediately append a rule to `tasks/lessons.md`
- Review `tasks/lessons.md` at the start of complex sessions
- Format: `### [date] — [short title]` + what happened + the rule

### 4. Verify Before Done
- Never mark a task complete without confirming the change does what it says
- For backend: check the route actually exists and is wired to the router
- For frontend: confirm the component is imported and rendered
- For DB changes: verify the migration runs without error
- Run `grep` to confirm the change landed in the right place if uncertain

### 5. Demand Elegance
- For non-trivial changes, ask: "Is there a simpler way?"
- If the solution feels hacky, it probably is — find the clean version
- Prefer editing one place over editing five

### 6. Autonomous Bug Fixing
- When given a bug report, investigate first (read logs, trace the call, find the root cause), then fix
- Don't ask for permission to look at files — just look
- Point to the exact line when explaining a fix

---

## Task Management

- **Plan file:** `tasks/todo.md` — always update this when starting or completing work
- **Lessons file:** `tasks/lessons.md` — append after every correction
- Mark tasks `[x]` when complete, `[~]` when in progress, `[ ]` when not started
- Add a `## Session Notes` section at the bottom of `todo.md` after major sessions

---

## Core Coding Principles

### Always
- Read a file before editing it (the Edit tool requires this — never skip)
- Use ES module syntax (`import/export`) — this is not CommonJS
- Use `logger` (from `backend/src/utils/logger.js`) not `console.log` in backend
- Validate inputs with Zod in new backend routes
- Add rate limiting to new public endpoints
- Gate parent-only endpoints with `if (req.auth.role !== 'parent')`
- Use `apiRequest()` helper in frontend — never raw `fetch()`

### Never
- Import `logger` from inside `backend/src/config/env.js` (circular import — use `process.stderr.write` there)
- Use `console.log` / `console.error` anywhere in the backend
- Hardcode colours, fonts, or spacing in components — use CSS custom properties from the design system
- Modify the database schema without adding a migration in `db/init.js`
- Commit `.env` files or secrets

### Database Rules
- All schema changes go in `backend/src/db/init.js` using `ensureColumn()` or `ensureTable()` helpers
- Never use raw `db.prepare` without error handling
- Foreign key constraints are ON — respect parent/child relationships
- SQLite is better-sqlite3 (sync) for most ops; async `sqlite` wrapper used for some services — check which one a file uses before editing

### Frontend Rules
- All CSS lives in the component's `.css` file or in `index.css` global tokens — no inline style objects for layout
- Use `useAuth()` hook for token — never read from localStorage directly
- Components never manage their own toast — use the global `useToast()` hook

### Mobile Rules
- Use `expo-secure-store` for token storage — never AsyncStorage for sensitive data
- Safe area insets required on all screens
- Minimum touch target: 48×48px

---

## Current Project State (as of March 2026)

### Done ✅
Backend API (fully complete), Auth system, Tasks + evidence + AI review, Rewards (RP + GP), Gaming sessions + caps, Giftcard infrastructure (Athena, mock mode), Notifications (push + in-app + preferences), AI assistant (parent + child + insights), Web frontend (11 pages), Mobile navigation shell (14 screens), Design system docs, Component logic specs, Figma prompts, Copywriting, Hard app blocking (server-driven soft cap with mobile polling)

### Half-Built ⚠️
UI/design pass (design system not yet applied to code), Mobile screen implementations (shells only), Email delivery (needs SMTP creds), Athena (needs API keys + enable), Push notifications (needs Expo credentials)

### Not Started ❌
Stripe integration for GP top-up, Password reset flow, Onboarding wizard (4-step), Child avatars (upload + storage), Weekly email digest, Admin/ops tooling, PDPA data export, Achievements + streaks + leaderboards

---

## File Map (Key Files)

```
backend/
  src/
    app.js                    — Express app, middleware, health check
    server.js                 — HTTP server, startup
    config/env.js             — All env vars (crash-fast in prod)
    db/init.js                — Schema migrations (add columns here)
    db/connection.js          — DB singleton
    controllers/              — Route handlers (thin — logic in services)
    services/                 — Business logic
      taskService.js          — Task CRUD, evidence, AI review triggers
      gamingService.js        — Sessions, caps, conversion
      notificationService.js  — Create/send/prefs
      giftcardService.js      — Athena API, GP wallet
      aiService.js            — Parent Claude assistant
      aiChildService.js       — Child Claude assistant
      aiReviewService.js      — Vision evidence review
      aiInsightsService.js    — Family insights
      pushService.js          — Expo push delivery
      emailService.js         — Nodemailer
    routes/                   — Route definitions + rate limiters
    middleware/
      auth.js                 — JWT verify, req.auth population
      errorHandler.js         — Centralized error handling
      rateLimit.js            — Per-endpoint limiters
    utils/logger.js           — Pino singleton
    jobs/taskExpirationJob.js — Cron: expire overdue tasks
  scripts/backup.js           — SQLite hot backup

frontend/
  src/
    pages/                    — One file per page
    components/               — Shared UI components
    hooks/                    — useAuth, useToast, etc.
    utils/api.js              — apiRequest() helper

mobile/
  src/
    navigation/               — Stack + Drawer setup
    screens/                  — One file per screen
    components/               — Shared RN components
    hooks/                    — usePushNotifications, useAuth
    context/AuthContext.js    — Auth state + token management

docs/design/
  design-system.md            — All tokens, colours, typography
  copywriting.md              — All landing page copy
  component-logic.md          — State machines + TS interfaces for 5 key components
  figma-prompts.md            — 5 Figma Make prompts
```

---

## The Self-Improvement Instruction

After any correction or discovered mistake, add to `tasks/lessons.md`:

```
### YYYY-MM-DD — [Short title of mistake]
**What happened:** [one sentence]
**Rule:** [the rule that prevents recurrence]
```

The goal: this file grows over time and I never make the same mistake twice on this project.
