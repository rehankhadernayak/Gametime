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

---

### 2026-04-25 — dotenv must not override existing process.env
**What happened:** `backend/src/config/env.js` used `dotenv.config({ override: true })`, so `backend/.env` replaced `FRONTEND_ORIGIN` set in the Playwright shell (`http://127.0.0.1:3000`) with the file’s `localhost` list. The browser origin was blocked by CORS and login failed.
**Rule:** Load `.env` without `override: true` so explicit environment variables (CI, agents, containers) always win over file defaults.

---

### 2026-04-25 — web-next: JWT_SECRET for middleware + auth context after login
**What happened:** E2E failed because (1) `middleware.ts` verified `gametime_token` with `process.env.JWT_SECRET`, which was unset in the Next dev process, redirecting every `/parent/*` request to `/login`; (2) login forms called `saveAuth()` (localStorage only) without `setAuth()`, so the first client render still had an empty token and `replace("/login")` fired before hydration.
**Rule:** For local/E2E, run Next with the same `JWT_SECRET` as the API. After successful login/signup, call `setAuth` from `GametimeAuthContext` (not only localStorage). Gate `replace("/login")` on protected pages until `authHydrated` is true so the first paint does not redirect away from a valid session.

---

### 2026-04-25 — Next web-next: `NEXT_PUBLIC_API_URL=localhost` breaks Cloudflare tunnel testing
**What happened:** `apiRequest` used `NEXT_PUBLIC_API_URL` when set (often `http://localhost:4000` in `.env`). Browsers loading the app via `*.trycloudflare.com` still called `localhost:4000`, which failed with "Network request failed. Check backend at http://localhost:4000".
**Rule:** In the browser, resolve the API base at request time: prefer same-origin `/api` when the page host is not loopback but the configured backend URL is loopback; only use an explicit absolute `NEXT_PUBLIC_API_URL` when it matches a real cross-origin deployment.

---

### 2026-04-26 — Next `setTimeout` return type vs browser
**What happened:** `next build` failed with `Type 'number' is not assignable to type 'Timeout'` when storing `ReturnType<typeof window.setTimeout>` in a variable typed from Node's DOM lib mismatch.
**Rule:** For client-only retry timers in Next.js, type the handle as `number | null` (browser timer id) or use `clearTimeout` without storing a `ReturnType<typeof setTimeout>` inferred from Node typings.

---

### 2026-04-26 — Vercel CLI in agents: device login blocks; use VERCEL_TOKEN
**What happened:** `npx vercel whoami` with no credentials started OAuth device flow and waited indefinitely; no Railway/Supabase/JWT values exist in-repo from other agents, so production env could not be pushed interactively.
**Rule:** For non-interactive or CI deploys, use a Vercel token (`VERCEL_TOKEN` / `vercel login --token`) and `vercel link --yes --project <name>`. Never rely on device-code login in headless environments.

---

### 2026-04-26 — Playwright + web-next: pinned Next binary, cookie restore, and navigation races
**What happened:** `npx next dev` in Playwright’s `webServer` pulled a mismatched Next.js and Turbopack failed; clearing `localStorage` left no SPA token so `/parent/dashboard` redirected to login; an async `restoreAuthFromCookieSession()` finished after login and overwrote fresh auth with empty; `switchToChild` navigated before React committed child role so `/child/dashboard` briefly saw `parent` and bounced to login; `useMemo` referenced `serverClockTick` but state was declared as `[, setServer]` causing a runtime ReferenceError on the child dashboard.
**Rule:** Run E2E Next from `web-next/node_modules/.bin/next` after `npm install` in `web-next`. If hydrating auth from cookies after `await`, re-read `localStorage` before applying the restore result so a concurrent login wins. Use `flushSync(() => setAuth(...))` before `router.replace` when switching roles so destination RSC/pages never render with the previous role. Keep `useMemo` dependency identifiers aligned with actual `useState` bindings.

---

### 2026-04-26 — web-next: legacy `NavBar` needs `AuthProvider` (client wrapper)
**What happened:** After parent login, Next.js showed "useAuth must be used within AuthProvider" because `NavBar.jsx` calls `useAuth()` but the App Router root layout is a Server Component and could not mount `AuthProvider` directly.
**Rule:** Wrap `Providers` + app shell in a small `"use client"` component (for example `AppRootProviders`) that imports `AuthProvider` from the shared frontend package, and use that from `layout.tsx` instead of importing hook-using modules in the server layout.

---

### 2026-04-26 — Shared `frontend/src/api/client.js` must default to `/api` in the browser for Next
**What happened:** `AuthProvider`’s `/auth/me` used `API_BASE` resolved to `http://localhost:4000` when bundled in Next (no Vite `import.meta.env`). Some environments resolve `localhost` inconsistently with the backend, so session checks failed and protected routes bounced to `/login`.
**Rule:** In `resolveApiBase()`, when `window` is defined and there is no `NEXT_PUBLIC_API_URL`, return same-origin `/api` (Next rewrites). Reserve `http://127.0.0.1:4000` for non-browser contexts only.

---

### 2026-04-26 — Child "Switch to Parent" lives on child dashboard, not every child route
**What happened:** A demo E2E navigated to `/child/ai` then looked for "Switch to Parent"; the button only exists on `/child/dashboard`, so the test hung until timeout.
**Rule:** After touring `/child/ai`, `goto('/child/dashboard')` (or use a shared layout control) before clicking parent switch / PIN flows.

---

### 2026-04-26 — Vercel preview: fetch fails when CORS omits *.vercel.app
**What happened:** Browsers showed "Network request failed. Check backend at …" because credentialed cross-origin `fetch` to the API throws when the preflight is rejected; only production `https://project.vercel.app` was in `FRONTEND_ORIGIN`, not every preview URL.
**Rule:** Either list every preview origin explicitly, or add `https://*.vercel.app` to `FRONTEND_ORIGIN` (supported by the backend as an opt-in wildcard for `https://<sub>.vercel.app` only). Redeploy the API after changing env.

---

### 2026-05-03 — Cursor env install must not assume nvm or system Node
**What happened:** `.cursor/environment.json` ran `cursor-environment-install.sh`, which failed with "npm not found on PATH" on Cloud Agent images that ship without Node and without `~/.nvm`.
**Rule:** After trying nvm/fnm/volta, bootstrap Node from `nodejs.org` into a repo-local cache (e.g. `.cursor/runtime/`, gitignored) via `scripts/ensure-node-on-path.sh`, and pin the version in `.node-version` so installs stay reproducible.

---

### 2026-05-03 — Next SSR: guard `import.meta.env` in shared Vite `client.js`
**What happened:** Bundling `frontend/src/api/client.js` into `web-next` left `import.meta` undefined during static prerender; reading `import.meta.env.VITE_*` threw and broke `npm run build`.
**Rule:** Use optional chaining on `import.meta.env` (e.g. `import.meta.env?.VITE_API_BASE_URL ?? '/api'`) so Node prerender never dereferences `undefined`.

---

### 2026-05-03 — JSX inline styles: CSS `var()` must be quoted strings
**What happened:** `color: var(--token)` without quotes in a JS object is invalid (`var` parses as the keyword); TypeScript reported a fake “header has no closing tag” at the parent `<header>`.
**Rule:** In React style objects, always write `'var(--css-variable)'` as a string value.

---

### 2026-05-03 — Vite must alias `gametime-web-nav` like Next.js
**What happened:** Standalone `frontend` `vite build` failed with “failed to resolve import gametime-web-nav” because only `web-next/next.config.ts` mapped that package to `nav.next.jsx`.
**Rule:** Add `resolve.alias` in `frontend/vite.config.js` pointing `gametime-web-nav` → `src/shims/nav.vite.jsx`, mirroring the Next webpack/turbopack aliases.

---

### 2026-05-03 — Do not import UI-only toast helpers from `api/client.js`
**What happened:** The build reported `pushDeletionToast` was not exported from `client.js` when `TaskTable.jsx` imported it — plausible when `web-next/frontend` is a stale copy of `../frontend` until deploy sync runs.
**Rule:** Keep `api/client.js` focused on HTTP; dispatch `gametime:toast` from the calling page/component (or a tiny `toast.js` util) instead of adding exports to the API client for success-only UI.

---

### 2026-05-03 — Postgres SQL functions: columns must exist before CREATE FUNCTION
**What happened:** Supabase migration preview failed with `column cp.user_id does not exist` because `gt_auth_child_id()` referenced `child_profiles.user_id` before `ALTER TABLE ... ADD COLUMN user_id` ran (PostgreSQL validates column references when creating SQL-language functions).
**Rule:** In migrations, run `ALTER TABLE` to add columns **before** any `CREATE OR REPLACE FUNCTION` whose body references those columns.

---

### 2026-05-10 — Verify JSX map callbacks after chunked edits
**What happened:** A search/replace on `ParentChildrenScreen.js` dropped `{children.map((child) => { const tel = ...` while leaving the inner `return (...)`, producing invalid JSX until caught with `node --check`.
**Rule:** After replacing a block inside `.map()`, run syntax check (or read the block) to confirm the `map` wrapper and key variables still exist.

---

### 2026-05-10 — Duplicate import blocks Metro bundle
**What happened:** `ChildRewardsStore.tsx` imported `createChildSupabaseClient` twice; Metro failed with "Identifier has already been declared".
**Rule:** When adding imports to a file, scan for an existing import from the same module and extend that block instead of appending a second duplicate line.

---

### 2026-05-10 — Expo local config plugins: use require() for @expo/config-plugins
**What happened:** A local plugin using ESM `import { createRunOncePlugin, ... } from '@expo/config-plugins'` made `npx expo config` fail with "does not provide an export named 'createRunOncePlugin'" because the package is CommonJS and named ESM interop breaks under Expo’s plugin import path.
**Rule:** Implement local Expo config plugins that use `@expo/config-plugins` with CommonJS `require('@expo/config-plugins')` and `module.exports`, unless the project explicitly uses a pattern verified to support ESM named imports.

---

### 2026-05-10 — Merging remote branches can yield an empty tree diff
**What happened:** Merging several `cursor/*` UI branches into a “rescue” branch produced merge commits but `git diff main..branch` was empty: those branches’ file content was already on `main`; only the kinetic / legacy global CSS was still overriding the 1-bit look in production.
**Rule:** After merging rescue branches, run `git diff main..HEAD --stat` (or compare `^{tree}` hashes). If empty, the problem is not “lost commits” but global styles, deploy root, or cache — fix the actual override path instead of assuming the branch merge added files.

---

### 2026-05-18 — Production CORS must never reflect arbitrary Origins with credentials
**What happened:** A “simplify CORS” change used `callback(null, true)` for every request regardless of `NODE_ENV`, so in production any site could receive `Access-Control-Allow-Origin` echoing its own Origin together with `Access-Control-Allow-Credentials: true`, enabling credentialed cross-origin reads of the API when cookies are sent.
**Rule:** With `credentials: true`, never reflect arbitrary Origins in production. Keep an explicit allowlist (plus known preview hosts such as `*.github.dev` and optional `https://*.vercel.app` config), use relaxed reflection only when `NODE_ENV !== 'production'` or `CORS_REFLECT_ORIGIN=true`.

---
