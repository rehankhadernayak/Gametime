import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * SmoothScrollProvider
 * Wraps the app with a Lenis-driven, momentum-based scroller.
 * Drives GSAP ScrollTrigger from Lenis ticks so pinned sections stay
 * perfectly synchronized with the weighted scroll.
 */
export default function SmoothScrollProvider({ children, enabled = true }) {
  useEffect(() => {
    if (!enabled) return undefined;

    // Respect reduced-motion preference: skip Lenis entirely.
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined;

    const lenis = new Lenis({
      duration: 1.2,                     // weighted, cinematic feel
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    // Sync Lenis with GSAP ticker — single rAF loop, no jank.
    function raf(time) {
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Tell ScrollTrigger to update on every Lenis scroll event.
    lenis.on('scroll', ScrollTrigger.update);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [enabled]);

  return children;
}
