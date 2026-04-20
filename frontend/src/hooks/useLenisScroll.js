/**
 * Lenis Smooth Scroll Hook
 * Provides buttery-smooth scrolling without standard browser scroll
 */

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * useLenisScroll Hook
 * Initializes smooth scroll in component
 *
 * Usage:
 * ```jsx
 * function App() {
 *   useLenisScroll();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useLenisScroll(options = {}) {
  const {
    duration = 1.2,
    easing = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction = 'vertical',
    gestureDirection = 'vertical',
    smooth = true,
    smoothTouch = false,
    touchMultiplier = 2,
  } = options;

  useEffect(() => {
    const lenis = new Lenis({
      duration,
      easing,
      direction,
      gestureDirection,
      smooth,
      smoothTouch,
      touchMultiplier,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, []);
}

export default useLenisScroll;
