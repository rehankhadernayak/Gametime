/**
 * MasterControllerHiFiAnimation
 * Advanced GSAP + ScrollTrigger animation.
 * - Pins hero section for 2.5x viewport height
 * - Layers fly in with power4.out easing (mechanical snap feel)
 * - Syncs text blur-to-focus with controller assembly
 * - Total timeline: ~1.2s mapped to scroll distance
 */

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Initialize hero pinning and assembly animation
 * @param {HTMLElement} heroContainer - The .landing-hero section
 * @param {HTMLElement} textHeading - The h1.hero-heading element (for blur-to-focus)
 * @param {HTMLElement} svgContainer - The .master-controller-hifi SVG container
 */
export const initializeHeroPinning = (heroContainer, textHeading, svgContainer) => {
  if (!heroContainer || !svgContainer) return;

  // ── Step 1: Calculate pinning distance (2.5x viewport height)
  const viewportHeight = window.innerHeight;
  const pinDuration = viewportHeight * 2.5;

  // ── Step 2: Create main scroll-linked timeline
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: heroContainer,
      start: 'top top',
      end: `+=${pinDuration}`,
      scrub: 1, // Smooth scrubbing (1 = 1 second lag)
      pin: true,
      markers: false, // Set to true for debugging
      onUpdate: (self) => {
        // Optional: log scroll progress (0 to 1)
        // console.log('Progress:', self.getVelocity());
      },
    },
  });

  // ── Step 3: Query all 4 SVG groups
  const groups = {
    outerFrame: svgContainer.querySelector('[data-gsap-group="outer-frame"]'),
    glowingCore: svgContainer.querySelector('[data-gsap-group="glowing-core"]'),
    controlButtons: svgContainer.querySelector('[data-gsap-group="control-buttons"]'),
    energyCells: svgContainer.querySelector('[data-gsap-group="energy-cells"]'),
  };

  // ── Step 4: Initialize all groups to offscreen + invisible
  Object.values(groups).forEach((group) => {
    if (group) {
      gsap.set(group, {
        opacity: 0,
      });
    }
  });

  // Specific starting positions for each layer
  if (groups.outerFrame) {
    gsap.set(groups.outerFrame, { y: -100, x: 0 });
  }
  if (groups.glowingCore) {
    gsap.set(groups.glowingCore, { y: 50, scale: 0.8 });
  }
  if (groups.controlButtons) {
    gsap.set(groups.controlButtons, { y: 100, opacity: 0 });
  }
  if (groups.energyCells) {
    gsap.set(groups.energyCells, { x: 0, y: 80, opacity: 0 });
  }

  // ── Step 5: Build the staggered assembly timeline
  // The entire assembly happens over the scroll distance (0 to 1.0 progress)

  // Phase 1 (0% - 30%): Outer frame flies in
  timeline.to(
    groups.outerFrame,
    {
      opacity: 1,
      y: 0,
      x: 0,
      duration: 1,
      ease: 'power4.out',
    },
    0 // Start at 0% of scroll
  );

  // Phase 2 (15% - 45%): Glowing core expands and snaps
  timeline.to(
    groups.glowingCore,
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1,
      ease: 'power4.out',
    },
    0.15 // Start at 15% of scroll
  );

  // Phase 3 (30% - 60%): Control buttons expand
  timeline.to(
    groups.controlButtons,
    {
      opacity: 0.9,
      y: 0,
      duration: 0.8,
      ease: 'power4.out',
    },
    0.3 // Start at 30% of scroll
  );

  // Phase 4 (50% - 100%): Energy cells materialize
  timeline.to(
    groups.energyCells,
    {
      opacity: 1,
      x: 0,
      y: 0,
      duration: 1.2,
      ease: 'power4.out',
    },
    0.5 // Start at 50% of scroll
  );

  // ── Step 6: Sync text animation (blur-to-focus)
  // Text animates during final 20% of scroll (80% - 100%)
  if (textHeading) {
    gsap.set(textHeading, {
      filter: 'blur(30px)',
      opacity: 0,
      scale: 0.7,
    });

    timeline.to(
      textHeading,
      {
        filter: 'blur(0px)',
        opacity: 1,
        scale: 1.05,
        duration: 0.8,
        ease: 'power3.out',
      },
      0.7 // Start at 70% of scroll (overlap slightly)
    );
  }

  return timeline;
};

/**
 * Hook wrapper for React components
 * Usage:
 * ```jsx
 * const heroRef = useRef(null);
 * const textRef = useRef(null);
 * const svgRef = useRef(null);
 *
 * useEffect(() => {
 *   initializeHeroPinning(heroRef.current, textRef.current, svgRef.current);
 * }, []);
 * ```
 */
export const useHeroPinning = (heroRef, textRef, svgRef) => {
  return () => {
    if (heroRef?.current && svgRef?.current) {
      initializeHeroPinning(heroRef.current, textRef?.current, svgRef.current);
    }
  };
};

export default initializeHeroPinning;
