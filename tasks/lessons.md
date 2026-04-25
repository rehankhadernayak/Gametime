# Gametime — Lessons Learned

> Append here after every correction. Format: date, title, what happened, rule.
> Goal: never make the same mistake twice on this project.

---

### 2026-03-11 — Read file before editing
**What happened:** Edit tool threw "File has not been read yet" when trying to edit `pushService.js` and `notificationsRoutes.js` without reading them first.
**Rule:** Always call `Read` on a file before calling `Edit` on it, even if you think you know the contents. No exceptions.

---

### 2026-03-11 — No logger import inside env.js (circular dependency)
**What happened:** `logger.js` imports from `env.js` for config. Importing `logger` back into `env.js` for dev warnings creates a circular import that crashes the server on boot.
**Rule:** `env.js` must never import from `utils/logger.js`. Use `process.stderr.write(...)` for any warnings or errors inside `env.js`.

---

### 2026-03-11 — SQLite backup: use hot backup API, not file copy
**What happened:** Considered using `cp` to copy the `.db` file for backups, but SQLite WAL mode means a file copy can capture a partially-written state.
**Rule:** Always use `db.driver.backup(destPath, callback)` (the SQLite online backup API) for database backups. It is safe to run while the server is live. Never `cp` a live SQLite file.

---

### 2026-03-11 — notifInitialised must be a ref, not state
**What happened:** Using `useState` for the "has the server load resolved?" flag in `SettingsPage.jsx` would cause an extra render, which triggers the debounced save effect before the server response has actually populated the `notif` state — saving stale defaults back to the server.
**Rule:** Use `useRef` (not `useState`) for flags that track lifecycle events (like "has initial load completed?") where you do NOT want a re-render on change. The check is `if (!notifInitialised.current) return` inside the effect.

---

### 2026-03-11 — pino-http: exclude health check from auto-logging
**What happened:** Without the `autoLogging.ignore` option, every uptime ping to `/health` floods the log with noise.
**Rule:** When configuring `pino-http`, always add `autoLogging: { ignore: (req) => req.url === '/health' }` to suppress health check log spam.

---

### 2026-03-11 — DATABASE_PATH crash-fast only in production
**What happened:** The `env.js` crash-fast guard for `DATABASE_PATH` was added correctly for production, but the condition must check `NODE_ENV === 'production'` so local dev still works with relative paths.
**Rule:** Crash-fast env guards that don't apply to local development must be wrapped in `if (process.env.NODE_ENV === 'production')`. Never make a production-only requirement block local dev startup.

---

### 2026-03-11 — Better-sqlite3 is synchronous; sqlite is async — check which one a file uses
**What happened:** The codebase uses both `better-sqlite3` (synchronous, `.prepare().run()`) and the `sqlite` async wrapper (`.run()` returns a Promise). Mixing them in the same file causes silent failures or unhandled promise rejections.
**Rule:** Before adding any DB call to a file, check the import at the top. `better-sqlite3` = sync (no await). `sqlite` wrapper = async (needs await). Never mix patterns in the same service without being explicit.

---

### 2026-03-11 — ES modules only — no require()
**What happened:** Backend uses `"type": "module"` in `package.json`. Using `require()` anywhere throws `ReferenceError: require is not defined`.
**Rule:** This project uses ES modules throughout. Always use `import/export`. Never use `require()`, `module.exports`, or `__dirname` (use `import.meta.url` + `fileURLToPath` for `__dirname` equivalent).

---

### 2026-03-11 — Notification preference gating: children always pass
**What happened:** The `shouldNotify()` function must allow all notifications through for child recipients regardless of preference settings — preferences are a parent-only concept.
**Rule:** In `shouldNotify(recipientType, recipientId, type)`, always return `true` immediately if `recipientType !== 'Parent'`. Never apply parent preference logic to child notification recipients.

---

### 2026-03-11 — Design docs go in /docs/design/ — never modify source code during design phase
**What happened:** The design phase produces 4 markdown documents only. Source code is not touched until the design is approved and implementation begins.
**Rule:** During the design phase, output files to `docs/design/` only. Do not modify any files under `backend/`, `frontend/`, or `mobile/` until the user explicitly starts an implementation task.

---

*Add new lessons below this line after each correction.*

---

### 2026-04-08 — SSE streaming: backend emits `text`/`delta`, not `token`/`token`
**What happened:** ChildAiScreen still used `event.type === 'token'` and `event.token` after the parent screen was fixed. The backend (aiChildService.js) emits `{ type: 'text', delta: string }` consistently with aiService.js.
**Rule:** Both AI streaming services emit `{ type: 'text', delta }`. Mobile screens must listen for `event.type === 'text'` and read `event.delta`. Never use `event.token`.

---

### 2026-04-08 — Field name mismatch: API returns `aiRecommendation`, not `aiVerdict`
**What happened:** ParentHomeScreen.ApprovalRow used `task.aiVerdict` which is undefined — the API (listTasksForParent) returns `aiRecommendation`. The badge always showed "⚠ Review" regardless of actual AI result.
**Rule:** The tasks list API returns `aiRecommendation` (values: 'Approve', 'Reject', 'NeedsParentReview'). Never reference `aiVerdict` or `aiStatus` as top-level task fields; use `aiRecommendation`.

---

### 2026-04-08 — Evidence data is NOT returned in the task list response
**What happened:** ParentApprovalsScreen checked `task.evidenceData` which is always undefined because `listTasksForParent` only returns `hasEvidence` (0/1 flag) to avoid shipping large base64 blobs in every list call. Evidence must be fetched separately via `GET /tasks/evidence/:completionId`.
**Rule:** The task list endpoint only returns `hasEvidence` (flag), `completionId`, and `evidenceType`. Actual evidence bytes must be fetched via `/tasks/evidence/:completionId` using an authenticated request with `Authorization: Bearer <token>` header. In React Native, convert the ArrayBuffer response to base64 manually (no FileReader available).

---

### 2026-04-08 — EvidenceReviewPanel called non-existent backend routes
**What happened:** The web EvidenceReviewPanel was fully built but called `GET /tasks/:taskId/submission` and `POST /tasks/:taskId/review` — neither existed in the backend. The component was broken in production.
**Rule:** After building a new component that calls custom API routes, immediately verify those routes exist in `backend/src/routes/`. If they're new, add both the controller function in `controllers/` and the route registration in `routes/`. Don't assume existing approve/reject routes will be called under a different URL.

---

### 2026-04-11 — Tab screen name mismatch in navigate()
**What happened:** `ParentHomeScreen` called `navigation.navigate('ParentAi')` but the bottom-tab screen is registered as `'ParentAiTab'`. The navigate call silently failed at runtime.
**Rule:** When a tab screen is inside a bottom-tab navigator, its registered name (e.g. `'ParentAiTab'`) must be used exactly when navigating to it. For nested navigation from a sibling stack screen, use `navigate('ParentTabs', { screen: 'ParentAiTab' })`. Audit all navigate() calls against the actual screen names in RootNavigator.js after any nav refactor.

---

### 2026-04-11 — headerShown: true on tabs with gradient-header screens causes double headers
**What happened:** Adding `headerShown: true` to the tab navigator screenOptions produces a double header for screens that draw their own LinearGradient header (e.g. ParentTasksScreen, ChildTasksScreen, ChildRewardsScreen). The internal gradient header was designed for `headerShown: false`.
**Rule:** If any tab screen has an internal gradient/branded header, keep `headerShown: false` on the tab navigator and add notification/account nav within the screens' own header rows instead. Only use the tab navigator header for screens that use the generic `Screen` component (no visual header).

---

### 2026-04-25 — `/auth/me` must surface `is_admin` for parents
**What happened:** Login responses included `isAdmin` and the JWT payload had `isAdmin` but `GET /auth/me` did not. After a hard refresh / token-only restore, the web App.jsx hydrated `auth.user` without `isAdmin`, hiding the Admin nav item and locking admins out of `/admin` until they logged in again. Same for mobile AccountScreen.
**Rule:** Any session-restore/me endpoint must return every user attribute the client uses for routing, role-gated UI, or feature flags. Mirror the login response shape exactly. Coerce SQLite ints to booleans (`Boolean(row.is_admin)`) so JSON consumers don't see `0`/`1` for boolean fields.

---

### 2026-04-25 — Vercel `vercel.json` env keys must match what `client.js` actually reads
**What happened:** `vercel.json` set `VITE_API_URL` for production / preview / development, but `frontend/src/api/client.js` only read `VITE_API_BASE_URL`. Production deploys would silently fall back to `http://localhost:4000`, breaking every API call from the deployed web app.
**Rule:** Whenever `vercel.json` (or any env-injection config) defines a variable, grep the source for the exact key. The web client now accepts both `VITE_API_BASE_URL` and `VITE_API_URL` so either name keeps working. Also: prefer `rewrites` to deprecated `routes` and stop hard-coding plaintext env defaults in `vercel.json` (set them in the Vercel dashboard per-environment).

---

### 2026-04-25 — Next.js App Router: `useSearchParams` needs Suspense for static prerender
**What happened:** Building `web-next` failed because `ResetPassword` and `SettingsPage` use `useSearchParams` (via the Next nav shim) without a parent `<Suspense>` boundary, triggering Next’s CSR bailout error during static generation.
**Rule:** Any client component tree that calls `useSearchParams()` must be wrapped in `<Suspense fallback={...}>` at the route (or a dedicated shell) so prerender can complete. Apply the same pattern anywhere `useSearchParams` is used under the App Router.

---

### 2026-04-25 — NavBar.css had a broken block comment (Turbopack/CSS parser)
**What happened:** The file opened with `/* ═...` then a nested `/* NavBar...` without closing the outer comment, so the rest of the file was swallowed as a comment. Next’s CSS parser then failed on the stray `*/`.
**Rule:** Keep CSS block comments well-formed (one opening `/*`, one closing `*/` per block). Avoid decorative multi-line comment headers that nest another `/*` inside.

---

### 2026-04-25 — Mobile API client cannot ship a hard-coded LAN IP
**What happened:** `mobile/src/api/client.js` defaulted `DEFAULT_DEVICE_API_URL` to `http://192.168.1.140:4000` — a developer's local LAN address baked into the source. That value would have been the production fallback for any device that loaded the app without an `EXPO_PUBLIC_API_URL` build env or a saved override.
**Rule:** Never commit private IPs as defaults. Resolve the API URL in this order: (1) `process.env.EXPO_PUBLIC_API_URL` (set per `eas.json` build profile), (2) Expo dev `hostUri` for `expo start` flows, (3) `localhost:4000` as the safe last-resort. The in-app ApiSettings override always wins.
