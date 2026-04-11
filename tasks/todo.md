# Gametime — Master Task Tracker

> Updated: 2026-03-16
> Format: [x] done · [~] in progress · [ ] not started
> After each session, add notes under ## Session Notes

---

## Phase 1 — Core Backend ✅ COMPLETE

- [x] Parent auth (signup, login, logout, JWT, brute-force lockout)
- [x] Child profile creation (age-gated, 6–13)
- [x] Child login — PIN (ages 6–9), password (10+), parent-session method
- [x] Task CRUD (create, list, delete, schedule/recurrence)
- [x] Task evidence submission (photo + video, base64 + file-based)
- [x] AI evidence review (Claude vision, aiReviewService.js)
- [x] Task approval / rejection / dispute workflow
- [x] Task request system (child → parent)
- [x] Task expiration cron job
- [x] Reward CRUD + redemption + parent fulfillment
- [x] Dual points system (RP + GP)
- [x] Points transaction history + manual adjustment
- [x] Gaming session start/end
- [x] Daily/weekly gaming caps
- [x] Game blocklist/allowlist
- [x] Gaming conversion rates + denial codes
- [x] Weekly gaming report endpoint
- [x] Giftcard integration (Athena API — mock mode)
- [x] Giftcard inventory (purchase, manual entry, sync)
- [x] GP wallet (balance, purchase, transactions)
- [x] Webhook handler (Athena, raw body, signature verify)
- [x] In-app notifications (create, list, mark read)
- [x] Push notifications (Expo SDK, device token management)
- [x] Notification preferences (parent-only, DB-backed, gating in createNotification)
- [x] Parent AI assistant (streaming, tool-use, chat history)
- [x] Child AI assistant (streaming, age-appropriate)
- [x] AI family insights (confidence scoring)
- [x] AI onboarding chat (signup flow)
- [x] SQLite schema + migrations (ensureColumn/ensureTable pattern)
- [x] Pino structured logging (replaced morgan)
- [x] Health check with real DB ping (returns 503 on failure)
- [x] Rate limiting (per-endpoint, express-rate-limit)
- [x] Input validation (Zod on all new routes)
- [x] Error handler middleware (centralised)
- [x] Helmet.js security headers
- [x] JWT httpOnly cookies
- [x] DATABASE_PATH crash-fast (production guard)
- [x] SQLite hot backup script (scripts/backup.js, prunes after N days)
- [x] EAS build config (eas.json — dev/preview/production profiles)

---

## Phase 2 — Web Frontend ✅ MOSTLY COMPLETE

- [x] ParentSignUp page + AI onboarding chat
- [x] ParentLogin page
- [x] ChildLogin page (all 3 methods)
- [x] ParentDashboard (task queue, gaming audit, giftcard purchase, stats, weekly plans)
- [x] ChildDashboard (tasks, evidence upload, disputes, rewards, gaming UI, giftcard codes)
- [x] ChildCreation page
- [x] SettingsPage (notification prefs server-synced, game rules)
- [x] AiWorkspacePage (parent streaming chat)
- [x] ChildAiPage (child streaming chat)
- [x] TaskCompletionForm modal
- [x] ParentOnboarding wizard (4-step first-run flow — spec in figma-prompts.md)
- [x] PasswordResetRequest page (/forgot-password)
- [x] PasswordReset page (/reset-password)

---

## Phase 3 — Mobile App ⚠️ SHELLS ONLY

Navigation structure and all 14 screens exist but interiors are placeholder UI.

### Auth Screens
- [x] WelcomeScreen — hero logo circle, feature bullets, CTA buttons, settings link
- [x] ParentLoginScreen — polished, "Forgot password?" + "Create account" links
- [x] ParentSignupScreen — polished, "Already have account?" link
- [x] ChildLoginScreen — polished, PIN numpad (dots + large digit grid), tab switcher
- [x] ApiSettingsScreen — polished, row layout for Save/Test buttons
- [x] ForgotPasswordScreen — email input, sent confirmation state, back to login
- [x] ResetPasswordScreen — token + new password + confirm, success state, navigate to login

### Parent Screens (Drawer)
- [x] ParentHomeScreen — PageHeader, Spinner loading state, pull-to-refresh
- [x] ParentChildrenScreen — PageHeader, EmptyState, avatar display + upload (expo-image-picker)
- [x] ParentTasksScreen — full redesign: gradient header, collapsible form + template chips, status filter tabs, child selector chips, rich task cards with state config
- [x] ParentApprovalsScreen — full rebuild: AiRecommendationBadge (color-coded), evidence image, child note, confirm dialog, history section, Spinner, EmptyState
- [x] ParentGamingScreen — full redesign: gradient header, per-child usage cards with cap bars, gaming rules form with twoCol layout, game access list with toggle chips, audit log
- [x] ParentRewardsScreen — full redesign: gradient header, collapsible section accordions (Rewards/GiftCards/GPWallet/RPAdjust), polished rewards list with icon wraps, child chip selector, transaction rows
- [x] ParentNotificationsScreen — PageHeader, Spinner, EmptyState, unread dot indicators, pull-to-refresh, mark-all-read
- [x] AccountScreen — PageHeader, avatar circle (initial fallback), stat rows, role-aware, logout confirm
- [x] ParentAiScreen — fully implemented; streaming fixed (text/delta)

### Child Screens (Drawer)
- [x] ChildHomeScreen — hero RP/GP balance cards, gaming time hero with progress bar, Study Buddy CTA, unread notifications, Spinner
- [x] ChildTasksScreen — full redesign: purple gradient header, status tabs with counts, collapsible request form (Animated spring), rich task cards with colored borders, dispute section, request history cards
- [x] ChildRewardsScreen — full redesign: purple gradient header with RP/GP balance pills, RewardCard sub-component with platform icons + afford check, wallet section with code display, revealed code card
- [x] ChildGamingScreen — full rebuild: gaming time hero (52px number + daily cap bar), active session card, start session form, blocked games list, EmptyState, PageHeader, Spinner
- [x] ChildNotificationsScreen — PageHeader, Spinner, EmptyState, unread dot indicators (green accent), pull-to-refresh, mark-all-read
- [x] ChildAiScreen — fully implemented; streaming fixed (text/delta)

### Mobile-Specific Features
- [x] usePushNotifications hook
- [x] AuthContext + expo-secure-store token management
- [x] Shared components (Button, Card, InputField, Banner, StatusPill, HeaderNotifications, Spinner, PageHeader, EmptyState)
- [x] Evidence submission camera flow (3-screen flow — spec in figma-prompts.md Prompt 4)
- [x] Child PIN login screen — large numpad with dot display (in ChildLoginScreen)
- [x] Deep link handling for push notification taps (usePushNotifications.js — ParentTabs/ChildTabs with nested screen params, achievement_unlocked type added)

---

## Phase 4 — UI / Design System ✅ COMPLETE

- [x] Apply Nunito font — `index.html` preconnect + stylesheet link + `app.css` import updated
- [x] Apply CSS design tokens to `app.css` — full :root + dark mode (indigo #3B5BDB primary, purple #7C3AED child energy, all semantic/neutral tokens)
- [x] Remove Inter/Sora fonts — replaced throughout `app.css`
- [x] Mobile `colors.js` — updated to design system palette (indigo primary, purple child accent, semantic tokens, gamification tokens)
- [x] Mobile `spacing.js` — numeric scale + radius constants added
- [x] Apply dark mode token set (`[data-theme="dark"]` + `prefers-color-scheme`) — `@media (prefers-color-scheme: dark)` block added to `app.css`; `App.jsx` detects OS preference on first load
- [x] Web page audit — replaced all remaining hardcoded hex colors with CSS custom property tokens in `app.css`
- [x] Evidence Review Panel — full drawer UI built (`EvidenceReviewPanel.jsx` + `.css`); integrated into `ParentDashboard.jsx`
- [x] GP Top-Up Flow — 3-step wizard UI built (`GpTopUpFlow.jsx` + `.css`); integrated into `ParentDashboard.jsx`
- [x] Gaming Session Controller — real-time countdown widget built (`GamingSessionController.jsx` + `.css`); integrated into `ChildDashboard.jsx`
- [x] Reward Store — filter/sort/locked states/confetti built (`RewardStore.jsx` + `.css`); integrated into `ChildDashboard.jsx`
- [x] Child PIN Login — large numpad UI built (`ChildPinLogin.jsx` + `.css`); integrated into `ChildLogin.jsx` (2-step flow: lookup → numpad)
- [x] Responsive layout pass on all web pages (mobile breakpoints) — comprehensive responsive CSS block appended to `app.css` covering all breakpoints (640px/768px/1024px) for all pages and components

---

## Phase 5 — Integrations / Config ❌ BLOCKED ON CREDENTIALS

- [x] SMTP email — Resend recommended; sendWelcomeEmail wired into signup (fire-and-forget); scripts/test-email.js for verification; sendSignupOtpEmail dead code replaced
- [ ] Athena giftcards — obtain API keys → set ATHENA_API_KEY, flip ATHENA_ENABLED=true, ATHENA_MOCK_MODE=false
- [ ] Expo push credentials — run `eas credentials` to generate push certs
- [x] Stripe — `stripe` npm package installed; `POST /stripe/checkout` session endpoint; `POST /stripe/webhook` (signature-verified); `stripe_sessions` idempotency table; quick-select top-up UI in ParentDashboard

---

## Phase 6 — Missing Features ❌ NOT STARTED

### Auth
- [x] `POST /auth/forgot-password` — email reset token
- [x] `POST /auth/reset-password` — consume token, set new password
- [x] Password reset UI (web) — ForgotPassword.jsx + ResetPassword.jsx
- [x] Password reset UI (mobile) — ForgotPasswordScreen.js + ResetPasswordScreen.js, wired to AuthStack

### Child Personalisation
- [x] Child avatar upload endpoint (`POST /children/:id/avatar`) — base64, local storage in `avatars/` dir
- [x] Avatar storage (local file — `<data_dir>/avatars/<childId>.<ext>`)
- [x] Avatar display — mobile: ParentChildrenScreen (image + placeholder initial), AccountScreen (initial circle)
- [x] Avatar display — web frontend (ParentDashboard + ChildDashboard)

### Gamification Layer
- [x] Achievement system — backend schema + unlock logic (12 seeded achievements, task_count/streak/points types)
- [x] Streak tracking — consecutive days completing tasks (current_streak_days + last_completion_date on child_profiles)
- [x] Leaderboard endpoint (GET /children/leaderboard — weekly tasks, RP balance, streak)
- [x] Achievement badges UI (web: ChildDashboard badge grid + streak chip; mobile: ChildHomeScreen horizontal badge strip)

### Reporting
- [x] Weekly digest email (weeklyDigestJob.js — fires Monday 00:00 UTC, sendWeeklyDigestEmail)
- [x] Custom date range filter on reports (ParentDashboard RP Transaction History — From/To date pickers)
- [x] Export to CSV (ParentDashboard RP Transaction History — Export CSV button)

### Admin / Ops
- [x] Admin dashboard (AdminPage.jsx at /admin — stats + families table + search + grant/revoke admin)
- [x] PDPA data export (GET /auth/export-data — comprehensive JSON download; SettingsPage Download My Data button)
- [x] Account deletion flow (DELETE /auth/account — password-verified; SettingsPage danger zone)

### Co-parenting
- [ ] Multi-parent support (invite second parent to family) — SKIPPED: too complex
- [ ] Parent role permissions (admin vs limited) — SKIPPED

---

## Immediate Next Steps (recommended order)

1. **Password reset** — hard blocker for real users; backend + frontend + email
2. **SMTP setup** — needed for password reset AND signup confirmation
3. **Design system apply** — highest visual impact; all tokens + Nunito to web
4. **Mobile screen implementations** — fill in the 14 shells (start with ChildHomeScreen + ParentApprovalsScreen)
5. ~~**Stripe GP top-up**~~ ✅ DONE
6. **Expo push credentials** — push is wired but won't fire without certs
7. **Athena keys** — flip mock mode off once credentials sourced
8. **Child avatars** — small lift, high polish

---

## Session Notes

### 2026-03-11 — Backend + Production Readiness
Completed: Step 4 (notification preferences backend integration) and Step 5 (production readiness pass — Pino logging, health check, backup script, EAS config, env validation).

### 2026-03-16 — Design Phase + Project Setup
Completed: All 4 design documents (`design-system.md`, `copywriting.md`, `component-logic.md`, `figma-prompts.md`). Created `CLAUDE.md`, `tasks/lessons.md`, `tasks/todo.md`. Full codebase audit completed — project is ~85% complete on backend, ~70% on web frontend, ~20% on mobile (shells only), 0% on UI/design implementation.

### 2026-03-19 — Password Reset (backend + web frontend)
Completed: Full password reset flow. 8 files changed: `password_reset_tokens` table added to `db/init.js` (SHA-256 hashed token, 1-hour TTL, single-use, auto-purged on boot); `forgotPasswordSchema` + `resetPasswordSchema` added to `validation.js`; `sendPasswordResetEmail()` added to `emailService.js`; `forgotPassword` + `resetPassword` controllers in `authController.js` (email-enumeration-safe, revokes all sessions on reset); 2 new routes in `authRoutes.js` (tight 5/15min rate limiter); `ForgotPassword.jsx` + `ResetPassword.jsx` pages; `App.jsx` routes + "Forgot password?" link in `ParentLogin.jsx`. Works in Ethereal preview mode without SMTP creds — previewUrl logged at info level.

### 2026-03-19 — Mobile Screens + Avatars + Password Reset (Steps 4, 7, 8)
Completed: All 14 mobile screens fully implemented. Auth screens redesigned (WelcomeScreen hero, ParentLoginScreen/SignupScreen polish, ChildLoginScreen PIN numpad). Notification screens (parent + child) rebuilt with PageHeader, Spinner, EmptyState, unread dot indicators, pull-to-refresh. AccountScreen polished with avatar initial circle, stat rows, role-aware display. Child avatar backend (POST /children/:id/avatar + GET /children/:id/avatar, base64 upload, local storage in avatars/ dir, avatar_url column added to child_profiles). ParentChildrenScreen updated with avatar display + expo-image-picker upload. Mobile password reset screens (ForgotPasswordScreen + ResetPasswordScreen) created and wired into AuthStack. ParentLoginScreen → ForgotPassword navigation link added.

### 2026-03-20 — Evidence Submission Flow (EvidenceSubmitScreen)
Completed: EvidenceSubmitScreen.js (3-step internal state machine: TaskOverview → CameraCapture → ReviewSubmit). Integrated into RootNavigator.js ChildStack as "EvidenceSubmit". ChildTasksScreen updated: removed inline submission card, added "Submit Proof" TouchableOpacity button on Active task cards that navigates to EvidenceSubmit with taskId/taskTitle/taskPoints params. Removed ImagePicker/FileSystem imports from ChildTasksScreen (moved to EvidenceSubmitScreen).

### 2026-03-20 — Figma Design Improvements (ChildHomeScreen + ChildTasksScreen + Navigation)
Implemented 4 Figma design improvements: (1) Hero balance card — single LinearGradient card (#3B5BDB → #7C3AED), 56px numbers, purple glow shadow (shadowColor: #7C3AED), RP/gp side-by-side with gold GP pill, emoji removed from greeting. (2) Bottom tab bar — replaced ChildDrawer with createBottomTabNavigator (4 tabs: Home, Tasks, Gaming, Rewards), 60px + safe area insets, active = #7C3AED Ionicons filled icon, inactive = outline, shadow on iOS/elevation on Android. (3) Task cards — colored left border (4px) based on status (blue=Active, amber=PendingApproval, green=Approved, red=Rejected), point chip on right with matching background/border tint. (4) Emoji use reduced (greeting emoji removed; Study Buddy robot emoji removed). Installed packages: @react-navigation/bottom-tabs, expo-linear-gradient. ChildNotifications + Account remain accessible as stack screens in ChildStack.

### 2026-03-19 — Stripe Checkout GP Top-Up
Completed: Full Stripe Checkout integration. 9 files created/modified: `stripe` npm installed, `env.js` (2 new keys), `db/init.js` (`stripe_sessions` table + index), `validation.js` (`stripeCheckoutSchema`), `stripeService.js` (NEW — session creation + webhook handler with idempotency), `stripeController.js` (NEW), `stripeRoutes.js` (NEW — POST /stripe/checkout, 5/60s rate limit), `app.js` (raw-body webhook before JSON parser, router mounted), `ParentDashboard.jsx` (S$5/10/20/50 quick-select UI, redirect detection on mount, `handleStripeTopUp`). To go live: add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` to `backend/.env`; run `stripe listen --forward-to localhost:4000/stripe/webhook` for local testing.

### 2026-03-20 — AI-Native Parent Dashboard

Implemented the recommended AI-native path across web and mobile:

**Backend (aiService.js):** Added 3 new Claude tools — `get_pending_approvals` (fetches tasks with AI verdict + evidence), `approve_task` (approves + awards RP), `reject_task` (rejects with reason). Updated system prompt to be proactive about pending items. Updated tool labels.

**Web (App.jsx + AiWorkspacePage.jsx):** Parents now land on `/parent/ai` after login/signup. Added `ApprovalArtifact` + `ApprovalCard` components — inline approve/reject buttons in the workspace canvas with AI verdict badge, child note, and confirm reject flow. Added `get_pending_approvals` + `approve_task`/`reject_task` handlers in `processToolDone`. Updated quick-action chips — "What needs my attention?" is now the first chip. "Check approvals" chip appears dynamically when no approval artifact yet.

**Mobile — Parent (RootNavigator.js + ParentAiScreen.js):** Replaced parent drawer with a bottom tab bar (4 tabs: AI | Approvals | Tasks | Family). ParentAiScreen is now tab 1 (the primary surface). Other screens (Gaming, Rewards, Notifications, Account, Dashboard) remain as stack pushes. Added horizontal quick-action chips bar to ParentAiScreen above the input. Added Gametime AI branded header with Chat/Insights tab switcher.

**Mobile — Child (ChildHomeScreen.js):** Upgraded Study Buddy CTA into a conversational AI guide bubble — avatar + speech bubble with a contextual greeting, "Chat →" pill button. Keeps it visual and accessible for younger children.

### 2026-03-20 — Mobile Design Upgrade Continued (All Remaining Screens)

Full redesign pass completed on all remaining plain mobile screens:
- **ChildTasksScreen** — purple gradient header with status filter tabs + live counts, collapsible "Request a Task" form (spring animation), rich task cards with colored left borders per state, RP chip, status pill, GP bonus pill, parent note box, inline dispute flow, request history cards.
- **ChildRewardsScreen** — purple gradient header showing RP/GP balances, `RewardCard` sub-component with platform icons + cost chips + can-afford check, wallet section with large monospace code display, revealed code card with gold gradient header.
- **ParentRewardsScreen** — indigo gradient header with GP/Rewards stats, four collapsible section accordions (Rewards, Gift Cards, GP Wallet, RP Adjust), polished rewards list with icon wraps + delete buttons, child chip selector with avatar + RP balance, transaction rows with credit/debit colors.
- **ParentGamingScreen** — indigo gradient header with cap and conversion rate stats + active session indicator, per-child usage cards with daily/weekly cap bars, gaming rules form with two-column layout, game access list with platform icons + block/allow toggle chips, audit log with live session dots.

### 2026-03-20 — All Phase 6 Features + Mobile Design Upgrade (Step 3)

Completed all remaining unblocked Phase 6 features and mobile design polish:

**Phase 6 — All done:**
Achievement system (12 achievements seeded, checkAndUnlockAchievements in taskService, achievementsRoutes.js), streak tracking (current_streak_days + last_completion_date), leaderboard (GET /children/leaderboard — weekly stats + rank), badge strip on ChildHomeScreen mobile, badge grid on ChildDashboard web. Weekly digest email (weeklyDigestJob.js, sendWeeklyDigestEmail, Monday 00:00 UTC schedule). Admin page (AdminPage.jsx at /admin — stats grid + families table + search + grant/revoke admin, isAdmin in JWT + login response). PDPA data export (GET /auth/export-data, SettingsPage Download My Data). Account deletion (DELETE /auth/account password-verified, SettingsPage danger zone). RP Transaction History section in ParentDashboard Family tab with date range filter (From/To pickers + Clear) + CSV export button. Leaderboard section in ParentDashboard Family tab. Parent Onboarding wizard (ParentOnboarding.jsx 4-step + confetti). Child avatar display (web + mobile).

**Mobile design upgrade (Step 3 in progress):**
ParentHomeScreen — full redesign: blue/indigo gradient header with inline metrics (pending/children/gaming/GP), pending approvals section with AI verdict badges, children cards with RP/GP balance + streak pill + Open Child View CTA, active gaming session amber banner, recent activity feed. ParentChildrenScreen — full redesign: polished child cards with colour-coded avatar circles, RP/GP/age balance row, camera icon for avatar upload, collapsible Add Child form with hint callout, collapsible Parent Settings accordion.

### 2026-04-08 — Bug Fixes + UI Polish
Fixed: (1) ChildAiScreen streaming — `event.type === 'token'` → `'text'`, `event.token` → `event.delta` (matches aiChildService.js emit). (2) ParentHomeScreen mobile — `task.aiVerdict` → `task.aiRecommendation` (wrong field name; verdict was always showing "⚠ Review"). (3) Added missing `GET /tasks/:taskId/submission` and `POST /tasks/:taskId/review` backend routes — EvidenceReviewPanel was calling these and getting 404. (4) ParentApprovalsScreen — evidence images now fetched via `/tasks/evidence/:completionId` with auth header + ArrayBuffer→base64 conversion (was always showing placeholder because `task.evidenceData` doesn't exist in list response). (5) ParentHomeScreen insights section — fetches `/ai/parent/insights` on load and displays AI narrative card with "Ask AI →" link. (6) ParentTasksScreen — added indigo LinearGradient header + useSafeAreaInsets to match all other parent screens (was the only parent screen without gradient header).

### 2026-03-20 — Phase 4 UI/Design System Complete
Completed all 8 Phase 4 tasks. (1) Dark mode OS preference — `@media (prefers-color-scheme: dark)` block added to `app.css` with `:root:not([data-theme='light'])` guard; `App.jsx` now detects OS preference on initial load when no localStorage preference saved. (2) Color token audit — replaced all remaining hardcoded hex values in `app.css` with CSS custom properties across stat cards, task review table, gaming session banner, AI verdict badges, and error states. (3) `EvidenceReviewPanel.jsx` + `.css` (NEW) — slide-in drawer, state machine (loading/idle/confirming/note_entry/submitting/success), MediaViewer, AI verdict badge, focus trap, keyboard escape, ARIA dialog. Integrated into `ParentDashboard.jsx`. (4) `GpTopUpFlow.jsx` + `.css` (NEW) — 3-step modal wizard (amount → allocate → confirm), Stripe redirect, auto-skips allocate step for single child. Integrated into `ParentDashboard.jsx`. (5) `GamingSessionController.jsx` + `.css` (NEW) — real-time countdown with SVG circular ring, server sync every 10s, pause/resume/end-early controls, child end overlay. Integrated into `ChildDashboard.jsx`. (6) `RewardStore.jsx` + `.css` (NEW) — filter tabs, sort, locked state overlay, canvas confetti, bottom sheet detail/locked/confirm. Integrated into `ChildDashboard.jsx`. (7) `ChildPinLogin.jsx` + `.css` (NEW) — large 80×80px numpad, 4 PIN dots with shake/pulse/success animations, 3-attempt lockout with 30s countdown, keyboard support, auto-submit on 4th digit. Integrated into `ChildLogin.jsx` as 2-step flow (child lookup then numpad). (8) Responsive layout pass — comprehensive CSS block appended to `app.css` with breakpoints at 640px/768px/1024px covering nav, auth, dashboard, all new components, modals, and sheets.
