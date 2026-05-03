# Mobile Kinetic Dashboard — Parent Interface

## Overview

**ParentMobileKinetic** is a high-performance parent dashboard for mobile devices built with React Native, React Reanimated, and Expo. It provides real-time task management, team approval workflows, and AI-powered insights via a seamless kinetic interface.

---

## Architecture

### Component Hierarchy

```
ParentMobileKinetic
├── Notification Banner (Animated.View)
├── Header (Greeting + Task Count)
├── Child Grid
│   └── ProgressOrb (per child)
├── Pending Tasks List
│   ├── SwipeCard (per task)
│   └── Quick Action Row (Approve/Reject buttons)
├── Stats Summary (This Week)
│   └── StatBlock (x3)
├── Terminal Toggle
└── Terminal Output (optional)
    ├── Terminal Output Display
    └── Fast Commands (!insights, !recommend, !child)
```

### State Management

```javascript
// Local state within ParentMobileKinetic
const [selectedChild, setSelectedChild] = useState(null);      // Filter tasks by child
const [showNotification, setShowNotification] = useState(false); // Banner visibility
const [terminalOpen, setTerminalOpen] = useState(false);        // Terminal expand/collapse
const [terminalLines, setTerminalLines] = useState([]);         // Terminal output history
```

No external Redux/Context currently; designed for prop-based data flow.

---

## Data Flow

### Props Required

```typescript
interface ParentMobileKineticProps {
  parentData: {
    id: string;
    name: string;
    children: Array<{
      id: string;
      name: string;
    }>;
  };
  pendingTasks: Array<{
    id: string;
    childId: string;
    childName: string;
    title: string;
    status: 'submitted' | 'under_review';
    RPValue: number;
  }>;
  onApprove: (taskId: string) => void;
  onReject: (taskId: string) => void;
  navigation: StackNavigationProp; // React Navigation
}
```

### Example Parent Usage

```jsx
import ParentMobileKinetic from '../screens/ParentMobileKinetic';
import { useAuth } from '../context/AuthContext';

function ParentDashboard({ navigation }) {
  const { user } = useAuth();
  const [pendingTasks, setPendingTasks] = useState([]);

  useEffect(() => {
    // Fetch pending tasks from backend
    fetchPendingTasks().then(setPendingTasks);
  }, []);

  const handleApprove = async (taskId) => {
    await approvePendingTask(taskId);
    // Refresh list
    fetchPendingTasks().then(setPendingTasks);
  };

  const handleReject = async (taskId) => {
    await rejectPendingTask(taskId);
    fetchPendingTasks().then(setPendingTasks);
  };

  return (
    <ParentMobileKinetic
      parentData={{
        id: user.id,
        name: user.name,
        children: user.children,
      }}
      pendingTasks={pendingTasks}
      onApprove={handleApprove}
      onReject={handleReject}
      navigation={navigation}
    />
  );
}
```

---

## UI Components

### 1. **KineticButton**

Animated button with haptic feedback and multiple variants.

```jsx
<KineticButton
  title="✓ Approve"
  onPress={() => handleTaskApprove(taskId)}
  variant="primary"        // 'primary' | 'secondary' | 'danger'
  size="small"             // 'small' | 'normal' | 'large'
  disabled={false}
  style={{ flex: 1 }}
/>
```

**Haptic Feedback:**
- `success()` — On approval
- `error()` — On rejection
- `buttonPress()` — On any button tap
- `lightTap()` — On terminal toggle

### 2. **ProgressOrb**

Mini circular progress indicator for each child's completion status.

```jsx
<ProgressOrb
  name="Alex"
  percentage={45}
  color={MOBILE_COLORS.neonBlue}
/>
```

- Animated stroke fill based on percentage
- Emoji display below name

### 3. **SwipeCard**

Task card with swipe gesture support (framework ready).

```jsx
<SwipeCard
  title="Clean Room"
  subtitle="Alex · +150 RP"
  status="submitted"
  icon="📸"
/>
```

Currently displays; swipe gesture logic can be added.

### 4. **TerminalLine**

Monospace text line for terminal output display.

```jsx
<TerminalLine
  text="Weekly insights available"
  type="system"  // 'system' | 'user'
/>
```

- `type: 'system'` — Green monospace
- `type: 'user'` — Yellow monospace

### 5. **StatBlock**

Summary stat card (completion, pending, etc.).

```jsx
<StatBlock
  icon="✓"
  label="Completed"
  value="12"
  color={MOBILE_COLORS.neonGreen}
/>
```

---

## Animation & Haptics

### Pulse Animation

Notification banner uses `usePulseAnimation` hook for attention-grabbing pulse effect.

```javascript
const { animatedStyle: pulseStyle } = usePulseAnimation(
  1,      // minScale
  1.1,    // maxScale
  1500    // duration (ms)
);

return <Animated.View style={pulseStyle}>{children}</Animated.View>;
```

### Configuration

All animation timings from `ANIMATION_CONFIGS` (kinetic-mobile-theme.js):

```javascript
export const ANIMATION_CONFIGS = {
  spring: { damping: 8, mass: 1, stiffness: 100 },
  timing: { duration: 300, easing: Easing.inOut(Easing.ease) },
};
```

---

## Terminal Feature

### Purpose

Quick AI-powered commands for parent insights (extensible).

### Built-in Commands

| Command | Response |
|---------|----------|
| `!insights` | Weekly stats: completion %, screen time, strongest days |
| `!recommend` | Task recommendations + current RP balance |
| `!child` | Navigate to child dashboard |
| `!clear` | Clear terminal output |

### Extending Commands

```javascript
const handleTerminalCommand = (command) => {
  const response = customCommandHandlers[command] || 'Command not found';
  appendTerminalLine(response, 'system');
};
```

---

## Styling & Design System

### Color Tokens

From `MOBILE_COLORS`:

```javascript
neonBlue: '#00FFFF',     // Primary accent
neonGreen: '#39FF14',    // Success
neonRed: '#FF0000',      // Alerts
neonOrange: '#FFA500',   // Warnings
primary: '#0F0F0F',      // Background
surface: '#1A1A2E',      // Cards
white: '#FFFFFF',
whiteAlpha6: 'rgba(255, 255, 255, 0.6)',
whiteAlpha3: 'rgba(255, 255, 255, 0.3)',
```

### Typography

From `MOBILE_TYPOGRAPHY`:

```javascript
h1: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
h2: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
bodySmall: { fontSize: 14, lineHeight: 20 },
caption: { fontSize: 11, lineHeight: 16 },
```

### Safe Area Insets

```javascript
SAFE_AREA = {
  horizontal: 16,  // Padding on left/right
  vertical: 12,    // Padding on top/bottom
};
```

---

## Integration & Navigation

### Adding to Navigation Stack

Already wired in `mobile/src/navigation/RootNavigator.js`:

```jsx
<ParentStackNav.Screen
  name="ParentMobileKinetic"
  component={ParentMobileKinetic}
  options={{
    headerShown: true,
    title: 'Kinetic Dashboard',
    headerStyle: { backgroundColor: colors.surface },
    headerTitleStyle: { color: colors.text, fontWeight: '700' },
    headerTintColor: colors.primaryDark,
  }}
/>
```

### Navigation Calls Within Component

```javascript
// Review a task
navigation?.navigate('TaskDetail', { taskId: item.id });

// Create new task
navigation?.navigate('CreateTask');

// Access child dashboard
navigation?.navigate('ChildDashboard', { childId: child.id });
```

---

## Performance Optimization

### List Rendering

Uses `FlatList` with `scrollEnabled={false}` (inside ScrollView):

```jsx
<FlatList
  scrollEnabled={false}
  data={filteredTasks}
  renderItem={({ item }) => <TaskCard {...item} />}
  keyExtractor={item => item.id}
/>
```

**Why?** Allows smooth ScrollView containing multiple list sections without nested ScrollView conflicts.

### Reanimated Performance

All animations use Reanimated's worklet system (runs on native thread):

```javascript
const animatedStyle = useAnimatedStyle(() => {
  return {
    transform: [{ scale: progress.value }],
  };
});
```

**Avoid:** Using animated values directly in JavaScript logic (use `runOnJS` wrapper if needed).

---

## Testing Guidelines

### Unit Tests (Mock Data Example)

```javascript
import { render, screen } from '@testing-library/react-native';
import ParentMobileKinetic from '../ParentMobileKinetic';

test('renders child grid', () => {
  const mockData = {
    parentData: { id: 'p1', name: 'Parent', children: [{ id: 'c1', name: 'Alex' }] },
    pendingTasks: [],
  };
  render(<ParentMobileKinetic {...mockData} />);
  expect(screen.getByText('Alex')).toBeTruthy();
});

test('calls onApprove when Approve button pressed', () => {
  const onApprove = jest.fn();
  render(<ParentMobileKinetic pendingTasks={[{id: 'task1', ...}]} onApprove={onApprove} />);
  fireEvent.press(screen.getByText('✓ Approve'));
  expect(onApprove).toHaveBeenCalledWith('task1');
});
```

### E2E Tests (Detox)

```javascript
describe('Parent Mobile Kinetic', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should display pending task count', async () => {
    await expect(element(by.text('N tasks pending review'))).toBeVisible();
  });

  it('should approve a task', async () => {
    await element(by.text('✓ Approve')).multiTap();
    await expect(element(by.text('Task Approved'))).toBeVisible();
  });
});
```

---

## Customization

### Adding a Custom Command to Terminal

```javascript
// In handleTerminalCommand()
const customHandler = {
  '!mycommand': () => 'Custom response here',
};

// Then use in switch
if (command in customHandler) {
  response = customHandler[command]();
}
```

### Changing Color Scheme

Update `MOBILE_COLORS` in `kinetic-mobile-theme.js`:

```javascript
export const MOBILE_COLORS = {
  neonBlue: '#0080FF',  // Your custom blue
  // ...
};
```

### Modifying Haptic Feedback

Each `HAPTIC_PATTERNS` function maps to device haptics:

```javascript
export const HAPTIC_PATTERNS = {
  buttonPress: async () => await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  success: async () => await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: async () => await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  lightTap: async () => await Haptics.selectionAsync(),
};
```

---

## Backend API Integration

### Expected Endpoints

```javascript
// Fetch pending tasks (parent only)
GET /api/tasks/pending
Response: [{ id, childId, childName, title, status, RPValue, ... }]

// Approve task
POST /api/tasks/:taskId/approve
Body: { }
Response: { success: true }

// Reject task
POST /api/tasks/:taskId/reject
Body: { reason?: string }
Response: { success: true }

// Fetch parent + children
GET /api/parents/:parentId
Response: { id, name, children: [{id, name}, ...], ... }

// AI insights
POST /api/ai/insights
Body: { childrenIds?: [string] }
Response: { insight: "...", stats: {...} }
```

---

## Known Limitations & Future Features

### Current
- ✅ Task list filtering by child
- ✅ Quick approve/reject
- ✅ Notification banner
- ✅ Terminal with mock commands
- ✅ Responsive design

### To Do
- ⏳ Swipe gesture for approve/reject (Reanimated gesture handler)
- ⏳ Real-time task updates (WebSocket)
- ⏳ Child avatar cache
- ⏳ Evidence image gallery
- ⏳ Dark mode toggle
- ⏳ Multi-language support

---

## File Structure

```
mobile/
├── src/
│   ├── screens/
│   │   └── ParentMobileKinetic.js        ← Component file
│   ├── components/
│   │   └── shared-mobile-components.js   ← Reusable UI components
│   ├── theme/
│   │   └── kinetic-mobile-theme.js       ← Design tokens + hooks
│   └── navigation/
│       └── RootNavigator.js              ← Navigation wiring
├── docs/design/
│   └── MOBILE_KINETIC_DASHBOARD.md       ← This file
```

---

## Quick Start

1. **Import component:**
   ```javascript
   import ParentMobileKinetic from '../screens/ParentMobileKinetic';
   ```

2. **Pass props:**
   ```jsx
   <ParentMobileKinetic
     parentData={userData}
     pendingTasks={tasks}
     onApprove={handleApprove}
     onReject={handleReject}
     navigation={navigation}
   />
   ```

3. **Test locally:**
   ```bash
   cd mobile && npm start
   ```

---

## Debugging

Enable verbose logs:

```javascript
// In ParentMobileKinetic.js
const DEBUG = true;
useEffect(() => {
  if (DEBUG) console.log('Pending tasks:', pendingTasks);
}, [pendingTasks]);
```

Check React Reanimated worklet performance in Flipper.

---

## Support & Resources

- **Reanimated Docs:** https://docs.swmansion.com/react-native-reanimated/
- **React Native SVG:** https://github.com/react-native-community/react-native-svg
- **Design Tokens:** see `MOBILE_COLORS`, `MOBILE_TYPOGRAPHY` in `kinetic-mobile-theme.js`
- **Haptics API:** https://docs.expo.dev/modules/haptics/

