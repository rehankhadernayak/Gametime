# Gametime UI Redesign Proposal
## Premium SaaS + Gamer Aesthetic with Bento Grid Architecture

> **Design Lead:** Senior Full-Stack Engineer + Lead UI/UX Designer  
> **Status:** Proposal for Implementation  
> **Last Updated:** April 20, 2026

---

## 1. Design Manifesto: Visual Style Guide

### 1.1 Core Aesthetic Principles

**Glassmorphism Dark Theme ("Gamer Soul")**
- **Base:** Deep Obsidian (`#050505`) with dark panels (`#0A0F1F`, `#1A2339`)
- **Glass Effect:** 
  - `backdrop-filter: blur(20px);`
  - Background: `rgba(20, 35, 60, 0.68);`
  - Border: `rgba(124, 91, 255, 0.15);` (1px)
- **Depth:** Radial mesh gradients (purple-to-cyan), elevated shadows with purple tint
- **Motion:** 0.2s ease-in-out for all transitions; optional spring animations (`cubic-bezier(0.34, 1.56, 0.64, 1)`)

### 1.2 Typography System

| Element | Font | Size | Weight | Letter-Spacing | Usage |
|---------|------|------|--------|-----------------|-------|
| Display | Sora | 48px → `clamp(32px, 8vw, 48px)` | 700 | −0.02em | Hero, page titles |
| H1 | Sora | 36px | 700 | −0.02em | Section headers |
| H2 | Sora | 28px | 700 | −0.01em | Bento card titles |
| H3 | Sora | 22px | 600 | −0.01em | Subsection labels |
| Body | Inter | 16px | 400 | 0em | Default text |
| Body-sm | Inter | 14px | 400 | +0.01em | Secondary labels |
| Caption | Inter | 12px | 400 | +0.02em | Timestamps, hints |

**Child-facing text:** Minimum 16px for ages 6–9; 14px for 10+.

### 1.3 Color Palette (Neon Purple + Electric Blue + Cyan)

```
Primary Actions: #7C5BFF (Electric Purple)
Success/Growth:  #06D3A8 (Teal)
Warning/Caution: #FFA500 (Amber)
Error/Blocked:   #FF3D5A (Red)
Energy/Accent:   #22D8E7 (Cyan)
Text Primary:    #F6F8FF (Off-white)
Text Secondary:  #B3B8D1 (Muted)
Text Dim:        #7A7E94 (Subtle)
```

### 1.4 Spacing & Layout

- **Base Unit:** 8px
- **Bento Gap:** `gap: 2rem` (32px) — generous white space
- **Card Padding:** `1.5rem` (24px) minimum
- **Section Padding:** `var(--spacing-10)` to `var(--spacing-12)` top/bottom
- **Breakpoints:**
  - Mobile: 375px (base)
  - Tablet: 768px
  - Desktop: 1024px
  - Wide: 1440px+

### 1.5 Card Sizing (Bento Grid)

```
Small:  1 col × 1 row   (~200–280px)
Medium: 2 cols × 1 row  (~480–600px)
Large:  2 cols × 2 rows (~600× 480px)
Full:   3 cols × 1 row  (~960px on desktop)
```

All cards inherit:
```css
background: var(--glass-bg);
border: 1px solid var(--glass-border);
backdrop-filter: var(--glass-blur);
border-radius: var(--radius-lg);
padding: 1.5rem;
transition: all 0.2s var(--ease-default);
```

Hover effect:
```css
box-shadow: 0 8px 32px rgba(124, 91, 255, 0.16);
border-color: rgba(124, 91, 255, 0.25);
transform: translateY(-2px);
```

---

## 2. Functional Restructuring: Web Version (React + Vite)

### 2.1 Current ParentDashboard Structure

| Section | Lines | Current Component | Data Fetched |
|---------|-------|-------------------|--------------|
| Briefing (AI Summary) | ~50 | Inline JSX | `/ai/family-briefing` |
| Welcome Panel (Stats) | ~100 | Inline JSX | Multiple endpoints |
| Task Management | ~80 | `<TaskTable />` | `/tasks/list`, `/tasks/requests` |
| Weekly Planner | ~50 | `<WeeklyPlanTable />` | Recurrence data |
| Activity Feed | ~30 | Inline JSX | Points transactions |
| Gaming Rules | ~150 | Inline JSX | `/gaming/games`, add/edit logic |
| Giftcard Inventory | ~120 | Inline JSX | `/giftcards/inventory`, catalog |
| Rewards Management | ~100 | Inline JSX | `/rewards/list`, create/edit |
| Notifications | ~80 | Inline JSX | `/notifications/list` |
| Points Adjustments | ~100 | Inline JSX | `/points/transactions` |
| **TOTAL** | **1700+** | Monolithic | 15+ API endpoints |

### 2.2 Proposed Architecture: Modular Bento Grid

**Goal:** Break ParentDashboard into 12–15 focused, reusable components. Each handles one "card" or logical section.

#### New Component Hierarchy

```
frontend/src/
├── pages/
│   └── ParentDashboard.jsx          ← Layout orchestrator only (200 lines)
├── components/
│   ├── layout/
│   │   ├── BentoGrid.jsx            ← Grid container (40 lines)
│   │   ├── BentoCard.jsx            ← Card wrapper + glassmorphism (50 lines)
│   │   ├── Sidebar.jsx              ← Fixed nav (glassmorphic) (60 lines)
│   │   └── DashboardHeader.jsx      ← Top bar + notifications (50 lines)
│   ├── dashboard/
│   │   ├── AiFamilyBriefing.jsx     ← AI summary card (80 lines)
│   │   ├── ChildProgressMap.jsx     ← SVG radial progress (120 lines)
│   │   ├── TaskBentoList.jsx        ← Evidence feed (100 lines)
│   │   ├── WalletTile.jsx           ← RP/GP balances (60 lines)
│   │   ├── GamingSessionsCard.jsx   ← Active sessions (70 lines)
│   │   ├── QuickStatsBoard.jsx      ← 4-card stat grid (80 lines)
│   │   ├── RecentActivityFeed.jsx   ← Point transactions (70 lines)
│   │   ├── GiftcardShowcase.jsx     ← Inventory + catalog (100 lines)
│   │   ├── RewardsList.jsx          ← Custom rewards (90 lines)
│   │   ├── GamingRulesCard.jsx      ← Game blocking (80 lines)
│   │   ├── AI TerminalPanel.jsx     ← Sliding Claude workspace (150 lines)
│   │   ├── ScheduleCard.jsx         ← Weekly planner (80 lines)
│   │   └── TaskCreationWidget.jsx   ← Quick task add (60 lines)
│   └── shared/
│       ├── GlassButton.jsx          ← Styled button with glass effect (40 lines)
│       ├── GlassInput.jsx           ← Text input (35 lines)
│       ├── GlassSelect.jsx          ← Dropdown (40 lines)
│       ├── StatusBadge.jsx          ← Colored status chips (30 lines)
│       └── LoadingSpinner.jsx       ← Glassmorphic spinner (40 lines)
└── styles/
    ├── app.css                      ← Current tokens (no changes)
    ├── bento-grid.css               ← Grid + card styles (NEW)
    ├── glassmorphism.css            ← Glass effects (NEW)
    └── animations.css               ← Transitions + keyframes (NEW)
```

### 2.3 ParentDashboard Refactor: New Structure

**Before:** 1700-line monolithic component  
**After:** 200-line layout orchestrator

```jsx
// frontend/src/pages/ParentDashboard.jsx (NEW)
export default function ParentDashboard({ token, onSwitchToChild, parentName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Unified fetch orchestration
  useEffect(() => {
    async function load() {
      try {
        const [
          children, tasks, taskRequests, rewards, 
          notifications, giftcards, gpSummary, gaming,
          points, briefing
        ] = await Promise.all([
          /* all API calls */
        ]);
        setData({ children, tasks, taskRequests, /* ... */ });
      } catch (err) {
        // error handling
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) return <DashboardSkeleton />;

  return (
    <DashboardLayout token={token}>
      <Sidebar activeSection="dashboard" navigate={navigate} />
      
      <main className="dashboard-main">
        <DashboardHeader parentName={parentName} onSwitchToChild={onSwitchToChild} />
        
        <BentoGrid>
          {/* Row 1: Briefing + Wallet */}
          <AiFamilyBriefing data={data.briefing} token={token} size="large" />
          <WalletTile balance={data.gpSummary} size="small" />

          {/* Row 2: Children Progress + Evidence Feed */}
          <ChildProgressMap children={data.children} size="large" />
          <TaskBentoList tasks={data.tasks} size="large" />

          {/* Row 3: Quick Stats */}
          <QuickStatsBoard children={data.children} gaming={data.gaming} size="full" />

          {/* Row 4: Gaming + Rewards */}
          <GamingSessionsCard data={data.gaming} size="medium" />
          <RewardsList rewards={data.rewards} size="medium" />

          {/* Row 5: Recent Activity + Giftcards */}
          <RecentActivityFeed transactions={data.points} size="medium" />
          <GiftcardShowcase inventory={data.giftcards} size="medium" />

          {/* Row 6: AI Terminal */}
          <AITerminalPanel token={token} size="full" />
        </BentoGrid>
      </main>
    </DashboardLayout>
  );
}
```

---

## 3. Component Specifications

### 3.1 Layout Components

#### **BentoGrid.jsx** (40 lines)
```jsx
// Auto-responsive grid; wraps cards with gap: 2rem
export function BentoGrid({ children, className = '' }) {
  return (
    <div className={`bento-grid ${className}`}>
      {children}
    </div>
  );
}
```

**CSS:**
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  padding: var(--spacing-10) var(--spacing-6);
  max-width: 1440px;
}

@media (min-width: 768px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .bento-grid { grid-template-columns: repeat(3, 1fr); }
}

.bento-card--full { grid-column: 1 / -1; }
.bento-card--large { grid-column: span 2; grid-row: span 2; }
.bento-card--medium { grid-column: span 2; }
```

#### **BentoCard.jsx** (50 lines)
```jsx
export function BentoCard({ 
  title, 
  icon, 
  children, 
  size = 'small',
  action,
  loading = false,
  className = ''
}) {
  return (
    <article 
      className={`bento-card bento-card--${size} ${className}`}
      data-loading={loading}
    >
      {title && (
        <header className="bento-header">
          {icon && <span className="bento-icon">{icon}</span>}
          <h2 className="bento-title">{title}</h2>
          {action && <div className="bento-action">{action}</div>}
        </header>
      )}
      <div className="bento-content">
        {loading ? <LoadingSpinner /> : children}
      </div>
    </article>
  );
}
```

**CSS:**
```css
.bento-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  transition: all 0.2s var(--ease-default);
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.bento-card:hover {
  border-color: rgba(124, 91, 255, 0.25);
  box-shadow: 0 8px 32px rgba(124, 91, 255, 0.16);
  transform: translateY(-2px);
}

.bento-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line-soft);
}

.bento-title {
  font-family: 'Sora', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-main);
  flex: 1;
}

.bento-action {
  margin-left: auto;
}

.bento-content {
  flex: 1;
  overflow-y: auto;
}

.bento-card[data-loading="true"] .bento-content {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

#### **Sidebar.jsx** (60 lines)
Fixed glassmorphic sidebar with main navigation.

```jsx
export function Sidebar({ activeSection, navigate }) {
  const sections = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tasks', label: 'Tasks', icon: '✓' },
    { id: 'gaming', label: 'Gaming', icon: '🎮' },
    { id: 'rewards', label: 'Rewards', icon: '🏆' },
    { id: 'giftcards', label: 'Giftcards', icon: '🎁' },
    { id: 'settings', label: 'Settings', icon: '⚙' }
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => navigate(`/parent/${section.id}`)}
            className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
            aria-current={activeSection === section.id ? 'page' : undefined}
          >
            <span className="icon">{section.icon}</span>
            <span className="label">{section.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
```

**CSS:**
```css
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: 240px;
  height: 100vh;
  background: var(--glass-bg);
  border-right: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
  z-index: 1000;
  overflow-y: auto;
  padding: 1.5rem 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  color: var(--text-sub);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s var(--ease-default);
  font-size: 14px;
  font-weight: 500;
}

.nav-item:hover {
  color: var(--color-energy);
  background: rgba(34, 216, 231, 0.08);
}

.nav-item.active {
  color: var(--color-energy);
  background: rgba(34, 216, 231, 0.12);
  border-left: 3px solid var(--color-energy);
  padding-left: calc(1.5rem - 3px);
}
```

### 3.2 Dashboard Components

#### **ChildProgressMap.jsx** (120 lines)
Circular SVG progress indicators for each child's daily goals.

```jsx
export function ChildProgressMap({ children, size = 'large' }) {
  return (
    <BentoCard 
      title="Children Progress"
      size={size}
      className="child-progress-map"
    >
      <div className="progress-grid">
        {children.map((child) => (
          <div key={child.id} className="progress-item">
            <svg className="progress-circle" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--line)" strokeWidth="2" />
              {/* Progress arc  */}
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="var(--color-energy)" 
                strokeWidth="3"
                strokeDasharray={`${child.progressPercent * 2.83} 283`}
                strokeLinecap="round"
              />
              {/* Center text */}
              <text x="50" y="55" textAnchor="middle" fill="var(--text-main)" fontSize="24" fontWeight="700">
                {child.progressPercent}%
              </text>
            </svg>
            <h3 className="progress-label">{child.name}</h3>
            <p className="progress-sublabel">{child.tasksCompleted}/{child.tasksTotal}</p>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}
```

**CSS:**
```css
.child-progress-map .progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1.5rem;
}

.progress-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.progress-circle {
  width: 100px;
  height: 100px;
}

.progress-label {
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  text-align: center;
}

.progress-sublabel {
  font-size: 12px;
  color: var(--text-dim);
}
```

#### **TaskBentoList.jsx** (100 lines)
AI-Reviewed evidence feed with high-quality cards.

```jsx
export function TaskBentoList({ tasks, size = 'large' }) {
  const reviewedTasks = tasks.filter(t => t.submissions?.length > 0).slice(0, 5);

  return (
    <BentoCard 
      title="Recent Evidence"
      size={size}
      icon="🎬"
      className="task-bento-list"
    >
      <div className="evidence-stack">
        {reviewedTasks.map((task) => (
          <div key={task.id} className="evidence-card">
            <div className="evidence-thumbnail">
              <img 
                src={task.submissions[0]?.thumbnail} 
                alt={task.title}
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
            <div className="evidence-meta">
              <h4>{task.title}</h4>
              <p className="task-child">{task.childName}</p>
              <div className="evidence-status">
                <StatusBadge status={task.submissions[0]?.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}
```

**CSS:**
```css
.evidence-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.evidence-card {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: rgba(34, 216, 231, 0.06);
  border-radius: var(--radius-md);
  border: 1px solid var(--line-soft);
  cursor: pointer;
  transition: all 0.2s var(--ease-default);
}

.evidence-card:hover {
  background: rgba(34, 216, 231, 0.1);
  border-color: var(--color-energy);
}

.evidence-thumbnail {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--line);
}

.evidence-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.evidence-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  justify-content: center;
}

.evidence-meta h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.task-child {
  font-size: 12px;
  color: var(--text-dim);
}
```

#### **WalletTile.jsx** (60 lines)
RP/GP balance display with top-up buttons.

```jsx
export function WalletTile({ balance, size = 'small', onTopUp }) {
  return (
    <BentoCard 
      title="Wallet"
      size={size}
      icon="💰"
      className="wallet-tile"
    >
      <div className="wallet-content">
        <div className="wallet-stat">
          <p className="stat-label">RP Balance</p>
          <p className="stat-value">{balance.rpTotal}</p>
          <p className="stat-hint">Reward Points</p>
        </div>
        
        <div className="wallet-stat">
          <p className="stat-label">GP Balance</p>
          <p className="stat-value">{balance.gpTotal}</p>
          <p className="stat-hint">Giftcard Points</p>
        </div>

        <button 
          className="glass-button primary"
          onClick={onTopUp}
        >
          💳 Top-up GP
        </button>
      </div>
    </BentoCard>
  );
}
```

---

## 4. Functional Restructuring: Mobile Version (React Native + Expo)

### 4.1 New Mobile Architecture

**Principle:** Reduce cognitive load for children (ages 6–13) with massive CTAs, vertical card stacks (Tinder-style), and full-screen focused interactions.

#### New Mobile Screens

| Screen | Current | New | Interaction Model |
|--------|---------|-----|-------------------|
| Child Dashboard | List view | Tinder-style card stack | One task per card, swipe up to submit |
| Task Submit | Form | Full-screen Camera intent | Huge "📷 Submit Evidence" button (72px+) |
| Evidence Review | Parent task list | Swipe approval | Left = Deny, Right = Approve (80% of width) |
| Gaming Session | Session details | Full-screen countdown | Glowing timer, 48pt font, real estate maximized |
| Reward Redemption | Shop list | Vertical scroll + glow cards | Tappable cards (min 64×64px each) |
| Parent Approval Hub | Table view | Quick-swipe queue | Batch approve/deny, visual feedback per action |

### 4.2 Mobile Component Tree

```
mobile/src/
├── screens/
│   ├── ChildTaskStack.js         ← Tinder-style vertical card swipe
│   ├── EvidenceSubmissionHub.js  ← Full-screen camera + submit
│   ├── ParentApprovalSwipe.js    ← Left/Right gesture → approve/deny
│   ├── GamingSessionDisplay.js   ← Full-screen glowing countdown
│   ├── RewardShop.js             ← Vertical scroll with glow cards
│   └── ChildDashboard.js         ← Refactored to use above
├── components/
│   ├── CardStack.js              ← Pan gesture handler (React Native Gesture Handler)
│   ├── GlowingTimer.js           ← Animated countdown with neon effect
│   ├── SwipeCard.js              ← Left/right gesture detection
│   ├── GlassMorphCard.js         ← RN equivalent of web BentoCard
│   └── ActionButton.js           ← 48px+ touch targets
└── theme/
    ├── colors.js                 ← RGB equivalents of web palette
    └── spacing.js                ← 8px base unit scale
```

### 4.3 Example Mobile Components

#### **ChildTaskStack.js** (130 lines)
```jsx
import React, { useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import TaskCard from './TaskCard';
import { colors, spacing } from '../theme';

export default function ChildTaskStack({ tasks, onSubmit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const pan = React.useRef(new Animated.ValueXY()).current;

  const handleStackPan = ({ nativeEvent }) => {
    const { translationY } = nativeEvent;
    
    if (translationY < -100) {
      // Swiped up = submit evidence
      onSubmit(tasks[currentIndex].id);
      setCurrentIndex((prev) => Math.min(prev + 1, tasks.length - 1));
    }
  };

  const currentTask = tasks[currentIndex];

  return (
    <View style={styles.container}>
      <PanGestureHandler onHandlerStateChange={handleStackPan}>
        <Animated.View style={[styles.cardStack, pan.getLayout()]}>
          {tasks.slice(currentIndex, currentIndex + 3).map((task, idx) => (
            <TaskCard 
              key={task.id} 
              task={task}
              index={idx}
              isActive={idx === 0}
            />
          ))}
        </Animated.View>
      </PanGestureHandler>

      <View style={styles.hint}>
        <Text style={styles.hintText}>👆 Swipe Up to Submit Evidence</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  cardStack: {
    width: '100%',
    height: '60%',
  },
  hint: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: `rgba(34, 216, 231, 0.1)`,
    borderRadius: 12,
  },
  hintText: {
    color: colors.energy,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
```

#### **GamingSessionDisplay.js** (100 lines)
Full-screen glowing countdown timer for active sessions.

```jsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export default function GamingSessionDisplay({ durationMinutes, onComplete }) {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onComplete]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <View style={styles.timerContainer}>
        <Text style={styles.timerLabel}>Time Remaining</Text>
        <Text style={styles.timerDisplay}>{formattedTime}</Text>
        <View style={styles.glowEffect} />
      </View>
      
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill,
            { width: `${(secondsLeft / (durationMinutes * 60)) * 100}%` }
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  timerLabel: {
    fontSize: 16,
    color: colors.textSub,
    marginBottom: spacing.sm,
  },
  timerDisplay: {
    fontSize: 96,
    fontWeight: '700',
    color: colors.energy,
    fontVariant: ['tabular-nums'], // mono-spaced numbers
    textShadowColor: colors.energy,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  glowEffect: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.energy,
    opacity: 0.1,
    zIndex: -1,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: `rgba(255,255,255,0.1)`,
    marginTop: spacing.xl,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.energy,
  },
});
```

---

## 5. CSS Architecture (Pure Custom Properties)

### 5.1 New Files to Create

**frontend/src/styles/bento-grid.css**
```css
/* Bento Grid Layout System */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  padding: var(--spacing-10) var(--spacing-6);
  max-width: 1440px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.bento-card--full { grid-column: 1 / -1; }
.bento-card--large { grid-column: span 2; grid-row: span 2; }
.bento-card--medium { grid-column: span 2; }
.bento-card--small { grid-column: span 1; }
```

**frontend/src/styles/glassmorphism.css**
```css
/* Glassmorphism Effects */
.glass-element {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-lg);
}

.glass-element:hover {
  border-color: rgba(124, 91, 255, 0.25);
  box-shadow: 0 8px 32px rgba(124, 91, 255, 0.16);
}

.glass-button {
  background: rgba(124, 91, 255, 0.12);
  border: 1px solid rgba(124, 91, 255, 0.2);
  color: var(--color-energy);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s var(--ease-default);
  font-size: 14px;
  font-weight: 600;
}

.glass-button:hover {
  background: rgba(124, 91, 255, 0.2);
  border-color: rgba(124, 91, 255, 0.4);
}

.glass-button.primary {
  background: var(--bg-action);
  color: white;
  border-color: var(--bg-action);
}

.glass-button.primary:hover {
  background: var(--bg-action-hover);
}
```

**frontend/src/styles/animations.css**
```css
/* Smooth Transitions & Animations */
* {
  transition: background-color 0.2s var(--ease-default),
              border-color 0.2s var(--ease-default),
              color 0.2s var(--ease-default);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes glow {
  0%, 100% {
    text-shadow: 0 0 10px rgba(34, 216, 231, 0.5);
  }
  50% {
    text-shadow: 0 0 20px rgba(34, 216, 231, 0.8);
  }
}

.fade-in {
  animation: fadeInUp 0.3s ease-in-out forwards;
}

.glowing-text {
  animation: glow 2s ease-in-out infinite;
}
```

### 5.2 Integration in app.css

Add imports at the top of `frontend/src/styles/app.css`:
```css
@import url('./bento-grid.css');
@import url('./glassmorphism.css');
@import url('./animations.css');
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Extract shared components (`BentoCard.jsx`, `BentoGrid.jsx`, `Sidebar.jsx`)
- [ ] Create CSS files for glassmorphism + animations
- [ ] Build layout components with token system

### Phase 2: Dashboard Components (Week 2)
- [ ] `ChildProgressMap.jsx` (SVG circles)
- [ ] `TaskBentoList.jsx` (evidence feed)
- [ ] `WalletTile.jsx` + `QuickStatsBoard.jsx`
- [ ] Update ParentDashboard orchestrator

### Phase 3: Secondary Components (Week 3)
- [ ] `AITerminalPanel.jsx` (streaming chat)
- [ ] `GamingSessionsCard.jsx`
- [ ] `RewardsList.jsx`
- [ ] `GiftcardShowcase.jsx`

### Phase 4: Mobile Refactor (Week 4)
- [ ] `ChildTaskStack.js` (Tinder-style)
- [ ] `GamingSessionDisplay.js` (glowing timer)
- [ ] `ParentApprovalSwipe.js` (left/right approve)
- [ ] Update all mobile screens to use new components

### Phase 5: Polish & Testing (Week 5)
- [ ] Transition timing refinements (framer-motion optional)
- [ ] Responsive breakpoints (13"–27" monitors, mobile)
- [ ] Accessibility audit (ARIA labels, focus rings)
- [ ] Performance optimization (code-splitting, lazy loading)

---

## 7. Technical Debt & Migration Guide

### Breaking Changes
- `ParentDashboard.jsx` reduced from 1700 to 200 lines
- State management simplified via data orchestration at the top level
- New CSS file structure (3 new files importing into app.css)

### Backward Compatibility
- All existing API endpoints remain unchanged
- Child/Mobile dashboard refactors are additive (no breaking changes)
- Existing styling tokens preserved in `app.css`

### Migration Checklist
- [ ] Update imports across components to use new shared components
- [ ] Test all API calls in new data fetching orchestration
- [ ] Verify mobile screen rendering with new gesture handlers
- [ ] Audit all transitions for 0.3s smooth feel
- [ ] Verify accessibility with axe DevTools

---

## 8. Success Criteria

✅ **Web Dashboard**
- Parent can manage all 6 sections (tasks, gaming, rewards, giftcards, notifications, points) without scrolling beyond 3 screens
- All cards use Bento Grid with `gap: 2rem`
- Hover effects (glass glow + scale) apply to all interactive elements
- 0.3s transitions feel snappy, not delayed

✅ **Mobile Experience**
- child can submit evidence with single tap on 72px+ button
- Gaming session shows full-screen countdown with glow effect
- Parent swiping approval achieves >80% of viewport width per action
- All touch targets ≥48px

✅ **Design System**
- Zero inline styles; all styling via CSS custom properties
- Glassmorphism applied consistently across all cards
- Typography scales responsively (`clamp()`)
- 4 new CSS files organize concerns (bento, glass, animations, tokens)

---

## 9. Appendix: Code Templates

### A. Adding New Bento Cards

```jsx
// Template
export function MyNewCard({ data, size = 'small' }) {
  return (
    <BentoCard 
      title="My Feature" 
      icon="📌"
      size={size}
      action={<button>Action</button>}
      className="my-new-card"
    >
      {/* Content */}
    </BentoCard>
  );
}

// In ParentDashboard.tsx
<MyNewCard data={data.myFeature} size="medium" />
```

### B. Adding Transitions

```css
.my-element {
  transition: all 0.2s var(--ease-default);
  /* or for spring-like feel: */
  transition: transform 0.3s var(--ease-spring);
}
```

### C. Glassmorphic Hover

```css
.my-element {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
}

.my-element:hover {
  border-color: rgba(124, 91, 255, 0.25);
  box-shadow: 0 8px 32px rgba(124, 91, 255, 0.16);
  transform: translateY(-2px);
}
```

---

## Next Steps

1. **Review proposal** with design team & engineering lead
2. **Approve component hierarchy** (section 3)
3. **Lock typography scale** & color tokens (already defined in design-system.md)
4. **Begin Phase 1 implementation** — layout foundation
5. **Schedule UI polish** review at end of Phase 2

---

**Proposal Status:** Ready for Implementation  
**Last Reviewed:** April 20, 2026  
**Lead:** Senior Full-Stack Engineer + Lead UI/UX Designer
