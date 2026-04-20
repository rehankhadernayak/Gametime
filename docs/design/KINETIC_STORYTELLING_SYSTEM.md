# Gametime Kinetic Storytelling System
## String Tune-Inspired High-Motion Redesign (Web & Mobile)

> **Creative Technologist + Senior Engineer:** Kinetic motion system, storytelling aesthetic, and 360° redesign  
> **Reference:** [string-tune.fiddle.digital](https://string-tune.fiddle.digital/)  
> **Stack:** React 18 + Vite + GSAP + Framer Motion  
> **Aesthetic:** Pitch Black + Stark White + Gametime Neon (Pulse Red + Electric Blue)  
> **Target:** 60 FPS GPU-accelerated kinetic experience  
> **Last Updated:** April 20, 2026

---

## 1. Visual & Atmospheric Identity

### 1.1 The Palette

```css
:root {
  /* Foundation */
  --black-base:          #000000;  /* Pitch black void */
  --white-accent:        #FFFFFF;  /* Stark white text */
  --white-secondary:     #F0F0F0;  /* Softer whites */

  /* Gametime Neon (Proprietary) */
  --neon-red:            #FF2E5A;  /* Pulse red */
  --neon-red-dark:       #E61A42;  /* Deep red */
  --neon-red-glow:       rgba(255, 46, 90, 0.3);
  
  --neon-blue:           #00D9FF;  /* Electric blue */
  --neon-blue-dark:      #00A8CC;  /* Deep blue */
  --neon-blue-glow:      rgba(0, 217, 255, 0.3);

  /* Data visualization */
  --data-green:          #00FF00;  /* Matrix-style */
  --data-purple:         #B200FF;  /* Accent */
  --data-gold:           #FFD700;  /* Achievement */

  /* Glassmorphism */
  --glass-dark:          rgba(20, 20, 30, 0.7);
  --glass-border:        rgba(255, 255, 255, 0.1);
  --glass-blur:          backdrop-filter: blur(20px);
}

/* Dark theme root */
@media (prefers-color-scheme: dark) {
  body {
    background: var(--black-base);
    color: var(--white-accent);
  }
}
```

### 1.2 Typography System (Variable Weight)

Create `frontend/src/styles/kinetic-typography.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@100;200;300;400;500;600;700;800&family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');

:root {
  /* Font stacks */
  --font-heading: 'Sora', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  /* Kinetic typography scale */
  --text-display: clamp(48px, 10vw, 96px);
  --text-h1: clamp(36px, 8vw, 72px);
  --text-h2: clamp(28px, 6vw, 56px);
  --text-h3: clamp(22px, 4vw, 44px);
  --text-body-lg: 18px;
  --text-body: 16px;
  --text-body-sm: 14px;
  --text-caption: 12px;

  /* Letter spacing for data */
  --letter-tight: -0.02em;
  --letter-normal: 0em;
  --letter-wide: 0.05em;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 700;
  letter-spacing: var(--letter-tight);
  line-height: 1.1;
}

h1 {
  font-size: var(--text-h1);
  font-weight: 800;
}

h2 {
  font-size: var(--text-h2);
  font-weight: 700;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.6;
  letter-spacing: var(--letter-normal);
}

/* Data/stats: tighter letter spacing */
.data-label {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: var(--text-body-sm);
  letter-spacing: var(--letter-wide);
  text-transform: uppercase;
  opacity: 0.8;
}

/* Kinetic scroll effect: Variable weight on scroll */
.heading-kinetic {
  font-variation-settings: 'wght' 400;
  transition: font-weight 0.3s ease;
}

.heading-kinetic.scrolled-in {
  font-variation-settings: 'wght' 800;
}
```

### 1.3 The Hero Asset: 3D Digital Key

Create `frontend/src/components/HeroAssets/MasterController.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * 3D-rendered Master Controller that assembles itself on scroll
 * Represents "The Key to Gaming Time"
 * Inspired by String Tune's katana assembly
 */
export function MasterController() {
  const containerRef = useRef(null);
  const partsRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // SVG parts: button, trigger, digital core, antenna
    const parts = [
      { id: 'core', delay: 0 },
      { id: 'button-a', delay: 0.2 },
      { id: 'button-b', delay: 0.3 },
      { id: 'trigger', delay: 0.4 },
      { id: 'antenna', delay: 0.5 },
      { id: 'glow', delay: 0.6 },
    ];

    gsap.set(partsRef.current, { opacity: 0, scale: 0 });

    ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top center',
      end: 'bottom center',
      onUpdate: (self) => {
        // Assembly animation based on scroll progress
        partsRef.current.forEach((part, idx) => {
          const progress = Math.max(0, self.progress - parts[idx].delay);
          const eased = gsap.utils.clamp(0, 1, progress / 0.2);

          gsap.to(part, {
            opacity: eased,
            scale: eased,
            rotation: eased * 360,
            duration: 0,
          });
        });
      },
      markers: false,
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="hero-master-controller">
      <svg viewBox="0 0 400 600" className="controller-svg">
        {/* Core circle */}
        <circle
          ref={(el) => (partsRef.current[0] = el)}
          cx="200"
          cy="300"
          r="80"
          fill="none"
          stroke="var(--neon-blue)"
          strokeWidth="2"
        />

        {/* Button A */}
        <circle
          ref={(el) => (partsRef.current[1] = el)}
          cx="150"
          cy="250"
          r="20"
          fill="var(--neon-red)"
          filter="url(#neon-glow)"
        />

        {/* Button B */}
        <circle
          ref={(el) => (partsRef.current[2] = el)}
          cx="250"
          cy="250"
          r="20"
          fill="var(--neon-blue)"
          filter="url(#neon-glow)"
        />

        {/* Trigger */}
        <rect
          ref={(el) => (partsRef.current[3] = el)}
          x="180"
          y="380"
          width="40"
          height="60"
          fill="none"
          stroke="var(--neon-red)"
          strokeWidth="2"
        />

        {/* Antenna */}
        <line
          ref={(el) => (partsRef.current[4] = el)}
          x1="200"
          y1="220"
          x2="200"
          y2="100"
          stroke="var(--neon-blue)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Glow effect */}
        <circle
          ref={(el) => (partsRef.current[5] = el)}
          cx="200"
          cy="300"
          r="100"
          fill="none"
          stroke="var(--neon-blue-glow)"
          strokeWidth="4"
          filter="url(#blur-large)"
        />

        {/* SVG filters */}
        <defs>
          <filter id="neon-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="blur-large">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
      </svg>

      {/* Pulsing text */}
      <h1 className="controller-label">MASTER CONTROLLER</h1>
      <p className="controller-desc">Your key to gaming time</p>
    </div>
  );
}
```

**CSS:**
```css
.hero-master-controller {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.controller-svg {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 0 20px var(--neon-blue-glow));
}

.controller-label {
  font-size: var(--text-h2);
  color: var(--neon-blue);
  text-align: center;
  letter-spacing: 0.1em;
  animation: pulse-label 2s ease-in-out infinite;
}

.controller-desc {
  font-size: var(--text-body-sm);
  color: var(--white-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@keyframes pulse-label {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
```

---

## 2. Kinetic Motion System (GSAP Setup)

### 2.1 GSAP Configuration

Create `frontend/src/utils/gsapConfig.js`:

```javascript
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';

// Register plugins
gsap.registerPlugin(ScrollTrigger, TextPlugin);

/**
 * Blur-to-Focus Scroll Effect
 * Headers start blurred (30px) and scaled down (0.5)
 * Animate to sharp (0px blur) and scaled up (1.1) at center-third of viewport
 */
export function createBlurToFocusEffect(element, options = {}) {
  const {
    blurStart = 30,
    blurEnd = 0,
    scaleStart = 0.5,
    scaleEnd = 1.1,
    trigger = element,
  } = options;

  gsap.set(element, {
    filter: `blur(${blurStart}px)`,
    scale: scaleStart,
  });

  ScrollTrigger.create({
    trigger,
    start: 'top center',
    end: 'center center',
    onUpdate: (self) => {
      gsap.to(element, {
        filter: `blur(${gsap.utils.interpolate(blurStart, blurEnd, self.progress)}px)`,
        scale: gsap.utils.interpolate(scaleStart, scaleEnd, self.progress),
        duration: 0,
      });
    },
  });
}

/**
 * Horizontal Parallax Divider
 * Large background text moves at different speed than foreground
 */
export function createParallaxDivider(bgElement, fgElement, speedMultiplier = 0.5) {
  gsap.to(bgElement, {
    y: () => window.innerHeight * -0.3,
    scrollTrigger: {
      trigger: bgElement,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });

  gsap.to(fgElement, {
    y: () => window.innerHeight * -0.6,
    scrollTrigger: {
      trigger: fgElement,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });
}

/**
 * Text Scrambling Effect (Terminal aesthetic)
 * Randomizes characters during animation, then settles
 */
export function createTextScramble(element, finalText, duration = 1) {
  const chars = '01アイウエオカキクケコサシスセソタチツテト!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
  const originalText = element.textContent;
  let iteration = 0;

  const scrambleInterval = setInterval(() => {
    iteration += 1;
    const progress = iteration / (duration * 100); // Rough FPS estimate

    if (progress >= 1) {
      element.textContent = finalText;
      clearInterval(scrambleInterval);
    } else {
      element.textContent = finalText
        .split('')
        .map((char, idx) => {
          if (idx < Math.floor(Math.random() * progress * finalText.length)) {
            return finalText[idx];
          }
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');
    }
  }, 30); // ~33ms per frame (30 FPS for scramble effect)
}

/**
 * Screen-Shake Effect (for success moments)
 */
export function createScreenShake(intensity = 10, duration = 0.3) {
  gsap.to(window, {
    duration,
    onUpdate() {
      const x = (Math.random() - 0.5) * intensity;
      const y = (Math.random() - 0.5) * intensity;
      gsap.set('body', { x, y });
    },
    onComplete() {
      gsap.set('body', { x: 0, y: 0 });
    },
  });
}

/**
 * Pixel-Gate Transition (SVG staggered mask)
 * Reveals image in pixelated grid blocks
 */
export function createPixelGateTransition(imageElement, duration = 0.8, gridSize = 8) {
  // Create SVG mask with grid pattern
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${gridSize} ${gridSize}`);
  svg.style.display = 'none';

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', i);
      rect.setAttribute('y', j);
      rect.setAttribute('width', '1');
      rect.setAttribute('height', '1');
      rect.setAttribute('fill', 'white');
      svg.appendChild(rect);
    }
  }

  document.body.appendChild(svg);

  // Stagger animation on each pixel
  const pixels = svg.querySelectorAll('rect');
  const pixelArray = Array.from(pixels);

  pixelArray.forEach((pixel, idx) => {
    gsap.to(pixel, {
      attr: { opacity: 0 },
      duration: duration * 0.7,
      delay: (idx / pixelArray.length) * duration * 0.5,
      ease: 'power2.out',
    });
  });
}

export default {
  createBlurToFocusEffect,
  createParallaxDivider,
  createTextScramble,
  createScreenShake,
  createPixelGateTransition,
};
```

### 2.2 Install GSAP

In `frontend/package.json`, add:
```json
{
  "dependencies": {
    "gsap": "^3.12.2",
    "lenis": "^1.0.29"
  }
}
```

---

## 3. Web Page Restructuring: The Landing Page

### 3.1 Smooth Scroll with Lenis

Create `frontend/src/hooks/useLenisScroll.js`:

```javascript
import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Smooth scroll hook using Lenis
 * No standard scrolling; glides smoothly through sections
 */
export function useLenisScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      smoothTouch: false,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);
}
```

### 3.2 7-Step Parent Onboarding (Horizontal Slide-and-Lock)

Create `frontend/src/pages/ParentOnboarding.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to Gametime',
    description: 'Turn chores into gaming rewards',
    color: '#1a1a2e',
    accent: '#00D9FF',
  },
  {
    title: 'Step 1: Create Your Children',
    description: 'Add kids aged 6–13 to your family',
    color: '#16213e',
    accent: '#FF2E5A',
  },
  {
    title: 'Step 2: Set Tasks',
    description: 'Define chores, homework, and milestones',
    color: '#0f3460',
    accent: '#00D9FF',
  },
  {
    title: 'Step 3: AI Reviews Evidence',
    description: 'Claude Vision verifies completions',
    color: '#1a1a2e',
    accent: '#FF2E5A',
  },
  {
    title: 'Step 4: Approve & Reward',
    description: 'Give final approval and award points',
    color: '#16213e',
    accent: '#00D9FF',
  },
  {
    title: 'Step 5: Gaming Sessions',
    description: 'Children redeem time blocks',
    color: '#0f3460',
    accent: '#FF2E5A',
  },
  {
    title: 'Step 6: Manage Rewards',
    description: 'Create custom unlockables and gift cards',
    color: '#1a1a2e',
    accent: '#00D9FF',
  },
];

export function ParentOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const carouselRef = useRef(null);

  useEffect(() => {
    // Horizontal scroll-locked carousel
    const carousel = carouselRef.current;
    if (!carousel) return;

    gsap.to(carousel, {
      x: () => -(currentStep * window.innerWidth),
      duration: 0.8,
      ease: 'power2.inOut',
    });
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="onboarding-container">
      {/* Background color transitions with current step */}
      <div
        className="onboarding-bg"
        style={{
          background: ONBOARDING_STEPS[currentStep].color,
          transition: 'background 0.6s ease',
        }}
      />

      {/* Carousel */}
      <div className="onboarding-carousel" ref={carouselRef}>
        {ONBOARDING_STEPS.map((step, idx) => (
          <div
            key={idx}
            className="onboarding-step"
            style={{
              '--accent': step.accent,
            }}
          >
            <h1 className="step-title">{step.title}</h1>
            <p className="step-description">{step.description}</p>

            {/* Step number with accent */}
            <div className="step-number">
              <span className="number">{idx + 1}</span>
              <span className="divider" />
              <span className="total">{ONBOARDING_STEPS.length}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="onboarding-nav">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="nav-button prev"
          aria-label="Previous step"
        >
          ← Back
        </button>

        <div className="progress-dots">
          {ONBOARDING_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`dot ${idx === currentStep ? 'active' : ''}`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentStep === ONBOARDING_STEPS.length - 1}
          className="nav-button next"
          aria-label="Next step"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
```

**CSS:**
```css
.onboarding-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.onboarding-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.onboarding-carousel {
  position: absolute;
  inset: 0;
  display: flex;
  width: 100%;
  height: 100%;
}

.onboarding-step {
  flex: 0 0 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 4rem;
  gap: 2rem;
}

.step-title {
  font-size: var(--text-display);
  color: var(--white-accent);
  letter-spacing: var(--letter-tight);
}

.step-description {
  font-size: var(--text-body-lg);
  color: var(--white-secondary);
  max-width: 600px;
}

.step-number {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: var(--text-body-sm);
  color: var(--accent);
  letter-spacing: var(--letter-wide);
  text-transform: uppercase;
}

.step-number .divider {
  width: 1px;
  height: 20px;
  background: var(--accent);
  opacity: 0.5;
}

.onboarding-nav {
  position: absolute;
  bottom: 2rem;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  z-index: 10;
}

.nav-button {
  background: var(--glass-dark);
  border: 1px solid var(--glass-border);
  color: var(--white-accent);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

.nav-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--neon-blue);
}

.nav-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.progress-dots {
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dot.active {
  background: var(--neon-blue);
  width: 30px;
  border-radius: 5px;
}
```

---

## 4. Parent Dashboard: 3D Bento Grid Redesign

### 4.1 Dashboard Container with Kinetic Effects

Create `frontend/src/pages/ParentDashboardKinetic.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MasterController } from '../components/HeroAssets/MasterController';
import { ChildProgressOrbs } from '../components/ChildProgressOrbs';
import { KineticTaskTable } from '../components/KineticTaskTable';
import { AITerminalWorkspace } from '../components/AITerminalWorkspace';

gsap.registerPlugin(ScrollTrigger);

export function ParentDashboardKinetic() {
  const headingRef = useRef(null);
  const heroRef = useRef(null);

  useEffect(() => {
    // Blur-to-focus on main heading
    if (headingRef.current) {
      gsap.set(headingRef.current, {
        filter: 'blur(30px)',
        scale: 0.5,
        opacity: 0.3,
      });

      ScrollTrigger.create({
        trigger: headingRef.current,
        start: 'top center',
        end: 'center center',
        onUpdate: (self) => {
          gsap.to(headingRef.current, {
            filter: `blur(${30 * (1 - self.progress)}px)`,
            scale: 0.5 + self.progress * 0.6,
            opacity: 0.3 + self.progress * 0.7,
            duration: 0,
          });
        },
      });
    }
  }, []);

  return (
    <div className="dashboard-kinetic">
      {/* Horizontal parallax divider section */}
      <section className="hero-section">
        <div className="parallax-bg">
          <h1 className="parallax-text">CONCENTRATE</h1>
        </div>
        <div className="parallax-fg">
          <div ref={heroRef}>
            <MasterController />
          </div>
        </div>
      </section>

      {/* Main heading with blur-to-focus */}
      <section className="dashboard-section">
        <h1 ref={headingRef} className="dashboard-title">
          Screen time, <span className="neon-accent">EARNED</span>.
        </h1>

        {/* Children floating orbs (pulse with RP) */}
        <div className="children-map">
          <ChildProgressOrbs />
        </div>

        {/* Kinetic task table (inline-edit with clip-path expand) */}
        <div className="tasks-section">
          <h2>Active Tasks</h2>
          <KineticTaskTable />
        </div>

        {/* AI Terminal workspace */}
        <div className="ai-section">
          <h2>AI Coach</h2>
          <AITerminalWorkspace />
        </div>
      </section>
    </div>
  );
}
```

**CSS:**
```css
.dashboard-kinetic {
  min-height: 100vh;
  background: var(--black-base);
  color: var(--white-accent);
}

.hero-section {
  position: relative;
  height: 80vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.parallax-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.parallax-text {
  font-size: clamp(80px, 20vw, 200px);
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--neon-blue);
  opacity: 0.15;
  text-shadow: 0 0 40px var(--neon-blue-glow);
}

.parallax-fg {
  position: relative;
  z-index: 2;
}

.dashboard-title {
  font-size: var(--text-display);
  text-align: center;
  letter-spacing: var(--letter-tight);
  margin-bottom: 4rem;
}

.neon-accent {
  color: var(--neon-red);
  text-shadow: 0 0 20px var(--neon-red-glow);
}

.children-map {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin: 4rem 0;
}

.tasks-section,
.ai-section {
  margin: 6rem 0;
}

.tasks-section h2,
.ai-section h2 {
  font-size: var(--text-h2);
  margin-bottom: 2rem;
  letter-spacing: var(--letter-tight);
}
```

### 4.2 Children Floating Orbs (Pulse with RP)

Create `frontend/src/components/ChildProgressOrbs.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Interactive floating orbs that pulse with child's current RP
 * Each orb "breathes" based on activity level
 */
export function ChildProgressOrbs({ children = [] }) {
  const orbsRef = useRef([]);

  useEffect(() => {
    orbsRef.current.forEach((orb, idx) => {
      // Floating animation
      gsap.to(orb, {
        y: Math.sin(idx) * 20,
        duration: 3 + idx * 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Pulsing based on imaginary RP changes
      gsap.to(orb, {
        '--pulse-scale': () => 1 + Math.random() * 0.2,
        duration: 2 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });
    });
  }, []);

  return (
    <div className="children-orbs">
      {[...Array(3)].map((_, idx) => (
        <div
          key={idx}
          ref={(el) => (orbsRef.current[idx] = el)}
          className="orb"
          style={{
            '--orb-index': idx,
            '--orb-color': idx % 2 === 0 ? 'var(--neon-blue)' : 'var(--neon-red)',
          }}
        >
          <div className="orb-core" />
          <div className="orb-glow" />
          <h3 className="orb-label">Child {idx + 1}</h3>
          <p className="orb-rp">2,450 RP</p>
        </div>
      ))}
    </div>
  );
}
```

**CSS:**
```css
.children-orbs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 2rem;
  padding: 2rem;
}

.orb {
  position: relative;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.orb:hover {
  transform: scale(1.1);
}

.orb-core {
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    var(--orb-color),
    rgba(0, 217, 255, 0.3)
  );
  border: 2px solid var(--orb-color);
  filter: drop-shadow(0 0 20px var(--orb-color));
  animation: pulse-orb 2s ease-in-out infinite;
}

.orb-glow {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 1px solid var(--orb-color);
  opacity: 0.3;
  animation: rotate-glow 4s linear infinite;
}

.orb-label {
  position: relative;
  z-index: 2;
  font-size: 14px;
  color: var(--white-accent);
  font-weight: 700;
  margin: 0;
}

.orb-rp {
  position: relative;
  z-index: 2;
  font-size: 16px;
  color: var(--orb-color);
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.05em;
}

@keyframes pulse-orb {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes rotate-glow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## 5. Kinetic Task Table (Inline-Edit with Clip-Path Expand)

### 5.1 Task Row with Expandable Detail View

Create `frontend/src/components/KineticTaskTable.jsx`:

```jsx
import { useState, useRef } from 'react';
import gsap from 'gsap';

export function KineticTaskTable({ tasks = [] }) {
  const [expandedId, setExpandedId] = useState(null);
  const rowRefs = useRef({});

  const handleRowClick = (taskId) => {
    setExpandedId(expandedId === taskId ? null : taskId);

    // Clip-path animation: row expands to full-screen detail
    const row = rowRefs.current[taskId];
    if (row) {
      if (expandedId === taskId) {
        // Collapse
        gsap.to(row, {
          clipPath: 'inset(0 0 0 0)',
          duration: 0.5,
          ease: 'power2.inOut',
        });
      } else {
        // Expand
        gsap.to(row, {
          clipPath: 'inset(0)',
          duration: 0.5,
          ease: 'power2.inOut',
        });
      }
    }
  };

  return (
    <div className="kinetic-task-table">
      {tasks.map((task) => (
        <div
          key={task.id}
          ref={(el) => (rowRefs.current[task.id] = el)}
          className={`task-row ${expandedId === task.id ? 'expanded' : ''}`}
          onClick={() => handleRowClick(task.id)}
        >
          <div className="row-summary">
            <h3>{task.title}</h3>
            <p className="task-points">{task.points} RP</p>
            <span className={`status status-${task.status}`}>{task.status}</span>
          </div>

          {expandedId === task.id && (
            <div className="row-detail">
              <h2>{task.title}</h2>
              <p className="description">{task.description}</p>
              
              {/* Evidence submissions */}
              {task.submissions?.length > 0 && (
                <div className="submissions">
                  <h4>Submissions</h4>
                  {task.submissions.map((sub, idx) => (
                    <div key={idx} className="submission-card">
                      <img src={sub.imageUrl} alt="Evidence" />
                      <p>{sub.childName}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="detail-actions">
                <button className="btn-approve">✓ Approve</button>
                <button className="btn-deny">✗ Deny</button>
                <button className="btn-close">← Back</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**CSS:**
```css
.kinetic-task-table {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-row {
  background: var(--glass-dark);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  clip-path: inset(0 0 0 0);
}

.task-row:hover {
  border-color: var(--neon-blue);
  background: rgba(0, 217, 255, 0.05);
}

.row-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.row-summary h3 {
  margin: 0;
  font-size: 18px;
}

.task-points {
  color: var(--neon-blue);
  font-weight: 700;
  margin: 0;
}

.status {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-pending {
  background: rgba(255, 165, 0, 0.2);
  color: #FFA500;
}

.status-approved {
  background: rgba(0, 255, 0, 0.2);
  color: #00FF00;
}

.task-row.expanded {
  position: fixed;
  inset: 0;
  z-index: 100;
  max-width: 100%;
  border-radius: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4rem;
}

.task-row.expanded .row-detail {
  animation: slideUp 0.5s ease;
}

.row-detail {
  margin-top: 2rem;
}

.row-detail h2 {
  font-size: var(--text-h1);
  margin-bottom: 1rem;
}

.description {
  font-size: var(--text-body-lg);
  color: var(--white-secondary);
  margin-bottom: 2rem;
}

.submissions {
  margin: 2rem 0;
}

.submissions h4 {
  font-size: var(--text-h3);
  margin-bottom: 1rem;
}

.submission-card {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  background: rgba(0, 217, 255, 0.05);
  padding: 1rem;
  border-radius: 8px;
}

.submission-card img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
}

.detail-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-approve,
.btn-deny,
.btn-close {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-approve {
  background: var(--neon-blue);
  color: var(--black-base);
}

.btn-deny {
  background: var(--neon-red);
  color: var(--white-accent);
}

.btn-close {
  background: var(--glass-dark);
  border: 1px solid var(--glass-border);
  color: var(--white-accent);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 6. AI Terminal Workspace (Text Scrambling + Scan Lines)

### 6.1 Terminal-Style Chat Interface

Create `frontend/src/components/AITerminalWorkspace.jsx`:

```jsx
import { useRef, useState, useEffect } from 'react';
import { createTextScramble } from '../utils/gsapConfig';

/**
 * Terminal-style AI workspace with:
 * - Text scrambling on response
 * - Glowing scan lines
 * - Monospace font + grid background
 */
export function AITerminalWorkspace() {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'AI COACH TERMINAL V2.1' },
    { role: 'system', text: '> Ready to optimize gaming schedules' },
  ]);
  const [input, setInput] = useState('');
  const terminalRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: input },
    ]);

    setInput('');

    // Simulate AI response with text scrambling
    setTimeout(() => {
      const responseText = 'Processing task completion data...';
      const newMessage = { role: 'ai', text: '', dom: null };

      setMessages((prev) => [...prev, newMessage]);

      // Create DOM reference for scrambling
      setTimeout(() => {
        const lastMsg = terminalRef.current?.lastChild;
        if (lastMsg) {
          createTextScramble(lastMsg, responseText, 0.8);
        }
      }, 50);
    }, 500);
  };

  return (
    <div className="ai-terminal">
      <div className="terminal-header">
        <span className="terminal-title">[ AI_COACH ]</span>
        <span className="terminal-status">● ACTIVE</span>
      </div>

      <div className="terminal-messages" ref={terminalRef}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message message-${msg.role}`}
          >
            {msg.role === 'system' && <span className="prefix">$</span>}
            {msg.role === 'user' && <span className="prefix">></span>}
            {msg.role === 'ai' && <span className="prefix">AI:</span>}
            <span className="text">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Scan lines effect */}
      <div className="scan-lines" />

      <form className="terminal-input" onSubmit={handleSend}>
        <span className="prefix">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command..."
          className="input-field"
        />
      </form>
    </div>
  );
}
```

**CSS:**
```css
.ai-terminal {
  background: var(--glass-dark);
  border: 1px solid var(--neon-blue);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 500px;
  font-family: 'Courier New', monospace;
  position: relative;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--neon-blue);
  background: rgba(0, 217, 255, 0.05);
}

.terminal-title {
  color: var(--neon-blue);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.terminal-status {
  color: var(--data-green);
  font-size: 12px;
  animation: blink 1s infinite;
}

.terminal-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 14px;
  line-height: 1.6;
  background: 
    repeating-linear-gradient(
      0deg,
      rgba(0, 217, 255, 0.02) 0px,
      rgba(0, 217, 255, 0.02) 1px,
      transparent 1px,
      transparent 2px
    );
}

.message {
  display: flex;
  gap: 0.5rem;
  word-break: break-word;
}

.message-system {
  color: var(--neon-blue);
}

.message-user {
  color: var(--white-accent);
}

.message-ai {
  color: var(--data-green);
}

.prefix {
  flex-shrink: 0;
  font-weight: 700;
  color: var(--neon-red);
}

.text {
  flex: 1;
  letter-spacing: 0.02em;
}

.scan-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  animation: scanlines 8s linear infinite;
  z-index: 1;
}

.terminal-input {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--glass-border);
  background: rgba(0, 217, 255, 0.02);
}

.input-field {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--white-accent);
  font-family: 'Courier New', monospace;
  font-size: 14px;
  outline: none;
}

.input-field::placeholder {
  color: var(--white-secondary);
  opacity: 0.5;
}

@keyframes blink {
  0%, 45%, 100% { opacity: 1; }
  50%, 95% { opacity: 0; }
}

@keyframes scanlines {
  0% { transform: translateY(0); }
  100% { transform: translateY(10px); }
}
```

---

## 7. Mobile App: Kinetic Simplification

### 7.1 Gaming Timer (Liquid-Fill Animation + Glitch)

Create `mobile/src/screens/GamingTimerScreen.js`:

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MotiView } from 'moti';

const { width, height } = Dimensions.get('window');

/**
 * Gaming timer with circular liquid-fill animation
 * Drains as time runs out
 * Background glitches when 5 minutes remain
 */
export function GamingTimerScreen({ durationMinutes, onComplete }) {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const fillProgress = useSharedValue(1);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        const newSeconds = prev - 1;
        const newProgress = newSeconds / (durationMinutes * 60);
        fillProgress.value = withTiming(newProgress, { duration: 500 });

        // Glitch when 5 minutes remain
        if (newSeconds === 300) {
          setIsGlitching(true);
          setTimeout(() => setIsGlitching(false), 500);
        }

        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const animatedFillStyle = useAnimatedStyle(() => ({
    height: `${fillProgress.value * 100}%`,
  }));

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 500 }}
      style={[styles.container, isGlitching && styles.glitch]}
    >
      {/* Circular liquid-fill timer */}
      <View style={styles.timerContainer}>
        <View style={styles.liquidOuter}>
          <Animated.View
            style={[styles.liquidFill, animatedFillStyle]}
          />
        </View>

        <View style={styles.timerDisplay}>
          <Text style={styles.timeText}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
          <Text style={styles.timeLabel}>TIME LEFT</Text>
        </View>
      </View>

      {/* Play indicator */}
      <MotiView
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          damping: 10,
          mass: 1,
          stiffness: 100,
        }}
        style={styles.playIndicator}
      >
        <Text style={styles.playText}>🎮 GAMING</Text>
      </MotiView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  glitch: {
    opacity: 0.85,
  },
  timerContainer: {
    position: 'relative',
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liquidOuter: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: '#00D9FF',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  liquidFill: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#00D9FF',
    opacity: 0.3,
  },
  timerDisplay: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  timeText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    fontSize: 12,
    color: '#00D9FF',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 8,
  },
  playIndicator: {
    marginTop: 60,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00D9FF',
  },
  playText: {
    color: '#00D9FF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
```

### 7.2 Evidence Scanning Animation

Create `mobile/src/screens/EvidenceSubmissionScreen.js`:

```jsx
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * Evidence submission with red laser-line scanning effect
 * Shows AI is processing the photo
 */
export function EvidenceScanningAnimation({ imageUri, onComplete }) {
  const scanPosition = useSharedValue(0);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    scanPosition.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      true
    );

    // Simulate 3-second scan
    const timer = setTimeout(() => {
      setIsScanning(false);
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const animatedScanStyle = useAnimatedStyle(() => ({
    top: `${scanPosition.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ANALYZING...</Text>

      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} />

        {isScanning && (
          <Animated.View style={[styles.scanLine, animatedScanStyle]} />
        )}
      </View>

      <Text style={styles.label}>Claude Vision AI Review</Text>
      <Text style={styles.subLabel}>Processing evidence...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF2E5A',
    letterSpacing: 2,
    marginBottom: 30,
  },
  imageContainer: {
    position: 'relative',
    width: 280,
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF2E5A',
    marginBottom: 30,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FF2E5A',
    shadowColor: '#FF2E5A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 1,
  },
  subLabel: {
    fontSize: 12,
    color: '#00D9FF',
    marginTop: 4,
  },
});
```

---

## 8. Feature Integration: Coins, Scores, Energy Cells

### 8.1 Coin Rain Animation (Points Earned)

Create `frontend/src/components/CoinRainEffect.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Particle system: Coins rain down when RP earned
 */
export function CoinRainEffect({ amount, x = window.innerWidth / 2, y = 100 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const coinCount = Math.min(amount / 100, 20); // Max 20 coins

    for (let i = 0; i < coinCount; i++) {
      const coin = document.createElement('div');
      coin.className = 'rain-coin';
      coin.textContent = '💰';
      coin.style.left = x + Math.random() * 100 - 50 + 'px';
      coin.style.top = y + 'px';
      container.appendChild(coin);

      gsap.to(coin, {
        y: window.innerHeight + 100,
        x: (Math.random() - 0.5) * 200,
        opacity: 0,
        rotation: Math.random() * 360 * 2,
        duration: 2.5 + Math.random() * 1,
        ease: 'power2.in',
        onComplete: () => coin.remove(),
      });
    }
  }, [amount, x, y]);

  return <div ref={containerRef} className="coin-rain-container" />;
}
```

**CSS:**
```css
.coin-rain-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
}

.rain-coin {
  position: fixed;
  font-size: 32px;
  will-change: transform;
}
```

### 8.2 Japanese Digit Slam (AI Score)

Create `frontend/src/components/JapaneseDigitSlam.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Large brushed-ink digit that slams onto screen with shake
 */
export function JapaneseDigitSlam({ score }) {
  const digitRef = useRef(null);

  useEffect(() => {
    if (!digitRef.current) return;

    // Slam animation
    gsap.fromTo(
      digitRef.current,
      {
        scale: 0.8,
        y: -50,
        opacity: 0,
        rotation: -15,
      },
      {
        scale: 1,
        y: 0,
        opacity: 1,
        rotation: 0,
        duration: 0.4,
        ease: 'back.out',
        onStart: () => {
          // Screen shake on impact
          gsap.to('body', {
            x: () => (Math.random() - 0.5) * 20,
            y: () => (Math.random() - 0.5) * 20,
            duration: 0.1,
            repeat: 5,
            ease: 'power2.inOut',
            onComplete: () => gsap.set('body', { x: 0, y: 0 }),
          });
        },
      }
    );
  }, [score]);

  return (
    <div ref={digitRef} className="japanese-digit-slam">
      <span className="digit-value">{score}%</span>
    </div>
  );
}
```

**CSS:**
```css
.japanese-digit-slam {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  pointer-events: none;
}

.digit-value {
  font-size: 160px;
  font-weight: 900;
  color: var(--neon-blue);
  text-shadow: 
    0 0 40px var(--neon-blue-glow),
    -3px -3px 0 rgba(0, 0, 0, 0.5),
    3px 3px 0 rgba(255, 255, 255, 0.1);
  font-style: italic;
  letter-spacing: 0.05em;
}
```

## 9. Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create color palette + typography system (kinetic-typography.css)
- [ ] Inject SVG noise + mesh gradients
- [ ] Build MasterController hero asset
- [ ] Install GSAP + Lenis

### Phase 2: Landing Page (Week 2)
- [ ] Implement Lenis smooth scroll
- [ ] Build 7-step horizontal onboarding carousel
- [ ] Add blur-to-focus effect to main heading
- [ ] Create parallax dividers between sections

### Phase 3: Dashboard Redesign (Week 3)
- [ ] Build ChildProgressOrbs (floating + pulsing)
- [ ] Build KineticTaskTable (inline-edit + clip-path expand)
- [ ] Build AITerminalWorkspace (text scramble + scan lines)
- [ ] Integrate MasterController on dashboard

### Phase 4: Mobile Redesign (Week 4)
- [ ] Build GamingTimerScreen (liquid fill + glitch)
- [ ] Build EvidenceScanningAnimation (red laser)
- [ ] Simplify all screens for tactile interaction

### Phase 5: Effects & Polish (Week 5)
- [ ] CoinRainEffect for point animations
- [ ] JapaneseDigitSlam for scores
- [ ] Energy cell representations
- [ ] Performance optimization (60 FPS target)

---

## Success Criteria ✅

- [ ] Blur-to-focus animations on all major headings
- [ ] Horizontal parallax dividers move independently
- [ ] Landing page is smooth Lenis scroll (not standard)
- [ ] 7-step onboarding locks horizontally
- [ ] Dashboard features 3D floating orbs that pulse
- [ ] Tasks expand with clip-path animation to full-screen
- [ ] AI terminal uses text scrambling on responses
- [ ] Mobile timer drains with liquid-fill effect
- [ ] Red laser-line scans evidence photos
- [ ] Points show coin rain when earned
- [ ] AI scores display with slam + screen shake
- [ ] All animations GPU-accelerated (60 FPS minimum)
- [ ] No jank or layout shifts

---

**Status:** Ready for Implementation  
**Architecture:** React 18 + Vite + GSAP + Lenis  
**Performance Target:** 60 FPS all animations  
**Mobile Stack:** React Native + Expo + Moti + Reanimated

This is the complete kinetic storytelling system for Gametime. Let's build the future of family gamification! 🚀
