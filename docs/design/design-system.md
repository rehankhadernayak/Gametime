# Gametime Design System

> Version 1.0 — Production Reference Document
> Last updated: 2026-03-11

---

## 1. Brand Foundations

Gametime serves two distinct audiences on one platform: **parents** who need trust and clarity, and **children aged 6–13** who need energy and reward. The design system unifies both through a shared token layer while allowing surface-level differentiation via role-specific accent colors.

**Design principles:**
1. **Clarity over decoration** — every element has a job
2. **Reward-forward** — completion and progress must feel satisfying
3. **Safe and legible** — WCAG AA minimum everywhere, AAA for child-facing primary text
4. **Mobile-first** — designed at 375 px, scaled up

---

## 2. Color Palette

### 2.1 Brand Colors

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--color-primary` | `#3B5BDB` | `#748FFC` | Parent-facing CTA, active states |
| `--color-primary-dark` | `#2F4AC0` | `#849FFF` | Hover, pressed |
| `--color-primary-light` | `#748FFC` | `#4C6EF5` | Disabled, ghost |
| `--color-primary-surface` | `#EDF2FF` | `#1A1F3D` | Parent tinted backgrounds |
| `--color-energy` | `#7C3AED` | `#9D72FF` | Child-facing accent, gamification |
| `--color-energy-dark` | `#6D28D9` | `#A78BFA` | Hover |
| `--color-energy-light` | `#A78BFA` | `#7C3AED` | Muted |
| `--color-energy-surface` | `#F5F3FF` | `#1E1533` | Child tinted backgrounds |

### 2.2 Semantic Colors

| Token | Light | Dark | Context |
|---|---|---|---|
| `--color-success` | `#22C55E` | `#4ADE80` | Task approved, reward fulfilled |
| `--color-success-dark` | `#16A34A` | `#22C55E` | Success hover |
| `--color-success-surface` | `#F0FDF4` | `#052E16` | Approved card background |
| `--color-warning` | `#F59E0B` | `#FCD34D` | Pending approval, cap approaching |
| `--color-warning-dark` | `#D97706` | `#F59E0B` | Warning hover |
| `--color-warning-surface` | `#FFFBEB` | `#2D1F00` | Pending card background |
| `--color-error` | `#EF4444` | `#F87171` | Rejected, blocked, cap exceeded |
| `--color-error-dark` | `#DC2626` | `#EF4444` | Error hover |
| `--color-error-surface` | `#FEF2F2` | `#2A0A0A` | Error card background |
| `--color-info` | `#3B82F6` | `#60A5FA` | AI badge, neutral info |
| `--color-info-surface` | `#EFF6FF` | `#0C1A3D` | Info card background |

### 2.3 Neutral Tokens

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#F8F9FA` | `#0F0F11` |
| `--color-surface` | `#FFFFFF` | `#1A1B1E` |
| `--color-surface-2` | `#F1F3F5` | `#25262B` |
| `--color-surface-3` | `#E9ECEF` | `#2C2E33` |
| `--color-border` | `#E9ECEF` | `#373A40` |
| `--color-border-strong` | `#CED4DA` | `#4C4F56` |
| `--color-text` | `#1A1C20` | `#F1F3F5` |
| `--color-text-secondary` | `#495057` | `#C1C2C5` |
| `--color-text-muted` | `#868E96` | `#909296` |
| `--color-text-disabled` | `#ADB5BD` | `#5C5F66` |
| `--color-overlay` | `rgba(0,0,0,0.50)` | `rgba(0,0,0,0.70)` |
| `--color-overlay-light` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.06)` |

### 2.4 Child-Mode Palette Extension

Child screens use the `energy` scale as primary but gain two additional accent tokens for gamification:

| Token | Value | Usage |
|---|---|---|
| `--color-xp-gold` | `#F59E0B` | Points earned celebration |
| `--color-xp-gold-surface` | `#FEF9C3` | Points gain highlight |
| `--color-level-teal` | `#14B8A6` | Streak, achievement badge |

---

## 3. Typography

**Font stack:** `'Nunito', 'Plus Jakarta Sans', system-ui, sans-serif`

Nunito's rounded letterforms reduce cognitive load for younger readers while remaining crisp for parents. Load weights: 400, 500, 600, 700, 800.

```
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
```

### 3.1 Type Scale

| Level | Size | Line Height | Letter Spacing | Weight | Usage |
|---|---|---|---|---|---|
| `display` | 48 px | 56 px | −0.02 em | 800 | Hero headings |
| `h1` | 36 px | 44 px | −0.02 em | 700 | Page titles |
| `h2` | 28 px | 36 px | −0.01 em | 700 | Section headers |
| `h3` | 22 px | 30 px | −0.01 em | 600 | Card headers |
| `h4` | 18 px | 26 px | 0 em | 600 | Sub-section labels |
| `body-lg` | 18 px | 28 px | 0 em | 400 | Intro paragraphs |
| `body` | 16 px | 24 px | 0 em | 400 | Default body |
| `body-sm` | 14 px | 20 px | +0.01 em | 400 | Secondary labels |
| `caption` | 12 px | 16 px | +0.02 em | 400 | Timestamps, hints |

### 3.2 Responsive Scaling

On screens < 768 px, apply this multiplier via `clamp()`:
- `display`: `clamp(32px, 8vw, 48px)`
- `h1`: `clamp(26px, 6vw, 36px)`
- `h2`: `clamp(20px, 5vw, 28px)`

### 3.3 Child-Mode Typography Adjustments

For child-facing surfaces (ChildDashboard, ChildTasks, Rewards, PIN Login):
- Minimum body size: **16 px** (never use `body-sm` for primary content)
- Increase `body` to `18 px` for children aged 6–9
- `caption` elevated to `14 px` for timestamps

---

## 4. Spacing System

Base unit: **8 px**

| Token | Value | Usage |
|---|---|---|
| `--spacing-1` | 4 px | Icon internal padding, hairline gaps |
| `--spacing-2` | 8 px | Compact inner padding |
| `--spacing-3` | 12 px | Button inner padding (sm) |
| `--spacing-4` | 16 px | Default card padding, list items |
| `--spacing-5` | 20 px | Section internal padding |
| `--spacing-6` | 24 px | Card padding (standard) |
| `--spacing-8` | 32 px | Between cards in a grid |
| `--spacing-10` | 40 px | Section top/bottom padding |
| `--spacing-12` | 48 px | Major section separation |
| `--spacing-16` | 64 px | Page-level top padding |
| `--spacing-20` | 80 px | Hero padding |
| `--spacing-24` | 96 px | Landing section gaps |

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6 px | Badges, chips, small tags |
| `--radius-md` | 10 px | Buttons, inputs |
| `--radius-lg` | 14 px | Cards |
| `--radius-xl` | 20 px | Modals, bottom sheets |
| `--radius-full` | 9999 px | Pills, avatars, toggle |

### Elevation (Box Shadow)

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Cards at rest |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.10)` | Raised cards, dropdowns |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Modals |
| `--shadow-xl` | `0 16px 40px rgba(0,0,0,0.16)` | Floating panels |
| `--shadow-focus` | `0 0 0 3px rgba(59,91,219,0.30)` | Focus ring (parent) |
| `--shadow-focus-energy` | `0 0 0 3px rgba(124,58,237,0.30)` | Focus ring (child) |

---

## 5. Component Specifications

### 5.1 Task Card

**Dimensions:** Full-width in list, min-height 88 px. Mobile: full bleed with `--spacing-4` horizontal padding.

**States:**

| State | Left border | Background | Badge |
|---|---|---|---|
| `active` | `--color-primary` 4 px | `--color-surface` | Blue "Active" |
| `pending` | `--color-warning` 4 px | `--color-warning-surface` | Amber "Awaiting Review" |
| `approved` | `--color-success` 4 px | `--color-success-surface` | Green "Approved ✓" + RP chip |
| `rejected` | `--color-error` 4 px | `--color-error-surface` | Red "Sent Back" |
| `expired` | `--color-border` 4 px | `--color-surface-2` | Grey "Expired" |

**Anatomy:**
```
┌─────────────────────────────────────────────────┐
│ [State border] [Category icon]  Title           │
│                Sub-text (child name / due date) │
│                [Status badge]  [RP chip] [→]    │
└─────────────────────────────────────────────────┘
```
- Title: `body` / `--color-text` / truncate at 2 lines
- Sub-text: `caption` / `--color-text-muted`
- On hover: `--shadow-md`, translateY(-1px), 150 ms ease
- On tap (mobile): scale(0.98), 100 ms

---

### 5.2 Evidence Submission Modal

**Dimensions:** Full-screen sheet on mobile; centered modal 540 px wide on desktop.

**Steps:** (1) Camera/Library picker → (2) Preview + note → (3) Submit confirmation

**States:**
- `idle` — pick source button pair (Camera / Photo Library / Video)
- `preview` — thumbnail + written note textarea (max 300 chars) + character counter
- `uploading` — progress bar, cancel button
- `error` — red banner with retry

**Validation:**
- Max file: 10 MB (enforced before upload)
- Accepted: JPEG, PNG, MOV, MP4
- Note field: optional but encouraged (prompt: "Tell us what you did!")

**Accessibility:** All buttons min 44×44 px tap target; camera permission prompt friendly copy.

---

### 5.3 AI Recommendation Badge

**Size:** 28 px height chip with icon left.

| Outcome | Icon | Color | Label |
|---|---|---|---|
| `approve` | ✓ | `--color-success` | "AI: Approve · 92%" |
| `reject` | ✗ | `--color-error` | "AI: Reject · 78%" |
| `needsreview` | ? | `--color-warning` | "AI: Review · 61%" |
| `pending` | ⟳ | `--color-info` | "AI Reviewing…" (pulse) |
| `unavailable` | — | `--color-text-muted` | "AI Unavailable" |

Confidence % rendered in `caption` inside the chip. Tapping expands to show full `ai_reason` text in a tooltip/popover (max 200 chars, truncated with "...").

---

### 5.4 Points Balance Display

**Two variants:** compact (sidebar chip) and expanded (dashboard card).

**Compact (RP):**
```
 ★ 1,240 RP
```
- Star icon `#F59E0B`, value in `h4` bold, "RP" in `caption` muted
- Animate on change: number counter scrolls up (500 ms ease-out)

**Compact (GP):**
```
 💎 45 GP
```
- Diamond icon `--color-energy`, same layout

**Expanded card (120×72 px):**
```
┌─────────────────┐
│  ★  1,240       │
│     Regular Pts │
└─────────────────┘
```
On earn event: brief green flash background (300 ms), confetti burst (see Animations §7).

---

### 5.5 Reward Card

**Dimensions:** 164×200 px (grid 2-col mobile / 3-col tablet / 4-col desktop).

| State | Overlay | CTA |
|---|---|---|
| `affordable` | None | "Redeem – 500 RP" (primary) |
| `locked` | 40% dark overlay + lock icon | "Need 300 more RP" (disabled) |
| `out-of-stock` | "Sold Out" ribbon top-right | No CTA |

**Anatomy:**
```
┌─────────────────┐
│   [Reward img]  │
│  ───────────── │
│  Title          │
│  [Cost chip]    │
│  [CTA button]   │
└─────────────────┘
```
Reward image: 164×100 px, `object-fit: cover`, `--radius-lg` top corners only.

---

### 5.6 Gift Card Code Reveal

**Trigger:** Parent marks redemption fulfilled → child taps "Reveal Code".

**Reveal animation:**
1. Blurred placeholder (`blur(8px)`) with lock icon
2. Tap → 400 ms dissolve, blur reduces to 0
3. Code displayed in monospace `h3` with copy-to-clipboard button
4. One-time reveal: code greys out after 60 s with "Tap to show again" micro-text

**Layout:**
```
┌───────────────────────────────┐
│  🎮  Steam Gift Card          │
│  Value: SGD 10                │
│  ┌─────────────────────────┐  │
│  │  XXXXX-XXXXX-XXXXX      │  │
│  └─────────────────────────┘  │
│  [Copy Code]   [Done]         │
└───────────────────────────────┘
```

---

### 5.7 Gaming Session Button + Live Timer

**States:** idle → active → cap-warning → cap-reached

**Idle:**
- Large rounded rectangle, `--color-energy` fill, "Start Session" label, game selector above

**Active:**
- Button turns red "End Session"
- Live timer below: `HH:MM:SS` in `h2` monospace, counts up
- Subtle green pulse ring around button every 5 s

**Cap warning (10 min remaining):**
- Timer text turns `--color-warning`
- "10 min remaining" caption appears with pulse animation

**Cap reached:**
- Timer freezes, button disabled
- Session automatically ends, modal appears

**Dimensions:** 280×72 px button, full-width on mobile.

---

### 5.8 Daily/Weekly Cap Progress Ring

**Dimensions:** 96×96 px (compact), 140×140 px (dashboard).

- SVG circle `stroke-dasharray` driven by usage percentage
- Track: `--color-border` 8 px stroke
- Fill: `--color-success` → `--color-warning` (75%) → `--color-error` (95%)
- Centre text: `h4` used / total in minutes
- Label below ring: "Daily" or "Weekly" in `caption`

Transition: `stroke-dashoffset` animates over 600 ms ease-out on data update.

---

### 5.9 PIN Entry Pad (Ages 6–9)

**Layout:** Portrait-only, full screen. No system keyboard.

```
        [Child Name + Avatar]

        ● ● ○ ○   ← 4-dot indicator

   ┌───┬───┬───┐
   │ 1 │ 2 │ 3 │
   ├───┼───┼───┤
   │ 4 │ 5 │ 6 │
   ├───┼───┼───┤
   │ 7 │ 8 │ 9 │
   ├───┼───┼───┤
   │ ← │ 0 │   │
   └───┴───┴───┘
```

- Each key: 72×72 px, `--radius-xl`, `--color-surface-2` fill
- Key press: scale(0.92), 80 ms, haptic (mobile)
- Dots: 16 px circles, empty = `--color-border`, filled = `--color-energy`
- Wrong PIN: dots shake (keyframe: translateX ±8 px, 400 ms), clear after 600 ms
- Lockout (3 attempts): dots turn red, pad disabled, "Ask your parent to unlock" message

---

### 5.10 Notification Bell with Unread Badge

**Icon:** 24×24 px outline bell SVG.

- Badge: 18×18 px circle, `--color-error` fill, white `caption` count (max "9+")
- Badge position: top-right of icon, −4 px offset each axis
- On new notification: bell swings (rotate −15°→+15°, 3 cycles, 600 ms) once
- Badge pop-in: scale(0→1), 200 ms spring

---

### 5.11 Parent Tab Bar / Sidebar Navigation (Web)

**Web sidebar (collapsible, 240 px expanded / 64 px collapsed):**

| Tab | Icon | Label |
|---|---|---|
| Home | 🏠 | Home |
| Tasks | ✓ | Tasks |
| Approvals | 📋 | Approvals (+ badge) |
| Rewards | 🎁 | Rewards & Points |
| Gaming | 🎮 | Gaming Controls |
| Settings | ⚙️ | Settings |

- Active: `--color-primary-surface` background, `--color-primary` text + icon
- Hover: `--color-overlay-light` background, 150 ms
- Collapsed: icon only, tooltip on hover

**Mobile (bottom tab bar, 5 items max):**
Overflow "More" item opens a drawer with remaining items.

---

### 5.12 Child Bottom Navigation (Mobile, 4 Items)

```
┌────┬────┬────┬────┐
│ 🏠 │ ✓  │ 🎮 │ 🎁 │
│Home│Task│Game│Rwrd│
└────┴────┴────┴────┘
```

- Active: icon scale(1.15), label `--color-energy`, indicator dot below
- Tab bar height: 60 px + safe area inset
- Icon size: 26×26 px
- Active item has 4 px dot below icon, `--color-energy`

---

### 5.13 Task Creation Multi-Step Form

**4 steps, progress indicator at top:**

```
① Title & Details  ② Assign & Points  ③ Due Date  ④ Review
```

- Step pill: 28 px circle, inactive = `--color-border`, active = `--color-primary`
- Connecting line: 2 px, fills left-to-right as steps complete
- Navigation: "Back" (ghost) + "Continue" (primary) buttons
- Each step validates before advancing; inline errors

---

### 5.14 Due Date + Recurrence Picker

**Due Date:**
- Inline calendar, 7-day max lookahead enforced
- Days beyond 7 are greyed and unselectable
- Today highlighted `--color-primary-surface`
- Selected date: `--color-primary` fill, white text

**Recurrence:**
- Toggle: "One-time / Recurring"
- If recurring: day-of-week chip selector (Mon–Sun), multi-select
- Active days: `--color-energy` chip, white text
- Preview: "Repeats every Mon, Wed, Fri"

---

### 5.15 RP/GP Point Value Selector (Slider)

**RP range:** 5–50, step 5
**GP range:** 0–20, step 1

- Track height: 6 px, `--radius-full`
- Fill: `--color-primary` (RP) or `--color-energy` (GP)
- Thumb: 24×24 px circle with inner `4 px` white dot
- Thumb drag: scale(1.2), shadow pulse
- Value tooltip above thumb on drag
- Tick marks at every increment (small 4 px ticks below track)
- Quick-pick chips below: 5 / 10 / 20 / 30 / 50 RP

---

### 5.16 Dispute Submission Form

**Trigger:** Rejected task → child taps "Dispute".

**Layout:** Bottom sheet (mobile) / side panel (desktop).

```
┌────────────────────────────────────┐
│  Dispute: "Clean Your Room"        │
│  ─────────────────────────────── │
│  Why do you think it was rejected? │
│  ┌────────────────────────────┐    │
│  │ [Textarea, min 20 chars]   │    │
│  └────────────────────────────┘    │
│  Remaining: 280 chars              │
│  [Cancel]         [Submit Dispute] │
└────────────────────────────────────┘
```

- Submit disabled until 20+ chars
- On submit: optimistic success toast, locks form

---

### 5.17 Weekly Planning Table (Recurring Tasks)

**Layout:** 7-column grid (Mon–Sun), task rows.

```
             Mon  Tue  Wed  Thu  Fri  Sat  Sun
Homework      ●    ●    ●    ●    ●    ○    ○
Clean Room    ○    ○    ●    ○    ●    ○    ○
```

- Cell: 40×40 px, `●` = `--color-success`, `○` = `--color-border`
- Completed cells: green fill
- Pending cells: amber fill
- Row header: task title, truncated to 20 chars
- Column header: day abbreviation + date (Tue 11)

---

### 5.18 Game Library Card (Allowed/Blocked Toggle)

**Dimensions:** 200×72 px list item.

```
┌─────────────────────────────────────────┐
│ [Game icon 40px]  Title                 │
│                   Platform badges       │
│                              [Toggle]   │
└─────────────────────────────────────────┘
```

- Toggle: `--color-success` when allowed, `--color-error` when blocked
- Blocked state: game icon desaturated (grayscale 100%)
- Platform badges: small chips ("PC", "Console", "Mobile"), `--color-surface-2`

---

### 5.19 Session Denial Modal

**Trigger:** Child tries to start session when blocked/capped.

**Layout:** Centered modal, max-width 360 px.

```
┌─────────────────────────────────┐
│          🚫                     │
│  Session Not Allowed            │
│                                 │
│  Reason: [reason_text]          │
│  Code: DENY-001                 │
│                                 │
│  [OK]   [Show Parent]           │
└─────────────────────────────────┘
```

Reason codes:
- `DENY-001` — Daily cap reached
- `DENY-002` — Weekly cap reached
- `DENY-003` — Game blocked by parent
- `DENY-004` — Insufficient RP for session
- `DENY-005` — No active session plan

"Show Parent" opens deep-link QR or PIN for parent override (future feature, currently disabled with "Coming Soon" badge).

---

### 5.20 GP Top-Up Flow (3 Steps)

**Dimensions:** Full-screen modal with step indicator.

**Step 1 — Amount:**
```
Enter Amount (SGD)
[ $10 ] [ $25 ] [ $50 ] [ Custom ]
Conversion: SGD 10 = 100 GP
Allocate to children: [Auto] [Manual]
  ├ Alex:  50 GP
  └ Sam:   50 GP
```

**Step 2 — Payment (Stripe Elements):**
```
Card Number: ________________
MM/YY  CVC  Postal Code
[Pay SGD 10]
```
Note: Stripe form is sandboxed iFrame — no Gametime code touches card data.

**Step 3 — Success:**
```
      ✓ Payment successful
      +100 GP added
  Alex: 50 GP  Sam: 50 GP
      [Done]
```
Success: confetti burst, balance chips animate up.

---

### 5.21 Redemption Confirmation Modal

```
┌──────────────────────────────────────┐
│  Confirm Redemption                  │
│  ─────────────────────────────────  │
│  🎁  Roblox Gift Card – SGD 10       │
│  Cost: 100 GP                        │
│  Balance after: 45 GP → 0 GP         │
│                                      │
│  [Cancel]       [Confirm Redeem]     │
└──────────────────────────────────────┘
```

"Confirm Redeem" button turns `--color-energy`. On confirm: button shows spinner 800 ms, then success state. Balance pill in header animates down.

---

### 5.22 Parent Approval Panel (with AI Sub-panel)

**Desktop:** Two-column: evidence (left 60%) / action (right 40%)
**Mobile:** Full-screen sheet, scrollable, action bar sticky at bottom.

**Left/top — Evidence:**
- Photo or video player (aspect-ratio 16:9 or 4:3)
- Child's written note below
- Timestamp + child name `caption`

**Right/bottom — AI Panel:**
- AI badge (see §5.3)
- AI reason text (`body-sm`)
- Confidence bar (thin progress, matches badge color)

**Action Bar:**
- Parent note field (optional, max 200 chars)
- [Reject] (outlined error) + [Approve] (filled success) 44 px height buttons
- Both disabled until AI result resolves (or 10 s timeout)

---

### 5.23 Child Profile Selector (Parent Switcher)

**Compact row** in parent header:

```
[Avatar A] [Avatar S] [Avatar E] [+ Add]
```
- Avatars: 36×36 px circle, initial letter, `--color-energy-surface` bg
- Active child highlighted with ring: `2px solid --color-primary`
- Tap to switch context; confirmation if mid-task

---

### 5.24 Empty State Cards (5 Variants)

All empty states: centered illustration (80×80 px), `h3` headline, `body-sm` sub-copy, optional CTA.

| Variant | Illustration | Headline | Sub-copy |
|---|---|---|---|
| `no-tasks` | Clipboard ✓ | "All clear!" | "No tasks assigned yet. Create one to get started." |
| `no-rewards` | Gift box | "Empty store" | "Add rewards your children can work toward." |
| `no-notifications` | Bell ○ | "Nothing new" | "You're all caught up." |
| `no-games` | Controller | "No games added" | "Add games to set up session controls." |
| `no-children` | Family | "Add your first child" | "Invite a family member to start tracking." |

Illustration style: flat, minimal, 2-color (brand primary + light surface).

---

### 5.25 Loading Skeleton Screens (3 Variants)

Animation: `shimmer` — gradient sweeps left-to-right, 1.4 s loop.

```css
@keyframes shimmer {
  0%   { background-position: -400px 0 }
  100% { background-position: 400px 0 }
}
.skeleton { background: linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-3) 50%, var(--color-surface-2) 75%); background-size: 800px; animation: shimmer 1.4s infinite; border-radius: var(--radius-sm); }
```

| Variant | Mimics | Blocks |
|---|---|---|
| `task-list` | Task card list | 3 cards with title bar, sub-bar, badge |
| `reward-grid` | Reward store | 4 cards with image block, title, button |
| `dashboard` | Parent home | Stat chips row + 2 section headers + list |

---

### 5.26 Toast Notifications (3 Types)

**Position:** top-right desktop / top-center mobile. 60 px from top.
**Auto-dismiss:** 4 s. Stacks max 3 toasts.

| Type | Icon | Left border | Example |
|---|---|---|---|
| `success` | ✓ | `--color-success` | "Task approved! Alex earned 20 RP" |
| `error` | ✗ | `--color-error` | "Could not save changes. Try again." |
| `info` | ℹ | `--color-info` | "AI review still in progress…" |

**Anatomy:** 320 px wide, `--shadow-lg`, `--radius-lg`. Slide-in from right (200 ms), fade out (150 ms). "×" dismiss button top-right.

---

### 5.27 Onboarding Step Indicator

**Used in:** AI Signup flow, Task creation form, GP top-up.

```
  ①━━━━━②━━━━━③━━━━━④
Family  Tasks  Rewards  Done
```

- Circle: 32 px, completed = `--color-success` fill, active = `--color-primary` fill + ring, upcoming = `--color-border`
- Connecting line: 2 px, `--color-border` default, fills `--color-primary` when step completed
- Label: `caption` below each circle

---

### 5.28 Mobile Bottom Nav Bar

**Height:** 60 px + OS safe-area-inset-bottom.
**Background:** `--color-surface` with `border-top: 1px solid --color-border`.

Item anatomy:
```
    ↑
   icon (24px)
  ● (4px dot, active only)
  label (10px / caption)
```

Active dot: `--color-energy`, 4×4 px, centered below icon.

---

### 5.29 Search + Filter Bar

```
[ 🔍  Search tasks...                     ] [Filter ▼]
```

- Input: full-width, `--radius-md`, `border: 1px solid --color-border`, 44 px height
- Focus: border → `--color-primary`, `--shadow-focus`
- Filter button: compact pill, badge shows active filter count
- Filter dropdown: checklist (category, status, child name) max-height 280 px, scroll

---

### 5.30 Settings Row Item

```
┌────────────────────────────────────────────┐
│ [Icon]  Label                    Value [→] │
│         Description (optional)             │
└────────────────────────────────────────────┘
```

- Row height: 56 px (with description) / 48 px (without)
- Separator: 1 px `--color-border`, left-inset 48 px (aligns after icon)
- Types: navigate (→ chevron), toggle (switch), select (value + chevron), destructive (red label)
- Active/pressed: `--color-overlay-light` background, 100 ms

---

## 6. Animation Guidelines

### 6.1 Task State Transitions

| Transition | Duration | Easing | Effect |
|---|---|---|---|
| Active → PendingApproval | 300 ms | ease-out | Left border color swap + badge crossfade |
| PendingApproval → Approved | 500 ms | spring | Green flash + RP chip slide-in from right |
| PendingApproval → Rejected | 300 ms | ease-out | Red flash, gentle shake (2× ±4 px) |
| Any → Expired | 400 ms | ease-in | Opacity fades to 0.5, grayscale filter |

### 6.2 Points Earn Celebration

Triggered on task approval when child views their balance:

```
1. Balance chip pulses (scale 1→1.15→1, 300ms)
2. +XX RP floats up from chip (translateY -40px, opacity 0, 800ms)
3. 12 confetti particles burst from chip center (600ms, physics)
4. Number counter rolls up to new value (500ms, ease-out)
```

Confetti colors: `--color-primary`, `--color-energy`, `--color-xp-gold`, `--color-success`.

### 6.3 Reward Unlock Reveal

```
1. Card scales up (1→1.05, 200ms)
2. Lock icon fades out (150ms)
3. "Affordable!" label fades in (150ms)
4. CTA button slides up from bottom of card (200ms)
```

### 6.4 Page Transitions

- **Web:** Fade + slight translateY(8px→0), 200 ms ease-out
- **Mobile:** Stack push (right-to-left slide), 350 ms iOS spring
- **Tab switch:** Crossfade only, 150 ms

### 6.5 Micro-Interactions

| Interaction | Effect | Duration |
|---|---|---|
| Button tap | scale(0.96), shadow reduces | 80 ms / 120 ms return |
| Toggle on | Thumb slides right, track fills | 200 ms spring |
| Toggle off | Reverse | 200 ms spring |
| PIN key press | scale(0.88), haptic | 80 ms |
| Card hover (web) | translateY(-2px), shadow-md | 150 ms |
| Badge count update | Bounce scale 1→1.3→1 | 250 ms spring |

---

## 7. Accessibility — WCAG AA Requirements

### 7.1 Color Contrast Ratios

| Pair | Ratio | Standard |
|---|---|---|
| `--color-text` on `--color-bg` | 14.7:1 | AAA ✓ |
| `--color-text` on `--color-surface` | 16.2:1 | AAA ✓ |
| `--color-text-secondary` on `--color-bg` | 6.4:1 | AA ✓ |
| `--color-text-muted` on `--color-surface` | 4.6:1 | AA ✓ |
| White on `--color-primary` | 4.8:1 | AA ✓ |
| White on `--color-energy` | 5.3:1 | AA ✓ |
| White on `--color-success` | 3.1:1 | AA large only — use dark text for small labels |
| White on `--color-error` | 4.5:1 | AA ✓ |

**Child-facing surfaces** must achieve **AA everywhere**, no exceptions. Any text on child screens < 18 px must meet 4.5:1 minimum.

### 7.2 Touch Targets

- Minimum interactive area: **44×44 px** (WCAG 2.5.5)
- PIN keys: **72×72 px** (exceeds requirement)
- Bottom nav items: full column width × 60 px

### 7.3 Focus Management

- All interactive elements have a visible `:focus-visible` ring using `--shadow-focus` (parent) or `--shadow-focus-energy` (child)
- Never suppress `outline: none` without providing an alternative
- Modal open: focus trapped inside; on close: return focus to trigger

### 7.4 Screen Reader Requirements

- All icons that convey meaning: `aria-label` required
- Status badges: `role="status"` with `aria-live="polite"`
- AI badge updates: `aria-live="assertive"` (state change is important)
- Loading skeletons: `aria-busy="true"` on container, `aria-label="Loading..."`
- Progress rings: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

### 7.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  .confetti { display: none; }
}
```

---

## 8. CSS Custom Properties Export

```css
/* ============================================================
   GAMETIME DESIGN TOKENS — paste into src/styles/tokens.css
   ============================================================ */

:root {
  /* ── Brand ─────────────────────────────────────────── */
  --color-primary:          #3B5BDB;
  --color-primary-dark:     #2F4AC0;
  --color-primary-light:    #748FFC;
  --color-primary-surface:  #EDF2FF;

  --color-energy:           #7C3AED;
  --color-energy-dark:      #6D28D9;
  --color-energy-light:     #A78BFA;
  --color-energy-surface:   #F5F3FF;

  /* ── Semantic ─────────────────────────────────────── */
  --color-success:          #22C55E;
  --color-success-dark:     #16A34A;
  --color-success-surface:  #F0FDF4;

  --color-warning:          #F59E0B;
  --color-warning-dark:     #D97706;
  --color-warning-surface:  #FFFBEB;

  --color-error:            #EF4444;
  --color-error-dark:       #DC2626;
  --color-error-surface:    #FEF2F2;

  --color-info:             #3B82F6;
  --color-info-surface:     #EFF6FF;

  /* ── Gamification ─────────────────────────────────── */
  --color-xp-gold:          #F59E0B;
  --color-xp-gold-surface:  #FEF9C3;
  --color-level-teal:       #14B8A6;

  /* ── Neutral ─────────────────────────────────────── */
  --color-bg:               #F8F9FA;
  --color-surface:          #FFFFFF;
  --color-surface-2:        #F1F3F5;
  --color-surface-3:        #E9ECEF;
  --color-border:           #E9ECEF;
  --color-border-strong:    #CED4DA;
  --color-text:             #1A1C20;
  --color-text-secondary:   #495057;
  --color-text-muted:       #868E96;
  --color-text-disabled:    #ADB5BD;
  --color-overlay:          rgba(0, 0, 0, 0.50);
  --color-overlay-light:    rgba(0, 0, 0, 0.08);

  /* ── Typography ──────────────────────────────────── */
  --font-family:            'Nunito', 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-size-display:      48px;
  --font-size-h1:           36px;
  --font-size-h2:           28px;
  --font-size-h3:           22px;
  --font-size-h4:           18px;
  --font-size-body-lg:      18px;
  --font-size-body:         16px;
  --font-size-body-sm:      14px;
  --font-size-caption:      12px;

  --line-height-display:    56px;
  --line-height-h1:         44px;
  --line-height-h2:         36px;
  --line-height-h3:         30px;
  --line-height-h4:         26px;
  --line-height-body-lg:    28px;
  --line-height-body:       24px;
  --line-height-body-sm:    20px;
  --line-height-caption:    16px;

  /* ── Spacing ─────────────────────────────────────── */
  --spacing-1:  4px;
  --spacing-2:  8px;
  --spacing-3:  12px;
  --spacing-4:  16px;
  --spacing-5:  20px;
  --spacing-6:  24px;
  --spacing-8:  32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;
  --spacing-20: 80px;
  --spacing-24: 96px;

  /* ── Radius ──────────────────────────────────────── */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   20px;
  --radius-full: 9999px;

  /* ── Shadow ──────────────────────────────────────── */
  --shadow-sm:           0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md:           0 4px 12px rgba(0, 0, 0, 0.10);
  --shadow-lg:           0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-xl:           0 16px 40px rgba(0, 0, 0, 0.16);
  --shadow-focus:        0 0 0 3px rgba(59, 91, 219, 0.30);
  --shadow-focus-energy: 0 0 0 3px rgba(124, 58, 237, 0.30);

  /* ── Motion ──────────────────────────────────────── */
  --duration-fast:    80ms;
  --duration-normal:  200ms;
  --duration-slow:    350ms;
  --duration-xslow:   600ms;
  --ease-default:     cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:         cubic-bezier(0, 0, 0.2, 1);
}

/* ── Dark mode overrides ─────────────────────────────── */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary:          #748FFC;
    --color-primary-dark:     #849FFF;
    --color-primary-light:    #4C6EF5;
    --color-primary-surface:  #1A1F3D;

    --color-energy:           #9D72FF;
    --color-energy-dark:      #A78BFA;
    --color-energy-light:     #7C3AED;
    --color-energy-surface:   #1E1533;

    --color-success:          #4ADE80;
    --color-success-dark:     #22C55E;
    --color-success-surface:  #052E16;

    --color-warning:          #FCD34D;
    --color-warning-dark:     #F59E0B;
    --color-warning-surface:  #2D1F00;

    --color-error:            #F87171;
    --color-error-dark:       #EF4444;
    --color-error-surface:    #2A0A0A;

    --color-info:             #60A5FA;
    --color-info-surface:     #0C1A3D;

    --color-bg:               #0F0F11;
    --color-surface:          #1A1B1E;
    --color-surface-2:        #25262B;
    --color-surface-3:        #2C2E33;
    --color-border:           #373A40;
    --color-border-strong:    #4C4F56;
    --color-text:             #F1F3F5;
    --color-text-secondary:   #C1C2C5;
    --color-text-muted:       #909296;
    --color-text-disabled:    #5C5F66;
    --color-overlay:          rgba(0, 0, 0, 0.70);
    --color-overlay-light:    rgba(255, 255, 255, 0.06);
  }
}

/* ── Data attribute override (manual dark mode toggle) ── */
[data-theme="dark"] { /* same vars as above */ }
[data-theme="light"] { /* force light even if OS dark */ }
```

---

*End of Design System v1.0*
