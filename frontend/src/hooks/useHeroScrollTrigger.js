/**
 * useHeroScrollTrigger
 * Custom hook to initialize ScrollTrigger pinning on hero section.
 * 
 * Usage in HomePage:
 * ```jsx
 * const { heroRef, bindAnimation } = useHeroScrollTrigger();
 * 
 * useEffect(() => {
 *   bindAnimation(heroRef, textRef, svgRef);
 * }, []);
 * 
 * <section ref={heroRef} className="landing-hero">
 *   <div ref={svgRef}>...</div>
 *   <h1 ref={textRef}>...</h1>
 * </section>
 * ```
 */

import { useRef, useCallback } from 'react';
import { initializeHeroPinning } from '../components/HeroAssets/MasterControllerHiFiAnimation';

export const useHeroScrollTrigger = () => {
  const heroRef = useRef(null);

  const bindAnimation = useCallback((hero, text, svg) => {
    if (hero && svg) {
      initializeHeroPinning(hero, text, svg);
    }
  }, []);

  return { heroRef, bindAnimation };
};

export default useHeroScrollTrigger;
