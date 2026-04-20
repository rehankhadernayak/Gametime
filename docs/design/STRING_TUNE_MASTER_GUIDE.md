# String Tune Master UI/UX Implementation Guide
## Linear-Esque Depth, Motion & Optics for Gametime

> **Design Authority:** World-Class Creative Developer + Motion Specialist  
> **Reference:** [string-tune.fiddle.digital](https://string-tune.fiddle.digital/)  
> **Aesthetic:** Linear-esque modern SaaS (glassmorphism + mesh gradients + luxury motion)  
> **Target Platform:** React 18 + Vite (Web), React Native + Expo (Mobile)  
> **Last Updated:** April 20, 2026

---

## 1. The "Optics" Layer: Physical Depth & Lighting

### 1.1 Foundational CSS System

Create `frontend/src/styles/string-tune-optics.css`:

```css
/* ═══════════════════════════════════════════════════════════════════════
   STRING TUNE OPTICS LAYER
   Glassmorphism + Noise + Border Lighting + Mesh Gradients
   ═══════════════════════════════════════════════════════════════════════ */

:root {
  /* Golden Ratio Spacing (1 : 1.618) */
  --space-1:    calc(1rem);
  --space-2:    calc(1rem * 1.618);     /* 1.618rem */
  --space-3:    calc(1rem * 2.618);     /* 2.618rem */
  --space-4:    calc(1rem * 4.236);     /* 4.236rem */
  --space-5:    calc(1rem * 6.854);     /* 6.854rem */

  /* Cubic Bezier curves (luxury motion) */
  --ease-luxury: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Glassmorphism tokens */
  --glass-blur:      20px;
  --glass-opacity:   0.03;
  --glass-border:    rgba(124, 91, 255, 0.15);
  --glass-bg-dark:   rgba(20, 35, 60, 0.68);
  
  /* Mesh gradient (global illumination) */
  --mesh-color-1:    #7C5BFF;
  --mesh-color-2:    #22D8E7;
  --mesh-opacity:    0.05;
}

/* ─────────────────────────────────────────────────────────
   SVG NOISE FILTER (Injected into page) 
   ───────────────────────────────────────────────────────── */

/* This should be in index.html or injected via React */
svg#noise-filter {
  display: none;
}

@supports (filter: url(#noise)) {
  body {
    filter: url(#noise);
  }
}

/* ─────────────────────────────────────────────────────────
   GLOBAL MESH GRADIENT ILLUMINATION
   ───────────────────────────────────────────────────────── */

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(
      ellipse 600px 600px at 20% 30%,
      rgba(124, 91, 255, 0.05) 0%,
      transparent 80%
    ),
    radial-gradient(
      ellipse 800px 400px at 80% 60%,
      rgba(34, 216, 231, 0.05) 0%,
      transparent 80%
    ),
    radial-gradient(
      ellipse 400px 800px at 50% -10%,
      rgba(124, 91, 255, 0.03) 0%,
      transparent 70%
    );
  pointer-events: none;
  z-index: 0;
}

main {
  position: relative;
  z-index: 1;
}

/* ─────────────────────────────────────────────────────────
   GLASSMORPHIC BASE
   ───────────────────────────────────────────────────────── */

.glass-base {
  background: var(--glass-bg-dark);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: 16px;
}

/* Border Lighting Effect (top/left brighter) */
.glass-base::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.02) 50%,
    rgba(0, 0, 0, 0.1) 100%
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s var(--ease-smooth);
}

.glass-base:hover::before {
  opacity: 1;
}

/* ─────────────────────────────────────────────────────────
   BENTO CARD: LUXURY BASE STYLING
   ───────────────────────────────────────────────────────── */

.bento-card {
  @extend .glass-base;
  padding: var(--space-2);
  transition: all 0.6s var(--ease-luxury);
  position: relative;
  overflow: hidden;

  /* Subtle inner shadow for depth */
  box-shadow: 
    inset 0 1px 2px rgba(255, 255, 255, 0.1),
    0 8px 32px rgba(124, 91, 255, 0.1),
    0 20px 60px rgba(124, 91, 255, 0.05);
}

/* Hover state: elevated + glow intensifies */
.bento-card:hover {
  border-color: rgba(124, 91, 255, 0.4);
  box-shadow: 
    inset 0 1px 2px rgba(255, 255, 255, 0.15),
    0 12px 48px rgba(124, 91, 255, 0.2),
    0 30px 80px rgba(124, 91, 255, 0.1);
  transform: translateY(-4px);
}

/* ─────────────────────────────────────────────────────────
   FLOATING ANIMATION (Rewards, icons)
   ───────────────────────────────────────────────────────── */

@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
}

.floating-element {
  animation: float 3s ease-in-out infinite;
}

/* Stagger floating items by index */
.floating-element:nth-child(1) { animation-delay: 0s; }
.floating-element:nth-child(2) { animation-delay: 0.2s; }
.floating-element:nth-child(3) { animation-delay: 0.4s; }
.floating-element:nth-child(4) { animation-delay: 0.6s; }
.floating-element:nth-child(n+5) { animation-delay: calc(0.1s * var(--index)); }

/* ─────────────────────────────────────────────────────────
   SQUIRCLE MASKING (SVG shape for premium iOS feel)
   ───────────────────────────────────────────────────────── */

.squircle-mask {
  mask-image: url(#squircle-mask);
  -webkit-mask-image: url(#squircle-mask);
  mask-size: contain;
  border-radius: 20px; /* Fallback for non-SVG support */
}

/* ─────────────────────────────────────────────────────────
   3D TILT EFFECT (Images on hover)
   ───────────────────────────────────────────────────────── */

.tilt-image {
  perspective: 1000px;
  transform-style: preserve-3d;
  transition: transform 0.3s var(--ease-smooth);
}

/* Applied via JavaScript for mouse tracking */
.tilt-image.tilted {
  transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
}

/* ─────────────────────────────────────────────────────────
   CLIP-PATH REVEAL ANIMATIONS
   ───────────────────────────────────────────────────────── */

@keyframes revealFromCenter {
  0% {
    clip-path: inset(50% 50% 50% 50%);
  }
  100% {
    clip-path: inset(0 0 0 0);
  }
}

@keyframes revealShutter {
  0% {
    clip-path: inset(0 100% 0 0);
  }
  100% {
    clip-path: inset(0 0 0 0);
  }
}

.reveal-center {
  animation: revealFromCenter 0.8s var(--ease-luxury) forwards;
}

.reveal-shutter {
  animation: revealShutter 0.8s var(--ease-luxury) forwards;
}

/* ─────────────────────────────────────────────────────────
   GLOW-ON-VIEW (Bloom effect for evidence cards)
   ───────────────────────────────────────────────────────── */

@keyframes bloomGlow {
  0% {
    filter: drop-shadow(0 0 30px rgba(34, 216, 231, 0.8));
  }
  100% {
    filter: drop-shadow(0 0 0px rgba(34, 216, 231, 0));
  }
}

.glow-on-view {
  animation: bloomGlow 1s ease-out forwards;
}

/* ─────────────────────────────────────────────────────────
   SCROLL PARALLAX EFFECT
   ───────────────────────────────────────────────────────── */

.parallax-image {
  transition: 
    transform 0.6s var(--ease-luxury),
    filter 0.6s var(--ease-luxury);
}

.parallax-image.in-view {
  transform: scale(1) translateY(0);
  filter: blur(0);
}

.parallax-image:not(.in-view) {
  transform: scale(1.1) translateY(30px);
  filter: blur(1px);
}

/* ─────────────────────────────────────────────────────────
   STAGGERED ENTRANCE (Task list, children map)
   ───────────────────────────────────────────────────────── */

.stagger-item {
  --index: 0;
  transition-delay: calc(var(--index) * 0.05s);
  animation: cascadeUp 0.6s var(--ease-luxury) forwards;
  animation-delay: calc(var(--index) * 0.05s);
}

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

/* ─────────────────────────────────────────────────────────
   WILL-CHANGE PERFORMANCE OPTIMIZATION
   ───────────────────────────────────────────────────────── */

.animated-element {
  will-change: transform, opacity;
}

/* Remove will-change after animation completes */
.animated-element.done {
  will-change: auto;
}
```

### 1.2 SVG Noise Filter Injection

Create `frontend/src/components/NoiseFilter.jsx`:

```jsx
/**
 * Injects SVG noise filter into DOM
 * Creates the grainy "physical" texture of String Tune
 */
export function NoiseFilter() {
  return (
    <svg 
      id="noise-filter" 
      style={{ display: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Perlin noise filter for organic grain */}
      <filter id="noise">
        <feTurbulence 
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="4"
          result="noise"
          seed="1"
        />
        <feDisplacementMap 
          in="SourceGraphic"
          in2="noise"
          scale="0.5"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>

      {/* Squircle shape (rounded square for premium iOS aesthetic) */}
      <defs>
        <mask id="squircle-mask">
          <rect 
            width="100%" 
            height="100%" 
            fill="white"
            rx="20%"
            ry="20%"
          />
        </mask>
      </defs>
    </svg>
  );
}
```

Add to `frontend/src/App.jsx`:

```jsx
import { NoiseFilter } from './components/NoiseFilter';

export default function App() {
  return (
    <>
      <NoiseFilter />
      {/* Rest of app */}
    </>
  );
}
```

---

## 2. The "Motion" Engine: Advanced Transitions

### 2.1 3D Tilt Effect (Images with Cursor Tracking)

Create `frontend/src/components/animations/TiltImage.jsx`:

```jsx
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * 3D tilt effect based on cursor position
 * Perspective: 1000px, RotateX/Y by mouse offset
 */
export function TiltImage({ 
  src, 
  alt, 
  className = '' 
}) {
  const containerRef = useRef(null);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const percentX = (e.clientX - centerX) / (rect.width / 2);
    const percentY = (e.clientY - centerY) / (rect.height / 2);

    // Max rotation: ±15 degrees
    const rotateX = percentY * -15;
    const rotateY = percentX * 15;

    setTiltX(rotateX);
    setTiltY(rotateY);
  };

  const handleMouseLeave = () => {
    setTiltX(0);
    setTiltY(0);
    setIsHovering(false);
  };

  return (
    <motion.div
      ref={containerRef}
      className={`tilt-container ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: '1000px',
      }}
    >
      <motion.img
        src={src}
        alt={alt}
        className="tilt-image squircle-mask"
        animate={{
          rotateX: isHovering ? tiltX : 0,
          rotateY: isHovering ? tiltY : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 120,
          damping: 15,
          mass: 1,
        }}
        style={{
          transformStyle: 'preserve-3d',
          transition: isHovering ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </motion.div>
  );
}
```

**CSS (add to string-tune-optics.css):**
```css
.tilt-container {
  position: relative;
  display: inline-block;
  overflow: hidden;
  border-radius: 20px;
}

.tilt-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tilt-container:hover .tilt-image {
  filter: brightness(1.1) contrast(1.05);
}
```

### 2.2 Glow-on-View (Bloom Effect)

Create `frontend/src/components/animations/GlowImage.jsx`:

```jsx
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Image that triggers bloom/glow when entering viewport
 * Temporary effect, fades after 1s
 */
export function GlowImage({ 
  src, 
  alt, 
  taskTitle,
  childName,
  className = ''
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      className={`glow-image-container ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{
        duration: 0.6,
        ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <motion.img
        src={src}
        alt={alt}
        className={`glow-image ${isInView ? 'glow-on-view' : ''}`}
        animate={isInView ? {
          filter: [
            'drop-shadow(0 0 30px rgba(34, 216, 231, 0.8))',
            'drop-shadow(0 0 0px rgba(34, 216, 231, 0))',
          ],
        } : {}}
        transition={{
          duration: 1,
          ease: 'easeOut',
          times: [0, 1],
        }}
      />
      
      {/* Metadata overlay */}
      <motion.div
        className="glow-meta"
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <h3>{taskTitle}</h3>
        <p>{childName}</p>
      </motion.div>
    </motion.div>
  );
}
```

**CSS:**
```css
.glow-image-container {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  background: var(--glass-bg-dark);
  border: 1px solid var(--glass-border);
}

.glow-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.glow-meta {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-2);
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
}

.glow-meta h3 {
  font-size: 16px;
  font-weight: 700;
  color: #F6F8FF;
  margin: 0 0 4px 0;
}

.glow-meta p {
  font-size: 12px;
  color: #B3B8D1;
  margin: 0;
}
```

### 2.3 Scroll Parallax with Masked Reveals

Create `frontend/src/components/animations/ScrollRevealImage.jsx`:

```jsx
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Image that:
 * 1. Scales from 1.1 → 1.0 as it scrolls into view
 * 2. Translates from Y:30px → Y:0
 * 3. Reveals via clip-path "shutter" effect
 */
export function ScrollRevealImage({ 
  src, 
  alt,
  revealStyle = 'shutter', // 'shutter' | 'center'
  className = ''
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once: true, 
    margin: '0px 0px -100px 0px' 
  });

  const revealVariants = {
    shutter: {
      hidden: { clipPath: 'inset(0 100% 0 0)' },
      visible: { clipPath: 'inset(0 0 0 0)' },
    },
    center: {
      hidden: { clipPath: 'inset(50% 50% 50% 50%)' },
      visible: { clipPath: 'inset(0 0 0 0)' },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={`scroll-reveal-container ${className}`}
      variants={revealVariants[revealStyle]}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      transition={{
        duration: 0.8,
        ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <motion.img
        src={src}
        alt={alt}
        animate={isInView ? { scale: 1, y: 0 } : { scale: 1.1, y: 30 }}
        transition={{
          duration: 0.8,
          ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
          delay: 0.2,
        }}
        className="scroll-reveal-image squircle-mask"
      />
    </motion.div>
  );
}
```

**CSS:**
```css
.scroll-reveal-container {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  background: var(--glass-bg-dark);
}

.scroll-reveal-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
```

### 2.4 Layout Morphing (Shared Element Transition)

Create `frontend/src/components/animations/TaskDetailMorph.jsx`:

```jsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

/**
 * When user clicks a task card, it expands in place
 * (not navigate to new page—morph the card itself)
 */
export function TaskCardMorphable({ 
  task, 
  onClose 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Collapsed view (clickable) */}
      {!isExpanded && (
        <motion.div
          layoutId={`task-${task.id}`}
          onClick={() => setIsExpanded(true)}
          className="task-card-summary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <h3>{task.title}</h3>
          <p>{task.points} RP</p>
          <motion.button className="expand-btn">
            View Details →
          </motion.button>
        </motion.div>
      )}

      {/* Expanded view (full-screen detail) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            layoutId={`task-${task.id}`}
            className="task-detail-expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div className="detail-content">
              <h2>{task.title}</h2>
              <p className="description">{task.description}</p>
              <div className="evidence-gallery">
                {task.submissions?.map((sub, idx) => (
                  <TiltImage 
                    key={idx} 
                    src={sub.imageUrl} 
                    alt={`Evidence ${idx}`}
                  />
                ))}
              </div>
              
              <button 
                onClick={() => setIsExpanded(false)}
                className="close-btn"
              >
                ← Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

**CSS:**
```css
.task-card-summary {
  background: var(--glass-bg-dark);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: var(--space-2);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-card-summary:hover {
  border-color: rgba(124, 91, 255, 0.4);
  box-shadow: 0 12px 48px rgba(124, 91, 255, 0.2);
}

.task-detail-expanded {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-3);
}

.detail-content {
  max-width: 800px;
  background: var(--glass-bg-dark);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: var(--space-3);
  max-height: 90vh;
  overflow-y: auto;
}

.evidence-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-2);
  margin: var(--space-2) 0;
}

.close-btn {
  background: transparent;
  border: 1px solid var(--glass-border);
  color: #F6F8FF;
  padding: var(--space-1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-btn:hover {
  border-color: rgba(124, 91, 255, 0.4);
  background: rgba(124, 91, 255, 0.1);
}
```

### 2.5 Magnetic Button (Enhanced Version)

Create `frontend/src/components/shared/MagneticButtonV2.jsx`:

```jsx
import { motion } from 'framer-motion';
import { useState } from 'react';

/**
 * Premium magnetic button with:
 * - 15px pull radius (vs 10px basic)
 * - Luxury cubic-bezier motion
 * - Border lighting on hover
 */
export function MagneticButton({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = e.clientX - centerX;
    const y = e.clientY - centerY;

    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = 15; // 15px radius (premium feel)

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
      className={`magnetic-button ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
      animate={{
        x: mousePosition.x,
        y: mousePosition.y,
        scale: isHovering ? 1.08 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 15,
        mass: 0.8,
      }}
      whileTap={{ scale: 0.92 }}
    >
      <motion.span
        animate={{ letterSpacing: isHovering ? '0.05em' : '0em' }}
        transition={{
          duration: 0.3,
          ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {label}
      </motion.span>
    </motion.button>
  );
}
```

**CSS:**
```css
.magnetic-button {
  background: linear-gradient(135deg, #7C5BFF 0%, #9D72FF 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  overflow: hidden;
}

.magnetic-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(255, 255, 255, 0) 50%,
    rgba(0, 0, 0, 0.1) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.magnetic-button:hover::before {
  opacity: 1;
}

.magnetic-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Luxury box shadow on hover */
.magnetic-button:hover {
  box-shadow: 
    0 8px 32px rgba(124, 91, 255, 0.3),
    0 20px 60px rgba(124, 91, 255, 0.15);
}
```

---

## 3. Advanced Image UX Patterns

### 3.1 Complete Evidence Card (All Effects Combined)

Create `frontend/src/components/EvidenceCardPremium.jsx`:

```jsx
import {
  TiltImage,
  GlowImage,
  ScrollRevealImage,
} from './animations';
import { motion } from 'framer-motion';

/**
 * Premium evidence card combining:
 * - 3D tilt on hover
 * - Bloom glow on view
 * - Scroll parallax reveal
 * - Floating animation for UI elements
 */
export function EvidenceCardPremium({
  imageUrl,
  taskTitle,
  childName,
  aiScore,
  status,
  index,
}) {
  return (
    <motion.div
      className="evidence-card-premium"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.05,
        ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      --index={index}
    >
      {/* Main image with all effects */}
      <div className="image-wrapper">
        <ScrollRevealImage
          src={imageUrl}
          alt={taskTitle}
          revealStyle="shutter"
        />
        
        {/* Floating score badge */}
        <motion.div
          className="floating-element ai-score-badge"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 + 0.2 }}
        >
          <span className="score-value">{aiScore}%</span>
          <span className="score-label">AI Score</span>
        </motion.div>
      </div>

      {/* Card info */}
      <div className="card-footer">
        <div>
          <h3>{taskTitle}</h3>
          <p className="child-name">{childName}</p>
        </div>
        <motion.span
          className={`status-badge status-${status}`}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, delay: index * 0.05 + 0.3 }}
        >
          {status === 'approved' ? '✓' : '?'}
        </motion.span>
      </div>
    </motion.div>
  );
}
```

**CSS:**
```css
.evidence-card-premium {
  background: var(--glass-bg-dark);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.evidence-card-premium:hover {
  border-color: rgba(124, 91, 255, 0.4);
  box-shadow: 
    0 12px 48px rgba(124, 91, 255, 0.2),
    0 30px 80px rgba(124, 91, 255, 0.1);
  transform: translateY(-4px);
}

.image-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* 1:1 aspect ratio */
  overflow: hidden;
}

.image-wrapper img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.ai-score-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(34, 216, 231, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.ai-score-badge .score-value {
  font-size: 18px;
  font-weight: 700;
  color: #050505;
}

.ai-score-badge .score-label {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.7);
  font-weight: 500;
}

.card-footer {
  padding: var(--space-2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-footer h3 {
  font-size: 14px;
  font-weight: 700;
  color: #F6F8FF;
  margin: 0 0 4px 0;
}

.card-footer .child-name {
  font-size: 12px;
  color: #B3B8D1;
  margin: 0;
}

.status-badge {
  font-size: 24px;
  transition: all 0.3s ease;
}

.status-badge.status-approved {
  color: #06D3A8;
}

.status-badge.status-pending {
  color: #FFA500;
}
```

---

## 4. Performance Optimization Checklist

### 4.1 Critical Rendering Path

```css
/* Optimize for 60 FPS */
* {
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
}

/* Use passive event listeners (Framer Motion handles this) */
.animated-element {
  will-change: transform, opacity;
  contain: layout style paint;
}

/* Reduce repaints with GPU acceleration */
.parallax-section {
  transform: translate3d(0, 0, 0); /* Force GPU rendering */
}
```

### 4.2 Image Optimization

```jsx
// Use next-gen formats
<picture>
  <source srcset="/images/evidence.webp" type="image/webp" />
  <source srcset="/images/evidence.png" type="image/png" />
  <img src="/images/evidence.png" alt="Evidence" />
</picture>

// Lazy load with Intersection Observer
useInView(ref, { triggerOnce: true, margin: '50px' })
```

---

## 5. Implementation Roadmap

### Phase 1: Optics Foundation (Week 1)
- [ ] Create `string-tune-optics.css` with glassmorphism + mesh gradients
- [ ] Inject SVG noise filter + squircle masks
- [ ] Update `BentoCard` styling with border lighting
- [ ] Add floating animations to UI elements

### Phase 2: Motion Engine (Week 2)
- [ ] Build `TiltImage.jsx` with 3D perspective
- [ ] Build `GlowImage.jsx` with bloom effect
- [ ] Build `ScrollRevealImage.jsx` with clip-path reveals
- [ ] Build `TaskDetailMorph.jsx` with shared layouts
- [ ] Build enhanced `MagneticButton.jsx` (15px radius)

### Phase 3: Integration (Week 3)
- [ ] Update `ParentDashboard` to use premium components
- [ ] Replace evidence cards with `EvidenceCardPremium`
- [ ] Add parallax to task gallery
- [ ] Integrate magnetic buttons throughout UI

### Phase 4: Mobile & Polish (Week 4–5)
- [ ] Adapt optics + motion for mobile (reduced blur, simpler effects)
- [ ] Performance audit (60 FPS target)
- [ ] Accessibility compliance (WCAG AA+)
- [ ] User testing + refinement

---

## 6. CSS Constants Reference

```css
/* Golden Ratio spacing */
--space-1: 1rem              /* 16px */
--space-2: 1.618rem          /* 25.9px */
--space-3: 2.618rem          /* 41.9px */
--space-4: 4.236rem          /* 67.8px */  
--space-5: 6.854rem          /* 109.7px */

/* Luxury easing */
--ease-luxury: cubic-bezier(0.22, 1, 0.36, 1)    /* Float/expand */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)      /* Standard */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1) /* Bouncy */

/* Animation durations */
0.3s — Subtle hovers (buttons, icons)
0.6s — Card reveals (primary motion)
0.8s — Page transitions (layout morphs)
1.0s — Glow effects (bloom on view)

/* Transform Z-index (stacking) */
.mesh-gradient: z-index 0
.content: z-index 1
.modals: z-index 1000
```

---

## 7. String Tune Feature Mapping

| String Tune Feature | Your Implementation | Component |
|---|---|---|
| Glassmorphism + blur | `backdrop-filter: blur(20px)` | string-tune-optics.css |
| Grainy texture | SVG `feTurbulence` filter | NoiseFilter.jsx |
| Mesh gradients | Radial gradient corners (5% opacity) | string-tune-optics.css |
| Border lighting | Gradient ::before on cards | BentoCard (string-tune-optics.css) |
| 3D tilt on hover | `rotateX/Y` by mouse position | TiltImage.jsx |
| Bloom on view | `drop-shadow` animation | GlowImage.jsx |
| Scroll parallax | Scale 1.1 → 1.0 + translateY | ScrollRevealImage.jsx |
| Clip-path reveals | Shutter & center animations | ScrollRevealImage.jsx |
| Floating icons | `@keyframes float` | Floating elements (CSS) |
| Layout morphing | Framer `layoutId` | TaskDetailMorph.jsx |
| Magnetic buttons | Cursor tracking 15px radius | MagneticButtonV2.jsx |
| Staggered entrance | `transition-delay: var(--index) * 0.05s` | stagger-item class |

---

## 8. Testing & Validation

### Visual Regression
```bash
# Use Chromatic (visual testing)
npm run chromatic
```

### Performance Profiling
```bash
# Chrome DevTools: Performance tab
# Record animation → Check FPS (target: 60)
# Look for: Long tasks, paint events, layout shifts
```

### Accessibility Audit
```bash
# axe DevTools (Chrome extension)
# Focus: WCAG AA minimum
# Test: prefers-reduced-motion, keyboard nav, screen readers
```

---

## Success Criteria ✅

- [ ] Dashboard loads with mesh gradient ambient lighting
- [ ] Cards have visible border lighting on hover (glow effect)
- [ ] Images tilt in 3D based on cursor position (±15°)
- [ ] Evidence cards bloom when entering viewport
- [ ] Task gallery uses clip-path shutter reveals
- [ ] Buttons have magnetic pull within 15px radius
- [ ] Floating UI elements (score badges) animate constantly
- [ ] All animations respect `prefers-reduced-motion`
- [ ] 60 FPS maintained on all animations (no jank)
- [ ] Mobile version simplified (blur reduced, no 3D tilt)
- [ ] Page feels "expensive" and premium (matches String Tune reference)

---

**Status:** Ready for Implementation  
**Reference Site:** [string-tune.fiddle.digital](https://string-tune.fiddle.digital/)  
**Next Step:** Phase 1 — Create optics.css + inject SVG noise filter
