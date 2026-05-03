/**
 * MasterControllerAnimation
 * GSAP animation logic for SVG groups.
 * Runs on component mount, no dependencies.
 */

import gsap from 'gsap';

/**
 * Animate the Master Controller SVG groups.
 * @param {HTMLElement} container - The SVG container element
 */
export const animateMasterController = (container) => {
  if (!container) return;

  const timeline = gsap.timeline();

  // Define stagger times and initial positions
  const groups = [
    { selector: '[data-gsap-group="outer-frame"]', delay: 0, startX: 50, startY: -50 },
    { selector: '[data-gsap-group="screen-core"]', delay: 0.1, startX: 0, startY: -40 },
    { selector: '[data-gsap-group="buttons"]', delay: 0.2, startX: 0, startY: 60 },
    { selector: '[data-gsap-group="left-wing"]', delay: 0.3, startX: -80, startY: 0 },
    { selector: '[data-gsap-group="right-wing"]', delay: 0.3, startX: 80, startY: 0 },
  ];

  // Reset all groups to starting state
  groups.forEach(({ selector, startX, startY }) => {
    const element = container.querySelector(selector);
    if (element) {
      gsap.set(element, {
        opacity: 0,
        x: startX,
        y: startY,
      });
    }
  });

  // Animate each group in sequence
  groups.forEach(({ selector, delay }) => {
    const element = container.querySelector(selector);
    if (element) {
      timeline.to(
        element,
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 1.2,
          ease: 'elastic.out(1, 0.5)',
        },
        delay
      );
    }
  });

  return timeline;
};

/**
 * Hook-friendly wrapper: call this from useEffect
 * @param {React.RefObject} containerRef - Ref to SVG container
 */
export const initializeMasterControllerAnimation = (containerRef) => {
  if (containerRef?.current) {
    return animateMasterController(containerRef.current);
  }
};

export default animateMasterController;
