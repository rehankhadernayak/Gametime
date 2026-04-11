# Gametime — React Component Logic Specifications

> Document v1.0 · Design Phase · Do not modify source code
> Audience: Developer implementing UI from these specs
> Covers: State machines, TypeScript interfaces, API calls, accessibility

---

## Table of Contents

1. [Evidence Review Panel](#1-evidence-review-panel)
2. [GP Top-Up Flow](#2-gp-top-up-flow)
3. [Gaming Session Controller](#3-gaming-session-controller)
4. [Reward Store](#4-reward-store)
5. [Child PIN Login](#5-child-pin-login)

---

## 1. Evidence Review Panel

**Location:** Parent Dashboard → Task Queue → Evidence drawer
**Purpose:** Parent reviews AI-scored photo/video evidence and approves, requests revision, or rejects a task submission.

---

### 1.1 State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       EVIDENCE REVIEW PANEL                             │
└─────────────────────────────────────────────────────────────────────────┘

         open(submissionId)
               │
               ▼
        ┌─────────────┐
        │   LOADING   │  ← Skeleton shimmer, drawer open, no content
        └──────┬──────┘
               │
       ┌───────┴────────┐
       │ fetch fails    │ fetch succeeds
       ▼                ▼
  ┌──────────┐    ┌────────────────────────────────────────────┐
  │  ERROR   │    │                  IDLE                      │
  │ [Retry]  │    │  Shows: media, AI verdict, score, note     │
  └──────────┘    │  Actions: Approve / Request Changes / Fail │
                  └──────────────────┬─────────────────────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
              clickApprove    clickRequest    clickFail
                     │               │               │
                     ▼               ▼               ▼
              ┌────────────┐  ┌─────────────┐  ┌──────────────┐
              │ CONFIRMING │  │  NOTE_ENTRY │  │  CONFIRMING  │
              │  (approve) │  │  (textarea) │  │   (reject)   │
              └─────┬──────┘  └──────┬──────┘  └──────┬───────┘
                    │                │                 │
               confirm?          submit note       confirm?
              ┌──┴──┐          ┌────┴────┐         ┌──┴──┐
              Y     N          │         │          Y     N
              │     │       submit    cancel         │     │
              ▼     │          │         │           ▼     │
        ┌──────────┐│          ▼         ▼    ┌──────────┐ │
        │SUBMITTING││   ┌──────────┐  (IDLE)  │SUBMITTING│ │
        └─────┬────┘│   │SUBMITTING│          └─────┬────┘ │
              │     │   └─────┬────┘                │      │
         success    └──►(IDLE)│                success     └──►(IDLE)
              │               │                     │
              ▼           success                   ▼
         ┌─────────┐          │              ┌─────────────┐
         │ SUCCESS │          ▼              │   SUCCESS   │
         │(approved)│   ┌──────────┐         │  (rejected) │
         └────┬─────┘   │ SUCCESS  │         └──────┬──────┘
              │         │(revision)│                │
              ▼         └─────┬────┘                ▼
           drawer             │                  drawer
           closes             ▼                  closes
                           drawer
                           closes
```

---

### 1.2 TypeScript Interfaces

```typescript
// Submission evidence as returned by GET /tasks/:taskId/submission
interface Submission {
  id: string;
  taskId: string;
  taskTitle: string;
  childId: string;
  childName: string;
  childAvatarUrl: string | null;
  mediaType: 'photo' | 'video';
  mediaUrl: string;          // pre-signed URL, valid 15 min
  mediaThumbnailUrl: string; // pre-signed thumb for video
  submittedAt: string;       // ISO 8601
  aiVerdict: 'approve' | 'review' | 'return' | 'pending' | null;
  aiScore: number | null;    // 0–100
  aiNote: string | null;     // AI reasoning blurb
  pointValue: number;        // RP that will be awarded on approval
}

// POST /tasks/:taskId/review  — request body
interface ReviewPayload {
  decision: 'approve' | 'request_revision' | 'reject';
  parentNote?: string; // required for request_revision; optional for reject
}

// Panel state
type ReviewPanelState =
  | { status: 'idle'; submission: Submission }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'confirming'; decision: 'approve' | 'reject' }
  | { status: 'note_entry'; draft: string }
  | { status: 'submitting'; decision: ReviewPayload['decision'] }
  | { status: 'success'; decision: ReviewPayload['decision'] };

// Props
interface EvidenceReviewPanelProps {
  submissionId: string;
  onClose: () => void;
  onReviewed: (decision: ReviewPayload['decision'], taskId: string) => void;
}
```

---

### 1.3 API Calls

| Step | Method | Endpoint | Body | On Success | On Failure |
|---|---|---|---|---|---|
| Mount | `GET` | `/tasks/{taskId}/submission` | — | populate Submission | → `error` state |
| Approve confirm | `POST` | `/tasks/{taskId}/review` | `{ decision:'approve' }` | → `success`, call `onReviewed` | toast + revert to `idle` |
| Request revision | `POST` | `/tasks/{taskId}/review` | `{ decision:'request_revision', parentNote }` | → `success`, call `onReviewed` | toast + revert to `idle` |
| Reject confirm | `POST` | `/tasks/{taskId}/review` | `{ decision:'reject', parentNote? }` | → `success`, call `onReviewed` | toast + revert to `idle` |

All calls include `Authorization: Bearer <token>` header.

---

### 1.4 Loading / Error / Empty States

| State | UI |
|---|---|
| **Loading** | Drawer open, content area = 3-row skeleton (media placeholder 16:9, two text lines, button row shimmer) |
| **Error** | Centered: ⚠️ icon, error message string, `[Try again]` button that re-fetches. `[Close]` also visible. |
| **Video loading** | Poster image shown while `<video>` loads; `<Spinner>` centred over poster |
| **AI verdict = null** | Replace AI card with grey pill: "AI review pending" |
| **AI verdict = pending** | Pulse animation on the AI card badge; disable Approve button with tooltip "Waiting for AI" |

---

### 1.5 Accessibility Requirements

- Drawer must use `role="dialog"`, `aria-modal="true"`, `aria-labelledby="review-panel-title"`
- Focus trap: on open, focus moves to first interactive element (close button or media). On close, focus returns to the trigger button.
- `<video>` requires `<track kind="captions">` (even if empty) — WCAG 1.2.2
- AI verdict badge needs `aria-label` e.g. `aria-label="AI verdict: Approve (score 87/100)"`
- Confirm dialog overlay must trap focus independently
- All decision buttons have `aria-busy="true"` during SUBMITTING state
- Keyboard: `Escape` → close drawer (unless in confirming sub-state, where `Escape` cancels the confirm)
- Colour is never the sole indicator of verdict (icon + label always present alongside colour)

---

### 1.6 React Component Structure

```
<EvidenceReviewPanel>
  ├── <DrawerOverlay onClick={closeIfIdle} />
  ├── <DrawerPanel role="dialog" aria-modal>
  │   ├── <DrawerHeader>
  │   │   ├── <h2 id="review-panel-title">{childName} · {taskTitle}</h2>
  │   │   └── <CloseButton aria-label="Close review panel" />
  │   │
  │   ├── {status === 'loading'} → <EvidenceSkeleton />
  │   ├── {status === 'error'}   → <EvidenceError message onRetry />
  │   │
  │   ├── {status !== 'loading' && status !== 'error'} →
  │   │   ├── <MediaViewer mediaType mediaUrl thumbnailUrl />
  │   │   │   ├── {photo} → <img loading="lazy" />
  │   │   │   └── {video} → <video controls poster={thumbnailUrl}><track/></video>
  │   │   │
  │   │   ├── <AIVerdictCard verdict score note />
  │   │   │   ├── <VerdictBadge aria-label />
  │   │   │   ├── <ScoreBar value={score} max={100} />
  │   │   │   └── <p className="ai-note">{note}</p>
  │   │   │
  │   │   ├── <TaskMetaRow pointValue submittedAt />
  │   │   │
  │   │   └── <ReviewActions>
  │   │       ├── <Button variant="success" onClick={handleApprove}>Approve (+{pointValue} RP)</Button>
  │   │       ├── <Button variant="warning" onClick={handleRequestRevision}>Request Changes</Button>
  │   │       └── <Button variant="danger" onClick={handleReject}>Fail Task</Button>
  │   │
  │   ├── {status === 'confirming'} → <ConfirmOverlay decision onConfirm onCancel />
  │   └── {status === 'note_entry'} → <NoteEntrySheet draft onChange onSubmit onCancel />
  │
  └── {status === 'success'} → auto-close after 800ms (setTimeout in useEffect)
```

---

## 2. GP Top-Up Flow

**Location:** Parent Dashboard → Wallet section → "Add Funds" button
**Purpose:** Parent tops up Giftcard Points (GP) via Stripe Checkout for one or more children.

---

### 2.1 State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                      GP TOP-UP FLOW                         │
└─────────────────────────────────────────────────────────────┘

          open()
            │
            ▼
     ┌─────────────┐
     │  STEP 1     │  Amount Selection
     │  AMOUNT     │  ← Quick amounts: $5 / $10 / $20 / $50
     │  SELECTION  │     OR custom input (min $1, max $200)
     └──────┬──────┘
            │ next (amount valid)
            ▼
     ┌─────────────┐
     │  STEP 2     │  Child Allocation
     │  ALLOCATE   │  ← If 1 child: skip, auto-allocate 100%
     │  CHILDREN   │     If 2+ children: split sliders or equal split btn
     └──────┬──────┘
            │ next (allocations sum = 100%)
            ▼
     ┌─────────────┐
     │  STEP 3     │  Order Summary
     │  CONFIRM    │  ← Shows: amount, allocation breakdown, platform note
     │  ORDER      │
     └──────┬──────┘
            │ confirm
            ▼
     ┌─────────────┐
     │  CREATING   │  POST /gp/checkout → receive { checkoutUrl }
     │  SESSION    │  Spinner + "Connecting to payment…"
     └──────┬──────┘
            │
      ┌─────┴──────┐
      │            │
  API error    checkoutUrl received
      │            │
      ▼            ▼
  ┌───────┐   ┌───────────────────────────────┐
  │ ERROR │   │   STRIPE_REDIRECT              │
  │[Back] │   │  window.location = checkoutUrl │
  └───────┘   └───────────────────────────────┘
                        │
                        │ (user completes / cancels in Stripe)
                        │
              ┌─────────┴──────────┐
              │                    │
         cancel_url             success_url
         (/wallet?topup=cancel)  (/wallet?topup=success)
              │                    │
              ▼                    ▼
        ┌──────────┐         ┌──────────────┐
        │CANCELLED │         │POLL_WEBHOOK  │ ← poll GET /gp/balance
        │  (toast) │         │  (3s × 5)    │   until balance updates
        └──────────┘         └──────┬───────┘
                                    │
                             ┌──────┴──────┐
                             │             │
                         confirmed      timeout
                             │             │
                             ▼             ▼
                       ┌──────────┐  ┌──────────┐
                       │ SUCCESS  │  │WARN_DELAY│ "Payment processing…
                       │ (toast + │  │ (toast)  │  check back shortly"
                       │ balance) │  └──────────┘
                       └──────────┘
```

---

### 2.2 TypeScript Interfaces

```typescript
interface Child {
  id: string;
  name: string;
  avatarUrl: string | null;
  gpBalance: number; // current balance in cents
}

interface AllocationEntry {
  childId: string;
  percent: number;    // 0–100; all entries must sum to 100
  amountCents: number; // derived: Math.floor(totalCents * percent / 100)
}

// POST /gp/checkout — request body
interface GpCheckoutRequest {
  amountCents: number;          // e.g. 1000 = $10.00 SGD
  allocations: AllocationEntry[];
  successUrl: string;           // frontend callback URL
  cancelUrl: string;            // frontend callback URL
}

// POST /gp/checkout — response
interface GpCheckoutResponse {
  checkoutUrl: string; // Stripe hosted checkout URL
  sessionId: string;
}

// GET /gp/balance — response
interface GpBalanceResponse {
  children: { id: string; gpBalance: number }[];
  lastUpdated: string; // ISO 8601
}

type TopUpStep = 'amount' | 'allocate' | 'confirm';

interface TopUpFlowState {
  step: TopUpStep;
  amountCents: number;       // 0 = unset
  customInput: string;       // raw string from custom input
  allocations: AllocationEntry[];
  submitting: boolean;
  error: string | null;
}

interface GpTopUpFlowProps {
  children: Child[];
  onClose: () => void;
  onSuccess: (amountCents: number) => void;
}
```

---

### 2.3 API Calls

| Step | Method | Endpoint | Body | On Success | On Failure |
|---|---|---|---|---|---|
| Confirm order | `POST` | `/gp/checkout` | `GpCheckoutRequest` | redirect to `checkoutUrl` | show inline error, stay on confirm |
| Post-redirect poll | `GET` | `/gp/balance` | — | update parent UI balance | show toast "Check back shortly" after 5 polls |

Stripe webhook is handled server-side; client only polls for confirmation.

---

### 2.4 Loading / Error / Empty States

| State | UI |
|---|---|
| **No children** | Show info card: "Add a child profile before topping up" with link to Manage Children |
| **Creating session** | Full-modal spinner overlay, button disabled, text "Connecting to payment…" |
| **API error** | Inline error banner in modal: `⚠ {message}` — `[Try again]` resets `submitting` |
| **Polling** | Subtle pulsing balance display with spinner next to GP balance number |
| **Poll timeout** | Amber toast: "Payment processing. Your balance will update shortly." |
| **Stripe cancel** | Amber toast: "Top-up cancelled. No charges were made." |

---

### 2.5 Accessibility Requirements

- Multi-step modal: `aria-live="polite"` region announces step changes ("Step 2 of 3: Allocate funds")
- Custom amount input: `type="number"` with `min="1"` `max="200"` `inputMode="decimal"`, labelled "Custom amount (SGD)"
- Allocation sliders: each `<input type="range">` has `aria-label="{childName} allocation"` and `aria-valuenow` updated on change
- Quick-select buttons use `aria-pressed` to indicate current selection
- "Confirm & Pay" button: `aria-busy="true"` when submitting
- All monetary values: wrap in `<span aria-label="10 Singapore dollars">$10</span>` pattern for screen readers
- Modal focus trap; `Escape` closes (unless submitting)
- Step indicators are not solely colour-based: use numbered labels

---

### 2.6 React Component Structure

```
<GpTopUpFlow>
  ├── <ModalOverlay />
  ├── <Modal role="dialog" aria-modal aria-labelledby="topup-title">
  │   ├── <ModalHeader>
  │   │   ├── <h2 id="topup-title">Add Gaming Funds</h2>
  │   │   ├── <StepIndicator current={step} steps={['Amount','Allocate','Confirm']} />
  │   │   └── <CloseButton />
  │   │
  │   ├── {step === 'amount'} →
  │   │   <AmountStep>
  │   │   ├── <QuickAmounts amounts={[500,1000,2000,5000]} selected={amountCents}
  │   │   │               onSelect={setAmountCents} />
  │   │   └── <CustomAmountInput value={customInput} onChange={...} />
  │   │
  │   ├── {step === 'allocate'} →
  │   │   <AllocateStep children={children} allocations={allocations}
  │   │                 onUpdate={setAllocations}>
  │   │   ├── <EqualSplitButton />
  │   │   └── {children.map(c => <AllocationRow child={c} alloc={...} />)}
  │   │
  │   ├── {step === 'confirm'} →
  │   │   <ConfirmStep amountCents={amountCents} allocations={allocations}>
  │   │   ├── <OrderSummaryTable />
  │   │   └── <PaymentNote>Powered by Stripe · Secured by Gametime</PaymentNote>
  │   │
  │   └── <ModalFooter>
  │       ├── {step !== 'amount'} → <BackButton onClick={prevStep} />
  │       └── <NextButton onClick={nextStep} disabled={!stepValid} aria-busy={submitting}>
  │               {step === 'confirm' ? 'Confirm & Pay' : 'Next'}
  │           </NextButton>
```

---

## 3. Gaming Session Controller

**Location:** Child Dashboard → top of screen (always visible while session active)
**Purpose:** Real-time countdown of remaining gaming session time; pause/resume control for parent; session-end notification.

---

### 3.1 State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     GAMING SESSION CONTROLLER                           │
└─────────────────────────────────────────────────────────────────────────┘

   Parent creates session (RP redemption)
            │
            ▼
   ┌───────────────┐
   │   LOADING     │  Fetch session data on mount
   └───────┬───────┘
           │
     ┌─────┴──────┐
     │            │
  no session   session found
     │            │
     ▼            ▼
 ┌────────┐  ┌──────────────────────────────────────────────┐
 │  IDLE  │  │                  ACTIVE                      │
 │ (no    │  │  countdown ticker, green progress ring        │
 │ session│  │  "Time left: 23:47"                          │
 │ widget)│  │  [⏸ Pause]  [🚩 End Early] (parent only)    │
 └────────┘  └─────────────────┬────────────────────────────┘
                               │
             ┌─────────────────┼───────────────────┐
             │                 │                   │
        tick to 0:00      parent pauses      parent ends early
             │                 │                   │
             ▼                 ▼                   ▼
      ┌────────────┐    ┌─────────────┐    ┌─────────────────┐
      │  EXPIRING  │    │   PAUSED    │    │   CONFIRMING    │
      │ (last 60s) │    │  countdown  │    │   END EARLY     │
      │  amber ring│    │  frozen     │    │ [Confirm][Keep] │
      └─────┬──────┘    │  [▶ Resume] │    └───────┬─────────┘
            │           └──────┬──────┘            │
         tick to 0         resume              confirm end
            │                 │                   │
            ▼                 │                   ▼
      ┌──────────┐            │           ┌─────────────────┐
      │  ENDED   │            └──►ACTIVE  │   SUBMITTING    │
      │ confetti │                        └───────┬─────────┘
      │ "GG! Well│                                │
      │ played!" │                         ┌──────┴──────┐
      └──────────┘                         │             │
                                         success      failure
                                           │             │
                                           ▼             ▼
                                       (ENDED)       toast err
                                                     (ACTIVE)
```

---

### 3.2 TypeScript Interfaces

```typescript
interface GameSession {
  id: string;
  childId: string;
  parentId: string;
  durationMinutes: number;
  startedAt: string;     // ISO 8601
  pausedAt: string | null;
  totalPausedMs: number; // cumulative paused milliseconds
  endedAt: string | null;
  status: 'active' | 'paused' | 'ended';
  rpCost: number;
}

// Derived in component
interface SessionTimerDerived {
  remainingMs: number;
  elapsedPercent: number; // 0–100 for progress ring
  isExpiring: boolean;    // true when remainingMs < 60_000
  displayTime: string;    // "MM:SS" formatted
}

// PATCH /sessions/:id — request body
interface SessionUpdatePayload {
  action: 'pause' | 'resume' | 'end';
}

// Component props
interface GamingSessionControllerProps {
  childId: string;
  role: 'parent' | 'child';
  onSessionEnd?: () => void;
}

// Internal state
type ControllerStatus = 'loading' | 'idle' | 'active' | 'paused' | 'expiring' | 'confirming_end' | 'submitting' | 'ended';
```

---

### 3.3 API Calls

| Trigger | Method | Endpoint | Body | Handling |
|---|---|---|---|---|
| Mount | `GET` | `/sessions/active?childId={id}` | — | Populate `GameSession` or `null` → idle |
| Every 10s | `GET` | `/sessions/active?childId={id}` | — | Sync server time (drift correction) |
| Pause | `PATCH` | `/sessions/{id}` | `{ action: 'pause' }` | Freeze countdown locally, confirm from response |
| Resume | `PATCH` | `/sessions/{id}` | `{ action: 'resume' }` | Resume countdown, recalculate `remainingMs` |
| End early | `PATCH` | `/sessions/{id}` | `{ action: 'end' }` | Trigger ENDED state |
| WebSocket | `WS` | `/ws` | subscribe: `session:{childId}` | Real-time push from parent app when parent pauses/extends |

---

### 3.4 Loading / Error / Empty States

| State | UI |
|---|---|
| **Loading** | Compact skeleton bar: circular shimmer + two text shimmers in a row |
| **Idle (no session)** | Widget hidden. Parent dashboard shows "Start a session" button in gaming section. |
| **Ended** | Full-screen overlay for child: animated trophy emoji + "GG! Well played!" + RP cost recap. Auto-dismisses after 5s. |
| **PATCH error** | Toast: "Could not update session — try again". Revert to previous status. |
| **WS disconnect** | Fallback to 10s polling. Badge: "Live • Reconnecting…" amber dot. |

---

### 3.5 Accessibility Requirements

- Timer region: `role="timer"` `aria-live="off"` (avoids constant screen reader interruptions); use `aria-label` updated every 60s: `aria-label="Gaming session: 23 minutes remaining"`
- Expiring state: single `aria-live="assertive"` announcement at 60s mark: "One minute remaining in your gaming session"
- Progress ring: `<svg role="img" aria-label="{elapsedPercent}% of session elapsed">` with `<title>` fallback
- Pause/Resume button toggles `aria-pressed`
- "End Early" confirm dialog: `role="alertdialog"` with `aria-describedby` pointing to warning text
- All interactive elements ≥ 44×44px touch target (WCAG 2.5.5)
- Colour changes (green→amber→red) accompanied by icon changes (✅→⚠️→🔴)

---

### 3.6 React Component Structure

```
<GamingSessionController>
  ├── {status === 'loading'} → <SessionSkeleton />
  ├── {status === 'idle'}    → null  (widget hidden)
  │
  ├── {status in ['active','paused','expiring','submitting']} →
  │   <SessionBar data-expiring={isExpiring}>
  │   ├── <CircularProgress value={elapsedPercent} />
  │   ├── <TimerDisplay role="timer" aria-label={...}>
  │   │   ├── <span className="time">{displayTime}</span>
  │   │   └── <span className="label">remaining</span>
  │   ├── {role === 'parent'} →
  │   │   ├── <PauseResumeButton status={status} onClick={handlePauseResume}
  │   │   │     aria-pressed={status==='paused'} aria-busy={submitting} />
  │   │   └── <EndEarlyButton onClick={() => setStatus('confirming_end')} />
  │   └── {status === 'paused'} → <PausedBadge />
  │
  ├── {status === 'confirming_end'} →
  │   <ConfirmEndDialog role="alertdialog"
  │     onConfirm={handleEndEarly}
  │     onCancel={() => setStatus('active')} />
  │
  └── {status === 'ended'} →
      <SessionEndOverlay rpCost={session.rpCost} onDismiss={onSessionEnd} />
```

---

## 4. Reward Store

**Location:** Child Dashboard → "Store" tab
**Purpose:** Child browses available rewards (RP and GP), views their balance, and initiates redemption.

---

### 4.1 State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          REWARD STORE                                   │
└─────────────────────────────────────────────────────────────────────────┘

         mount
           │
           ▼
    ┌─────────────┐
    │   LOADING   │  Fetch rewards + child balance
    └──────┬──────┘
           │
     ┌─────┴──────┐
     │            │
  API error    data loaded
     │            │
     ▼            ▼
 ┌───────┐  ┌──────────────────────────────────────────────────────┐
 │ ERROR │  │                    BROWSING                          │
 │[Retry]│  │  Filter tabs: All / Gaming Time / Gift Cards / Custom│
 └───────┘  │  Sort: Popular / Newest / Cost: low→high             │
            │  Reward cards: name, cost, locked if balance < cost  │
            └────────────────────┬─────────────────────────────────┘
                                 │
                           tap reward card
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              balance >= cost           balance < cost
                    │                         │
                    ▼                         ▼
             ┌────────────┐         ┌───────────────────┐
             │  DETAIL    │         │  LOCKED SHEET     │
             │  SHEET     │         │  "You need X more │
             └─────┬──────┘         │  RP to unlock"    │
                   │                └───────────────────┘
              tap redeem
                   │
                   ▼
            ┌─────────────┐
            │  CONFIRMING │  "Spend {cost} RP for {reward}?"
            └──────┬──────┘
                   │
           ┌───────┴───────┐
           │               │
        confirm          cancel
           │               │
           ▼               ▼
    ┌─────────────┐    (BROWSING)
    │  REDEEMING  │  POST /rewards/:id/redeem
    └──────┬──────┘  Spinner in sheet
           │
     ┌─────┴──────┐
     │            │
  error        success
     │            │
     ▼            ▼
  toast       ┌────────────────────┐
  (BROWSING)  │  REDEEMED          │
              │  confetti burst    │
              │  "🎮 Reward sent!" │
              │  [Back to Store]   │
              └────────────────────┘
```

---

### 4.2 TypeScript Interfaces

```typescript
type RewardCategory = 'gaming_time' | 'giftcard' | 'custom';
type RewardCurrency = 'RP' | 'GP';

interface Reward {
  id: string;
  name: string;
  description: string;
  category: RewardCategory;
  currency: RewardCurrency;
  cost: number;            // in RP or GP cents
  imageUrl: string | null;
  platform: string | null; // e.g. "Roblox", "Steam", null for custom
  available: boolean;      // parent has marked as visible
  featured: boolean;
}

interface ChildBalance {
  rpBalance: number;
  gpBalance: number; // in cents
}

// POST /rewards/:id/redeem
interface RedeemRequest {
  childId: string;
}

// POST /rewards/:id/redeem — response
interface RedeemResponse {
  redemptionId: string;
  reward: Reward;
  newRpBalance?: number;
  newGpBalance?: number;
  message: string; // e.g. "Reward sent to parent for fulfillment"
}

type StoreFilter = 'all' | RewardCategory;
type StoreSort = 'popular' | 'newest' | 'cost_asc';

interface RewardStoreState {
  rewards: Reward[];
  balance: ChildBalance;
  filter: StoreFilter;
  sort: StoreSort;
  selected: Reward | null;
  phase: 'loading' | 'error' | 'browsing' | 'detail' | 'locked' | 'confirming' | 'redeeming' | 'redeemed';
  errorMessage: string | null;
  lastRedemption: RedeemResponse | null;
}

interface RewardStoreProps {
  childId: string;
  onBalanceChange?: (rpBalance: number, gpBalance: number) => void;
}
```

---

### 4.3 API Calls

| Trigger | Method | Endpoint | Body | Handling |
|---|---|---|---|---|
| Mount | `GET` | `/rewards?childId={id}` | — | Populate rewards list |
| Mount | `GET` | `/children/{id}/balance` | — | Populate balance |
| After redemption | `GET` | `/children/{id}/balance` | — | Refresh balance display |
| Redeem confirm | `POST` | `/rewards/{id}/redeem` | `{ childId }` | → REDEEMED or toast error |

---

### 4.4 Loading / Error / Empty States

| State | UI |
|---|---|
| **Loading** | 2×3 grid of shimmer reward cards, balance area shimmer |
| **Error** | Full-pane: 🚫 icon, message, `[Try Again]` button |
| **Empty (filter)** | Centre of grid: greyed-out icon + "No {filter} rewards yet" + "Ask a parent to add some!" |
| **Empty (all)** | Centre: trophy icon + "No rewards set up yet. Ask a parent!" |
| **Locked reward** | Card has 🔒 overlay, cost shown in red, tapping opens LOCKED SHEET |
| **Redeeming** | Sheet remains open, button spinner, `aria-busy="true"`, disabled |
| **GP reward** | Gold coin icon badge on card; different cost display format |

---

### 4.5 Accessibility Requirements

- Filter tabs: `role="tablist"` with `role="tab"` children; `aria-selected` on active tab
- Reward cards: `role="button"` (or `<button>`), `aria-label="{name}, {cost} RP, {available ? '' : 'locked'}"`
- Locked cards: `aria-disabled="true"` — still focusable so screen reader reads "locked" state
- Balance display: `<output>` element that updates with `aria-live="polite"` after redemption
- Confirm dialog: `role="alertdialog"` with `aria-describedby` pointing to cost warning
- Confetti animation: `prefers-reduced-motion` media query check — skip particle animation, show static "Redeemed!" text instead
- Sort dropdown: standard `<select>` with visible label
- All reward images: `alt="{platform} reward"` or `alt=""` if decorative

---

### 4.6 React Component Structure

```
<RewardStore>
  ├── <StoreHeader>
  │   ├── <BalanceDisplay>
  │   │   ├── <RPBalance value={rpBalance} aria-live="polite" />
  │   │   └── <GPBalance value={gpBalance} aria-live="polite" />
  │   └── <SortSelect value={sort} onChange={setSort} />
  │
  ├── <FilterTabs role="tablist">
  │   ├── <Tab value="all">All</Tab>
  │   ├── <Tab value="gaming_time">⏱ Gaming Time</Tab>
  │   ├── <Tab value="giftcard">🎮 Gift Cards</Tab>
  │   └── <Tab value="custom">⭐ Custom</Tab>
  │
  ├── {phase === 'loading'} → <RewardGridSkeleton />
  ├── {phase === 'error'}   → <StoreError message={errorMessage} onRetry={reload} />
  │
  ├── {phase in ['browsing','detail','locked','confirming','redeeming','redeemed']} →
  │   <RewardGrid>
  │   └── {filteredSorted.map(r =>
  │         <RewardCard reward={r} canAfford={canAfford(r)} onClick={select} />
  │       )}
  │
  ├── {phase === 'detail'} →
  │   <RewardDetailSheet reward={selected} onRedeem={startRedeem} onClose={deselect}>
  │   ├── <RewardImage />
  │   ├── <RewardDescription />
  │   ├── <CostPill currency={selected.currency} cost={selected.cost} />
  │   └── <RedeemButton />
  │
  ├── {phase === 'locked'} →
  │   <LockedSheet reward={selected} balance={balance} onClose={deselect} />
  │
  ├── {phase === 'confirming'} →
  │   <ConfirmRedeemDialog reward={selected} onConfirm={doRedeem} onCancel={deselect} />
  │
  └── {phase === 'redeemed'} →
      <RedemptionSuccess redemption={lastRedemption} onBack={resetStore} />
      <ConfettiLayer reduceMotionSafe />
```

---

## 5. Child PIN Login

**Location:** App launch → role selection → child taps their avatar
**Purpose:** Child (age 6–13) authenticates using a simple 4-digit PIN, with accessible large-touch UI.

---

### 5.1 State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHILD PIN LOGIN                                 │
└─────────────────────────────────────────────────────────────────────────┘

        mount (childId known)
               │
               ▼
        ┌─────────────┐
        │    IDLE     │  Avatar + name shown
        │   (empty    │  4 PIN dots (empty)
        │    input)   │  Numpad 1–9, 0, ⌫
        └──────┬──────┘
               │
           digit tap
               │
               ▼
        ┌─────────────┐
        │  ENTERING   │  Dots fill as digits entered
        │  (1–3 digits│  ⌫ button active
        │   entered)  │
        └──────┬──────┘
               │
          4th digit entered
               │
               ▼
        ┌─────────────┐
        │  VERIFYING  │  POST /auth/child-pin
        │  (spinner   │  4 dots pulse/spinner
        │   on dots)  │
        └──────┬──────┘
               │
        ┌──────┴──────┐
        │             │
    incorrect       correct
        │             │
        ▼             ▼
  ┌──────────┐  ┌──────────────┐
  │  SHAKE   │  │   SUCCESS    │
  │  ERROR   │  │ Navigate to  │
  │  dots    │  │ Child Dash   │
  │  red     │  └──────────────┘
  │  +1 fail │
  └─────┬────┘
        │
  ┌─────┴─────┐
  │           │
 <3 fails   3rd fail
  │           │
  ▼           ▼
(IDLE)   ┌───────────────────┐
  reset  │   LOCKED OUT      │
  input  │ "Ask a parent     │
         │  to unlock"       │
         │ 30-second timer   │
         └───────────┬───────┘
                     │
                  30s elapsed
                     │
                     ▼
                  (IDLE)
                  reset
                  attempt count
```

---

### 5.2 TypeScript Interfaces

```typescript
interface ChildProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarColor: string; // hex, used as fallback avatar background
}

// POST /auth/child-pin
interface ChildPinRequest {
  childId: string;
  pin: string; // 4-digit string "0000"–"9999"
}

// POST /auth/child-pin — response (success)
interface ChildPinResponse {
  token: string;
  child: ChildProfile;
  expiresAt: string; // ISO 8601
}

// POST /auth/child-pin — response (failure)
interface ChildPinError {
  error: 'invalid_pin';
  attemptsRemaining: number; // 0 = locked
}

type PinLoginPhase =
  | 'idle'
  | 'entering'
  | 'verifying'
  | 'error'
  | 'shaking'
  | 'locked'
  | 'success';

interface PinLoginState {
  digits: string[];           // up to 4 elements, '0'–'9'
  phase: PinLoginPhase;
  errorMessage: string | null;
  attemptsRemaining: number;  // starts at 3
  lockoutSecondsLeft: number; // only active in 'locked'
}

interface ChildPinLoginProps {
  child: ChildProfile;
  onSuccess: (token: string) => void;
  onSwitchUser: () => void; // back to avatar selection
}
```

---

### 5.3 API Calls

| Trigger | Method | Endpoint | Body | On Success | On Failure |
|---|---|---|---|---|---|
| 4th digit entered | `POST` | `/auth/child-pin` | `{ childId, pin }` | store token, call `onSuccess` | → SHAKE + decrement attempts |
| 3rd failed attempt | — | — | — | → LOCKED state (client-side timer) | — |

Rate-limiting is enforced server-side; the client tracks attempts to show the lockout UI without needing an additional API call.

---

### 5.4 Loading / Error / Empty States

| State | UI |
|---|---|
| **Verifying** | 4 PIN dots animate as a loading indicator (e.g. sequential pulse). Numpad disabled. |
| **Shake error** | 4 dots turn red and play shake animation (CSS `@keyframes shake`). Error text: "Wrong PIN – {n} tries left". Auto-reset after 600ms to IDLE with cleared input. |
| **Locked out** | All numpad buttons disabled. Message: "Too many tries. Wait {n}s and try again." Countdown shown. After 30s, reset to IDLE. |
| **No avatar image** | Coloured circle with first letter of child's name (avatar fallback). |

---

### 5.5 Accessibility Requirements

- This screen targets children age 6–9 who may not read well — all numpad buttons are **numbers only** (no text labels beyond the digit)
- Each numpad button: minimum **80×80px** touch target on mobile
- PIN dot indicators: `aria-label="PIN entry: {n} of 4 digits entered"` on the dot row; updated with `aria-live="polite"` on each digit press
- Backspace button: `aria-label="Delete last digit"`
- Error state: `role="alert"` on error message so screen reader announces immediately
- Locked state: `role="alert"` on lockout message; `aria-live="polite"` countdown updates every 5s (not every second, to reduce noise)
- Shake animation: `prefers-reduced-motion` — replace shake with colour change only (no movement)
- All numpad buttons remain in DOM during VERIFYING (not removed), only `disabled` attribute applied — avoids focus loss
- "Not you?" / switch user button: `aria-label="Switch to a different user"`
- Font sizes for this screen: minimum 20px for child name, 32px for numpad digits (readability-first)

---

### 5.6 React Component Structure

```
<ChildPinLogin>
  ├── <BackButton onClick={onSwitchUser} aria-label="Switch to a different user" />
  │
  ├── <ChildAvatar>
  │   ├── {avatarUrl} → <img src={avatarUrl} alt="{name}'s avatar" />
  │   └── {!avatarUrl} → <AvatarFallback color={avatarColor} initial={name[0]} />
  │
  ├── <ChildName>{name}</ChildName>
  │
  ├── <PinDots digits={digits} phase={phase}
  │           aria-label={`PIN entry: ${digits.length} of 4 digits entered`}
  │           aria-live="polite">
  │   └── [0..3].map(i => <Dot filled={i < digits.length} />)
  │
  ├── {phase === 'error' || phase === 'shaking'} →
  │   <ErrorMessage role="alert">{errorMessage}</ErrorMessage>
  │
  ├── {phase === 'locked'} →
  │   <LockoutMessage role="alert">
  │     Too many tries. Wait {lockoutSecondsLeft}s and try again.
  │   </LockoutMessage>
  │
  └── <Numpad disabled={phase === 'verifying' || phase === 'locked'}>
      ├── [1..9].map(n => <NumpadButton digit={n} onPress={appendDigit} />)
      ├── <NumpadButton digit={0} onPress={appendDigit} />
      └── <BackspaceButton onPress={deleteDigit} aria-label="Delete last digit"
                           disabled={digits.length === 0} />
```

---

## Cross-Component Notes

### Shared Patterns

1. **Token injection**: All `apiRequest()` calls receive the JWT from React context (`useAuth().token`); components never access `localStorage` directly.

2. **Error boundary**: Each component is wrapped in an `<ErrorBoundary>` that catches unexpected render errors and shows a generic recovery UI.

3. **Optimistic UI**: Evidence Review and Reward Store update local state immediately on user action, then reconcile with server response. On failure, revert + toast.

4. **Toast system**: All transient feedback (success/error) goes through a global `useToast()` hook that renders at root level. Components never render their own toast containers.

5. **Reduced motion**: All animation-heavy components (confetti, shake, countdown pulse) check `window.matchMedia('(prefers-reduced-motion: reduce)')` and provide static fallbacks.

6. **Dark mode**: All components consume CSS custom properties from `design-system.md`. No hardcoded colour values in component code.

### API Base URL

```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
```

(Mobile: `process.env.EXPO_PUBLIC_API_URL`)

### Auth Token Storage

- **Web**: `httpOnly` cookie (set by `/auth/login`); no manual token management needed for most calls
- **Mobile (Parent)**: `expo-secure-store` — key `gametime_parent_token`
- **Mobile (Child)**: In-memory only (React context); expires with app session; re-authenticate via PIN on next open

---

*End of Component Logic v1.0*
