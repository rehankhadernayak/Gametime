# Gametime Fluid-Motion System
## Premium Animation Architecture Inspired by String Tune

> **Motion Engineer:** Senior Full-Stack + Animation Specialist  
> **Framework:** Framer Motion (Web) + Moti/React Native Reanimated (Mobile)  
> **Aesthetic:** Organic spring physics, magnetic interactivity, choreographed reveals  
> **Last Updated:** April 20, 2026

---

## 1. Motion Design Philosophy

### 1.1 Principles

1. **Staggered Cascade** — Items enter with 0.1s offset per card; never all-at-once
2. **Spring Physics** — Stiffness=100, Damping=10 for organic "bounce" (not linear easing)
3. **Scroll-Triggered** — Intersection Observer for lazy animations (opacity + translateY)
4. **Magnetic Hover** — Subtle cursor tracking within 10px range
5. **Shared Layout** — Components morph positions smoothly when views change
6. **Exit Choreography** — Tasks/cards slide out when deleted (not just vanish)
7. **Reordering** — When a task moves, neighbors gracefully shift position

### 1.2 Why This Matters

- **Perceived Performance** — Animations make the app feel faster by guiding the eye
- **Brand Identity** — Spring physics = premium, crafted feel (vs. cheap linear tweens)
- **User Delight** — Small magnetic hovers build trust and engagement
- **Accessibility** — All animations respect `prefers-reduced-motion` media query

---

## 2. Web Stack: Framer Motion Implementation

### 2.1 Setup

```bash
# Install Framer Motion (already in package.json if needed)
npm install framer-motion@10.16.+ --save
```

**Import pattern (always use):**
```jsx
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
```

### 2.2 Global Motion Config

Create `frontend/src/utils/motionConfig.js`:

```javascript
/**
 * Fluid Motion System
 * Centralized animation constants for consistency across the app
 */

export const MOTION = {
  // Spring physics presets
  spring: {
    default: { type: 'spring', stiffness: 100, damping: 10, mass: 1 },
    bouncy: { type: 'spring', stiffness: 150, damping: 8, mass: 0.8 },
    smooth: { type: 'spring', stiffness: 80, damping: 15, mass: 1.2 },
    snappy: { type: 'spring', stiffness: 200, damping: 12, mass: 0.8 }
  },

  // Easing curves (fallback for non-spring animations)
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    ease_in: 'cubic-bezier(0.4, 0, 1, 1)',
    ease_out: 'cubic-bezier(0, 0, 0.2, 1)',
    ease_in_out: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Timing (milliseconds)
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
    stagger: 0.1, // Per-item offset in cascade
  },

  // Stagger container config
  stagger: {
    card: { delayChildren: 0.1, staggerChildren: 0.08, },
    list: { delayChildren: 0.15, staggerChildren: 0.05, },
    quick: { delayChildren: 0.05, staggerChildren: 0.03, },
  },

  // Variants (reusable animation states)
  variants: {
    // Generic fade-in with scale
    fadeInScale: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: (i) => ({
        opacity: 1,
        scale: 1,
        transition: { delay: i * 0.08, duration: 0.4 },
      }),
      exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
    },

    // Staggered cascade from bottom
    cascadeUp: {
      hidden: { opacity: 0, y: 20 },
      visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: i * 0.08,
          duration: 0.5,
          ease: 'easeOut',
        },
      }),
      exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
    },

    // Slide in from left (navigation)
    slideInLeft: {
      hidden: { opacity: 0, x: -50 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
    },

    // Slide in from right (sidebar)
    slideInRight: {
      hidden: { opacity: 0, x: 50 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
    },

    // Pop (for modals, chat bubbles)
    popIn: {
      hidden: { opacity: 0, scale: 0, rotate: -10 },
      visible: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: { type: 'spring', stiffness: 150, damping: 8, mass: 0.8 },
      },
      exit: { opacity: 0, scale: 0.8, rotate: 10, transition: { duration: 0.2 } },
    },

    // Slide out (task deletion, evidence submission)
    slideOut: {
      hidden: { opacity: 1, x: 0, height: 'auto' },
      exit: {
        opacity: 0,
        x: 100,
        height: 0,
        transition: {
          type: 'spring',
          stiffness: 120,
          damping: 20,
          mass: 1,
        },
      },
    },
  },
};

export default MOTION;
```

### 2.3 Staggered Container (BentoGrid with Cascade)

Create `frontend/src/components/layout/StaggeredBentoGrid.jsx`:

```jsx
import { motion } from 'framer-motion';
import MOTION from '../../utils/motionConfig.js';

/**
 * Bento Grid with staggered entry animation
 * All children cascade into view with spring physics
 */
export function StaggeredBentoGrid({ 
  children, 
  className = '',
  staggerDelay = 0.08
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
        mass: 1,
        duration: 0.5,
      },
    },
  };

  return (
    <motion.div
      className={`bento-grid ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {Array.isArray(children) ? (
        children.map((child, idx) => (
          <motion.div
            key={child.key || idx}
            variants={itemVariants}
            layout // Smooth reordering animations
          >
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div variants={itemVariants} layout>
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}
```

### 2.4 Scroll-Triggered Reveal Component

Create `frontend/src/components/animations/ScrollReveal.jsx`:

```jsx
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Lazy-load animation triggered by scroll into viewport
 * Uses Intersection Observer internally (Framer Motion handles this)
 */
export function ScrollReveal({ 
  children, 
  className = '',
  delay = 0,
  duration = 0.5,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '0px 0px -100px 0px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 10,
        delay,
        mass: 1,
      }}
    >
      {children}
    </motion.div>
  );
}
```

### 2.5 Magnetic Hover Button

Create `frontend/src/components/shared/MagneticButton.jsx`:

```jsx
import { motion } from 'framer-motion';
import { useState } from 'react';
import MOTION from '../../utils/motionConfig.js';

/**
 * Button with magnetic cursor-tracking hover effect
 * Subtly follows cursor within 10px range
 */
export function MagneticButton({ 
  label, 
  onClick, 
  variant = 'primary',
  className = '',
  disabled = false,
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = e.clientX - centerX;
    const y = e.clientY - centerY;

    // Clamp movement to 10px range
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = 10;
    const clampedX = distance > 0 ? (x / distance) * Math.min(distance, maxDistance) : 0;
    const clampedY = distance > 0 ? (y / distance) * Math.min(distance, maxDistance) : 0;

    setMousePosition({ x: clampedX, y: clampedY });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
    setIsHovering(false);
  };

  return (
    <motion.button
      className={`glass-button ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
      animate={{
        x: mousePosition.x,
        y: mousePosition.y,
        scale: isHovering ? 1.05 : 1,
      }}
      transition={MOTION.spring.bouncy}
      whileTap={{ scale: 0.95 }}
    >
      {label}
    </motion.button>
  );
}
```

### 2.6 Animated Modal (Chat Assistant Pop-In)

Create `frontend/src/components/animations/AnimatedModal.jsx`:

```jsx
import { motion, AnimatePresence } from 'framer-motion';
import MOTION from '../../utils/motionConfig.js';

/**
 * Modal with spring-physics pop-in effect
 * Used for AI assistant, task details, etc.
 */
export function AnimatedModal({ 
  isOpen, 
  onClose, 
  title,
  children,
  size = 'md'
}) {
  const sizeClasses = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.75,
      rotate: -5,
    },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: MOTION.spring.bouncy,
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      rotate: 5,
      transition: { duration: 0.2 },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className={`modal-content ${sizeClasses[size]}`}
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{title}</h2>
              <button
                className="modal-close"
                onClick={onClose}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 2.7 Shared Element Transition (Parent/Child View Switch)

Create `frontend/src/components/animations/LayoutTransition.jsx`:

```jsx
import { motion, AnimatePresence } from 'framer-motion';
import MOTION from '../../utils/motionConfig.js';

/**
 * Smooth morph between two layouts when switching views
 * Uses layoutId for shared element transitions
 */
export function LayoutTransition({ 
  activeView, // 'parent' | 'child'
  parentContent,
  childContent,
}) {
  const viewVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: 'easeInOut' },
    },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence mode="wait">
      {activeView === 'parent' ? (
        <motion.div
          key="parent-view"
          variants={viewVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          layoutId="dashboard-root"
        >
          {parentContent}
        </motion.div>
      ) : (
        <motion.div
          key="child-view"
          variants={viewVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          layoutId="dashboard-root"
        >
          {childContent}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 2.8 Task Exit Animation (Delete/Completion)

Create `frontend/src/components/animations/TaskExit.jsx`:

```jsx
import { motion } from 'framer-motion';
import MOTION from '../../utils/motionConfig.js';

/**
 * Task card that slides + fades out when deleted
 * Siblings reflow smoothly via Framer's layout prop
 */
export function TaskExitCard({ 
  task, 
  onDelete,
  children 
}) {
  return (
    <motion.div
      layout // Sibling cards animate into new positions
      initial={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{
        opacity: 0,
        x: 100,
        height: 0,
        marginBottom: 0,
        transition: {
          type: 'spring',
          stiffness: 120,
          damping: 20,
          mass: 1,
        },
      }}
      className="task-card"
    >
      {children}
      <button
        onClick={() => onDelete(task.id)}
        className="delete-btn"
      >
        Delete
      </button>
    </motion.div>
  );
}
```

### 2.9 Evidence Submission Shrink Animation

Create `frontend/src/components/animations/EvidenceShrink.jsx`:

```jsx
import { motion } from 'framer-motion';
import { useState } from 'react';
import MOTION from '../../utils/motionConfig.js';

/**
 * When photo/video is selected, preview shrinks into task card
 * Gives impression of "attaching" to task
 */
export function EvidenceShrinkAnimation({ 
  isVisible, 
  onComplete 
}) {
  const [targetRect, setTargetRect] = useState(null);

  const handleTaskCardRef = (ref) => {
    if (ref) {
      const rect = ref.getBoundingClientRect();
      setTargetRect(rect);
    }
  };

  return (
    <>
      {isVisible && (
        <motion.div
          initial={{
            opacity: 1,
            scale: 1,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            borderRadius: '20px',
          }}
          animate={{
            opacity: 0,
            scale: 0.1,
            x: targetRect?.left || 0,
            y: targetRect?.top || 0,
            borderRadius: '8px',
          }}
          transition={{
            type: 'spring',
            stiffness: 150,
            damping: 15,
            mass: 1,
          }}
          onAnimationComplete={onComplete}
          className="evidence-preview-shrink"
        >
          <img src={/* evidence src */} alt="Attaching..." />
        </motion.div>
      )}
      <div ref={handleTaskCardRef} className="task-card" />
    </>
  );
}
```

### 2.10 Reordering Animation (Drag-Drop Task)

Create `frontend/src/components/animations/ReorderableList.jsx`:

```jsx
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import MOTION from '../../utils/motionConfig.js';

/**
 * Drag-to-reorder with smooth sibling reflow
 * Used for weekly schedule, task prioritization
 */
export function ReorderableTaskList({ 
  tasks, 
  onReorder 
}) {
  return (
    <Reorder.Group
      axis="y"
      values={tasks}
      onReorder={onReorder}
      className="task-list-reorderable"
    >
      <AnimatePresence>
        {tasks.map((task, idx) => (
          <Reorder.Item
            key={task.id}
            value={task}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={MOTION.spring.default}
          >
            <motion.div
              className="task-card-reorderable"
              whileHover={{ scale: 1.02, shadowY: 10 }}
              whileDrag={{ scale: 1.05, opacity: 0.8 }}
            >
              <span className="drag-handle">⋮⋮</span>
              <div className="task-content">
                <h3>{task.title}</h3>
                <p>{task.points} RP</p>
              </div>
            </motion.div>
          </Reorder.Item>
        ))}
      </AnimatePresence>
    </Reorder.Group>
  );
}
```

---

## 3. Mobile Stack: Moti + React Native Reanimated

### 3.1 Setup

```bash
# Install Moti (animation library built on Reanimated)
npm install moti@latest react-native-reanimated@latest
```

### 3.2 Study Buddy Chat Bubble Pop-In

Create `mobile/src/components/StudyBuddyBubble.js`:

```jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';

/**
 * Chat bubble that pops in with spring physics
 * Appears from bottom-right corner with bounce
 */
export function StudyBuddyBubble({ 
  message, 
  isVisible,
  onComplete 
}) {
  return (
    <MotiView
      from={{
        opacity: 0,
        scale: 0,
        translateY: 100,
      }}
      animate={isVisible ? {
        opacity: 1,
        scale: 1,
        translateY: 0,
      } : {
        opacity: 0,
        scale: 0,
        translateY: 100,
      }}
      transition={{
        type: 'spring',
        damping: 10, // Low = bouncy, High = smooth
        mass: 1,
        overshootClamping: false, // Allow spring overshoot
      }}
      onDidAnimateSync={isVisible ? onComplete : undefined}
    >
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{message}</Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    maxWidth: '80%',
    backgroundColor: '#7C5BFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  bubbleText: {
    color: '#F6F8FF',
    fontSize: 14,
    fontWeight: '500',
  },
});
```

### 3.3 Evidence Submission Sequence

Create `mobile/src/components/EvidenceAttach.js`:

```jsx
import React, { useRef } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { MotiView } from 'moti';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

/**
 * Evidence workflow:
 * 1. Swipe up → Camera opens
 * 2. Photo taken → Preview shrinks into task card
 * 3. Submitted → Checkmark flies out
 */
export function EvidenceAttachmentSequence({ 
  taskId,
  onPhotoCapture,
  onSubmit,
}) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  const handleCameraCapture = async (photo) => {
    // Shrink animation: photo → task card
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      onPhotoCapture(photo);
    });
  };

  const animatedShrinkStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withTiming(1 - progressAnim.value * 0.9) },
      { translateY: withTiming(progressAnim.value * 40) },
    ],
    opacity: withTiming(1 - progressAnim.value * 0.5),
  }));

  const animatedCheckmarkStyle = useAnimatedStyle(() => ({
    opacity: withSpring(progressAnim.value, {
      damping: 10,
      mass: 1,
      stiffness: 100,
    }),
  }));

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleCameraCapture}
        style={styles.cameraButton}
      >
        <Text style={styles.cameraButtonText}>📷 Take Photo</Text>
      </Pressable>

      <Animated.View style={[styles.previewContainer, animatedShrinkStyle]}>
        {/* Photo preview that shrinks into task card */}
      </Animated.View>

      <Animated.View style={[styles.checkmark, animatedCheckmarkStyle]}>
        <Text style={styles.checkmarkText}>✓</Text>
      </Animated.View>

      <Pressable
        onPress={onSubmit}
        style={styles.submitButton}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    backgroundColor: '#7C5BFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  cameraButtonText: {
    color: '#F6F8FF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#22D8E7',
    borderRadius: 12,
    marginBottom: 20,
  },
  checkmark: {
    fontSize: 48,
    color: '#06D3A8',
  },
  checkmarkText: {
    fontSize: 48,
    color: '#06D3A8',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#06D3A8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#050505',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

### 3.4 Tinder-Style Task Card Stack

Create `mobile/src/components/TaskStackWithPhysics.js`:

```jsx
import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MotiView } from 'moti';

const { width, height } = Dimensions.get('window');

/**
 * Vertical Tinder-style card stack with spring physics
 * Swipe up to submit evidence → next card pops in
 */
export function TaskCardStack({ 
  tasks, 
  onSwipeUp,
  onSwipeDown 
}) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const [currentIdx, setCurrentIdx] = React.useState(0);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      // Only track upward swipes
      if (e.translationY < 0) {
        translateY.value = e.translationY;
        scale.value = 1 - Math.abs(e.translationY) / (height * 2);
      }
    })
    .onEnd((e) => {
      if (e.translationY < -100) {
        // Swiped up enough → submit
        translateY.value = withTiming(-height, {}, () => {
          onSwipeUp(tasks[currentIdx].id);
          setCurrentIdx((prev) => Math.min(prev + 1, tasks.length - 1));
          translateY.value = 0;
          scale.value = 1;
        });
      } else {
        // Spring back to origin
        translateY.value = withSpring(0, { damping: 10, mass: 1 });
        scale.value = withSpring(1, { damping: 10, mass: 1 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.stackContainer, animatedStyle]}>
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            damping: 10,
            mass: 1,
            stiffness: 100,
          }}
        >
          <View style={styles.card}>
            {tasks[currentIdx] && (
              <>
                <Text style={styles.cardTitle}>{tasks[currentIdx].title}</Text>
                <Text style={styles.cardPoints}>{tasks[currentIdx].points} RP</Text>
              </>
            )}
          </View>
        </MotiView>

        {/* Hint text */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 300, type: 'spring' }}
          style={styles.hintContainer}
        >
          <Text style={styles.hintText}>👆 Swipe Up to Submit</Text>
        </MotiView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stackContainer: {
    width: '100%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.85,
    height: 300,
    backgroundColor: '#1A2339',
    borderRadius: 20,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 91, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F6F8FF',
    marginBottom: 12,
  },
  cardPoints: {
    fontSize: 18,
    color: '#22D8E7',
    fontWeight: '600',
  },
  hintContainer: {
    marginTop: 24,
  },
  hintText: {
    fontSize: 16,
    color: '#B3B8D1',
    fontWeight: '500',
  },
});
```

### 3.5 Parent Approval Swipe Gesture

Create `mobile/src/components/ApprovalSwipeCard.js`:

```jsx
import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');
const THRESHOLD = width * 0.3; // 30% of screen = trigger action

/**
 * Swipe card for parent approval
 * Left swipe (30%+) = Deny
 * Right swipe (30%+) = Approve
 */
export function ApprovalSwipeCard({ 
  evidence,
  onApprove,
  onDeny,
  onSkip 
}) {
  const translateX = useSharedValue(0);
  const [feedback, setFeedback] = React.useState(null);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > THRESHOLD) {
        // Right swipe = Approve
        translateX.value = withSpring(width, {
          damping: 10,
          mass: 1,
          stiffness: 100,
        });
        runOnJS(onApprove)(evidence.id);
      } else if (e.translationX < -THRESHOLD) {
        // Left swipe = Deny
        translateX.value = withSpring(-width, {
          damping: 10,
          mass: 1,
          stiffness: 100,
        });
        runOnJS(onDeny)(evidence.id);
      } else {
        // Not enough movement → spring back
        translateX.value = withSpring(0, { damping: 10, mass: 1 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, width],
      [1, 0.2],
      Extrapolate.CLAMP
    ),
  }));

  const approveIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, THRESHOLD, width],
      [0, 0.5, 1],
      Extrapolate.CLAMP
    ),
  }));

  const denyIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-width, -THRESHOLD, 0],
      [1, 0.5, 0],
      Extrapolate.CLAMP
    ),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* Approve indicator (green, right) */}
        <Animated.View style={[styles.indicatorApprove, approveIndicatorStyle]}>
          <Text style={styles.indicatorText}>✓ Approve</Text>
        </Animated.View>

        {/* Deny indicator (red, left) */}
        <Animated.View style={[styles.indicatorDeny, denyIndicatorStyle]}>
          <Text style={styles.indicatorText}>✕ Deny</Text>
        </Animated.View>

        {/* Card content */}
        <View style={styles.card}>
          <Text style={styles.taskTitle}>{evidence.taskTitle}</Text>
          <View style={styles.thumbnail}>
            {/* Evidence image/video preview */}
            <Text style={styles.previewPlaceholder}>📷</Text>
          </View>
          <Text style={styles.childName}>{evidence.childName}</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>AI Score:</Text>
            <Text style={styles.scoreValue}>{evidence.aiScore}%</Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 380,
  },
  card: {
    flex: 1,
    backgroundColor: '#1A2339',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 91, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F6F8FF',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(34, 216, 231, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewPlaceholder: {
    fontSize: 64,
  },
  childName: {
    fontSize: 14,
    color: '#B3B8D1',
    marginBottom: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#7A7E94',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22D8E7',
  },
  indicatorApprove: {
    position: 'absolute',
    left: 20,
    top: '50%',
    zIndex: 1,
    backgroundColor: 'rgba(6, 211, 168, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  indicatorDeny: {
    position: 'absolute',
    right: 20,
    top: '50%',
    zIndex: 1,
    backgroundColor: 'rgba(255, 61, 90, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  indicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F6F8FF',
  },
});
```

---

## 4. CSS Animations (Fallback for Reduced Motion)

Create `frontend/src/styles/fluid-motions.css`:

```css
/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* Stagger cascade keyframes */
@keyframes cascadeUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.cascade-item {
  animation: cascadeUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.cascade-item:nth-child(1) { animation-delay: 0.08s; }
.cascade-item:nth-child(2) { animation-delay: 0.16s; }
.cascade-item:nth-child(3) { animation-delay: 0.24s; }
.cascade-item:nth-child(4) { animation-delay: 0.32s; }
.cascade-item:nth-child(5) { animation-delay: 0.40s; }
.cascade-item:nth-child(n+6) { animation-delay: calc(0.08s * var(--index)); }

/* Scroll reveal (AOS fallback) */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.scroll-reveal {
  animation: slideInUp 0.5s ease-out forwards;
}

/* Magnetic hover glow */
@keyframes magneticGlow {
  0% {
    box-shadow: 0 0 0 rgba(124, 91, 255, 0.2);
  }
  50% {
    box-shadow: 0 8px 32px rgba(124, 91, 255, 0.3);
  }
  100% {
    box-shadow: 0 8px 32px rgba(124, 91, 255, 0.16);
  }
}

.glass-button:hover {
  animation: magneticGlow 0.3s ease-out forwards;
}

/* Pop-in modal */
@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.75) rotate(-5deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

.modal-content {
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* Slide out (task deletion) */
@keyframes slideOutRight {
  from {
    opacity: 1;
    transform: translateX(0) scaleY(1);
    height: auto;
  }
  to {
    opacity: 0;
    transform: translateX(100px) scaleY(0.9);
    height: 0;
    margin-bottom: 0;
  }
}

.task-card.deleting {
  animation: slideOutRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

---

## 5. Implementation Checklist

### Phase 1: Web (Week 1–2)

- [ ] Install Framer Motion (`npm install framer-motion`)
- [ ] Create `frontend/src/utils/motionConfig.js`
- [ ] Build `StaggeredBentoGrid.jsx`
- [ ] Build `ScrollReveal.jsx`
- [ ] Build `MagneticButton.jsx`
- [ ] Update `BentoCard.jsx` to use `<motion.div>`
- [ ] Create `frontend/src/styles/fluid-motions.css` (CSS fallback)
- [ ] Test stagger cascade on dashboard load
- [ ] Verify `prefers-reduced-motion` respected

### Phase 2: Web Advanced (Week 2–3)

- [ ] Build `AnimatedModal.jsx`
- [ ] Build `TaskExitCard.jsx` (slide out animation)
- [ ] Build `EvidenceShrinkAnimation.jsx` (evidence submit)
- [ ] Build `ReorderableList.jsx` (drag-drop tasks)
- [ ] Integrate into `ParentDashboard.jsx`
- [ ] Test all exit animations
- [ ] Performance audit (60 FPS target)

### Phase 3: Mobile (Week 3–4)

- [ ] Install Moti and React Native Reanimated
- [ ] Build `StudyBuddyBubble.js`
- [ ] Build `TaskCardStack.js` (Tinder-style)
- [ ] Build `ApprovalSwipeCard.js` (left/right swipe)
- [ ] Build `EvidenceAttachmentSequence.js`
- [ ] Integrate into mobile screens
- [ ] Test on iOS + Android
- [ ] Verify touch responsiveness (>60 FPS)

### Phase 4: Polish (Week 4–5)

- [ ] Refine spring constants (feel too bouncy/smooth?)
- [ ] Add haptic feedback on mobile (vibration patterns)
- [ ] Accessibility audit (keyboard navigation, screen readers)
- [ ] Performance profiling (React DevTools Profiler)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Gather user feedback

---

## 6. Performance Optimization Tips

### Web (React/Framer Motion)

1. **Lazy load animations** — Don't animate items off-screen
   ```jsx
   import { useInView } from 'framer-motion';
   const isInView = useInView(ref, { once: true });
   ```

2. **Use `will-change` sparingly**
   ```css
   .animated-element {
     will-change: transform, opacity;
     /* Only on elements being animated */
   }
   ```

3. **Cache animation configs**
   ```jsx
   const containerVariants = useMemo(() => ({...}), []);
   ```

4. **Profiler check** 
   ```bash
   # In Chrome DevTools: Performance tab
   # Record → Run animation → Check FPS (target: 60)
   ```

### Mobile (React Native)

1. **Use `useNativeDriver: true`** for all animations
   ```jsx
   Animated.timing(anim, { useNativeDriver: true }).start();
   ```

2. **GPU-render layers**
   ```jsx
   <Animated.View style={{ renderToHardwareTextureAndroid: true }}>
   ```

3. **Avoid re-renders during gesture**
   ```jsx
   const x = useSharedValue(0);
   // Use Reanimated's runOnJS for state updates
   ```

---

## 7. Testing Fluid Motion

### Unit Tests (Vitest)

```javascript
// frontend/src/components/__tests__/StaggeredBentoGrid.test.js
import { render, screen } from '@testing-library/react';
import { StaggeredBentoGrid } from '../layout/StaggeredBentoGrid';

describe('StaggeredBentoGrid', () => {
  it('renders children in staggered order', () => {
    const items = [
      <div key="1">Card 1</div>,
      <div key="2">Card 2</div>,
    ];

    render(<StaggeredBentoGrid>{items}</StaggeredBentoGrid>);

    // Verify both items rendered
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion', () => {
    // Mock matchMedia
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
    }));

    render(<StaggeredBentoGrid>{[]}</StaggeredBentoGrid>);

    // Verify no animations when preference set
    expect(window.getComputedStyle(document.body).animationDuration).toBe('0s');
  });
});
```

### E2E Tests (Playwright)

```javascript
// e2e/animations.spec.js
import { test, expect } from '@playwright/test';

test('dashboard cards cascade on load', async ({ page }) => {
  await page.goto('/parent/dashboard');

  // Verify first card appears before last
  const firstCard = page.locator('[data-testid="card-0"]');
  const lastCard = page.locator('[data-testid="card-5"]');

  const firstTime = await firstCard.boundingBox().then(b => console.time('card-0'));
  const lastTime = await lastCard.boundingBox().then(b => console.time('card-5'));

  // Check stagger delay was applied (roughly 0.5s + stagger offsets)
  expect(lastTime - firstTime).toBeGreaterThan(300);
});
```

---

## 8. Accessibility Guidelines

### WCAG 2.1 Compliance

✅ **Do:**
- Respect `prefers-reduced-motion: reduce` media query
- Provide keyboard alternatives to gesture-based interactions
- Ensure focus rings visible during `translateY` animations
- Test with screen readers (VoiceOver, NVDA)

❌ **Don't:**
- Auto-play animations on page load (unless brief)
- Use animations for critical information (e.g., error messages)
- Create animations faster than 100ms (accessibility risk)

### Code Example

```jsx
// Always check user preference
const { prefers ReducedMotion } = useMediaQuery('(prefers-reduced-motion: reduce)');

const springConfig = prefersReducedMotion
  ? { duration: 0.01 } // Instant
  : MOTION.spring.default; // Spring physics
```

---

## 9. String Tune Reference Breakdown

| String Tune Feature | Your Implementation |
|---|---|
| Staggered entry | `StaggeredBentoGrid` + 0.08s offset |
| Spring physics | Framer Motion spring type, stiffness=100, damping=10 |
| Scroll reveals | `ScrollReveal` component with `useInView` |
| Magnetic hover | `MagneticButton` with cursor tracking (10px range) |
| Modal pop-in | `AnimatedModal` with spring bounce |
| Exit animations | `TaskExitCard` + `AnimatePresence` |
| Task reordering | `Reorder.Item` (draggable reflow) |
| Chat bubble | `StudyBuddyBubble` with Moti pop-in |
| Approval swipe | `ApprovalSwipeCard` left/right gestures |
| Gaming timer | Full-screen countdown with glow effect |

---

## 10. Migration Guide from Old Dashboard

### Before (No animation)
```jsx
function ParentDashboard() {
  return (
    <div className="dashboard">
      {cards.map((card) => <Card key={card.id} {...card} />)}
    </div>
  );
}
```

### After (Fluid Motion)
```jsx
import { StaggeredBentoGrid } from '../components/layout/StaggeredBentoGrid';

function ParentDashboard() {
  return (
    <StaggeredBentoGrid>
      {cards.map((card) => (
        <motion.div key={card.id} layout>
          <Card {...card} />
        </motion.div>
      ))}
    </StaggeredBentoGrid>
  );
}
```

---

## Success Criteria ✅

- [ ] Dashboard loads with cascading card animation (0.1s stagger)
- [ ] Hover states feel "bouncy" and magnetic (spring physics visible)
- [ ] Scroll reveals trigger smoothly as user scrolls down
- [ ] Deleting a task triggers slide-out + sibling reflow
- [ ] Evidence submission shows shrink animation into task card
- [ ] Mobile Tinder stack responds instantly to swipe (>60 FPS)
- [ ] Parent swipe approval feedback clear (green/red indicators)
- [ ] All animations respect `prefers-reduced-motion`
- [ ] No jank or layout shift during animations
- [ ] Keyboard navigation works for all interactive elements

---

**Status:** Ready for Implementation  
**Next:** Begin Phase 1 (install Framer Motion, extract motionConfig.js)
