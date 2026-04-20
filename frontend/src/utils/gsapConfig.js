/**
 * GSAP Configuration & Animation Utilities
 * Centralized motion functions for kinetic effects
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';

// Register plugins
gsap.registerPlugin(ScrollTrigger, TextPlugin);

/**
 * Blur-to-Focus Scroll Effect
 * Headers start blurred (30px) and scaled down (0.5)
 * Animate to sharp (0px blur) and scaled up (1.1) at center-third of viewport
 *
 * @param {HTMLElement} element - The element to animate
 * @param {Object} options - Configuration options
 * @param {number} options.blurStart - Initial blur amount (default: 30)
 * @param {number} options.blurEnd - Final blur amount (default: 0)
 * @param {number} options.scaleStart - Initial scale (default: 0.5)
 * @param {number} options.scaleEnd - Final scale (default: 1.1)
 * @param {HTMLElement} options.trigger - Trigger element (default: same as element)
 */
export function createBlurToFocusEffect(element, options = {}) {
  const {
    blurStart = 30,
    blurEnd = 0,
    scaleStart = 0.5,
    scaleEnd = 1.1,
    trigger = element,
    markers = false,
  } = options;

  if (!element) return;

  gsap.set(element, {
    filter: `blur(${blurStart}px)`,
    scale: scaleStart,
    opacity: 0.3,
  });

  ScrollTrigger.create({
    trigger,
    start: 'top center',
    end: 'center center',
    markers,
    onUpdate: (self) => {
      const blurValue = gsap.utils.interpolate(blurStart, blurEnd, self.progress);
      const scaleValue = gsap.utils.interpolate(scaleStart, scaleEnd, self.progress);
      const opacityValue = 0.3 + self.progress * 0.7;

      gsap.to(element, {
        filter: `blur(${blurValue}px)`,
        scale: scaleValue,
        opacity: opacityValue,
        duration: 0,
        overwrite: 'auto',
      });
    },
  });
}

/**
 * Horizontal Parallax Divider
 * Large background text moves at different speed than foreground
 *
 * @param {HTMLElement} bgElement - Background element
 * @param {HTMLElement} fgElement - Foreground element
 * @param {number} speedMultiplier - Speed ratio (default: 0.5)
 */
export function createParallaxDivider(bgElement, fgElement, speedMultiplier = 0.5) {
  if (!bgElement || !fgElement) return;

  gsap.to(bgElement, {
    y: () => window.innerHeight * -0.3,
    scrollTrigger: {
      trigger: bgElement,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      markers: false,
    },
  });

  gsap.to(fgElement, {
    y: () => window.innerHeight * -0.6 * speedMultiplier,
    scrollTrigger: {
      trigger: fgElement,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      markers: false,
    },
  });
}

/**
 * Text Scrambling Effect
 * Randomizes characters during animation, then settles to final text
 * Creates terminal/digital aesthetic
 *
 * @param {HTMLElement} element - Target element
 * @param {string} finalText - Text to settle on
 * @param {number} duration - Animation duration in seconds (default: 1)
 */
export function createTextScramble(element, finalText, duration = 1) {
  if (!element) return;

  const chars =
    '01アイウエオカキクケコサシスセソタチツテト!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
  let iteration = 0;
  const frameCount = duration * 100; // Rough estimate

  const scrambleInterval = setInterval(() => {
    iteration += 1;
    const progress = iteration / frameCount;

    if (progress >= 1) {
      element.textContent = finalText;
      clearInterval(scrambleInterval);
      return;
    }

    const scrambledText = finalText
      .split('')
      .map((char, idx) => {
        if (idx < Math.floor(Math.random() * progress * finalText.length)) {
          return finalText[idx];
        }
        return chars[Math.floor(Math.random() * chars.length)];
      })
      .join('');

    element.textContent = scrambledText;
  }, 30); // ~33ms per frame (30 FPS for scramble effect)
}

/**
 * Screen-Shake Effect
 * Creates impact feedback for success/failure moments
 *
 * @param {number} intensity - Shake intensity (default: 10)
 * @param {number} duration - Duration in seconds (default: 0.3)
 */
export function createScreenShake(intensity = 10, duration = 0.3) {
  const body = document.body;

  gsap.to(window, {
    duration,
    onUpdate() {
      const x = (Math.random() - 0.5) * intensity;
      const y = (Math.random() - 0.5) * intensity;
      gsap.set(body, { x, y });
    },
    onComplete() {
      gsap.set(body, { x: 0, y: 0 });
    },
  });
}

/**
 * Pixel-Gate Transition
 * Reveals image in pixelated grid blocks
 * Staggered appearance for dramatic effect
 *
 * @param {HTMLElement} imageElement - Image element to reveal
 * @param {number} duration - Total animation duration (default: 0.8)
 * @param {number} gridSize - Grid dimension (8x8, 16x16, etc)
 */
export function createPixelGateTransition(
  imageElement,
  duration = 0.8,
  gridSize = 8
) {
  if (!imageElement) return;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${gridSize} ${gridSize}`);
  svg.style.display = 'none';

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const rect = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'rect'
      );
      rect.setAttribute('x', i);
      rect.setAttribute('y', j);
      rect.setAttribute('width', '1');
      rect.setAttribute('height', '1');
      rect.setAttribute('fill', 'white');
      svg.appendChild(rect);
    }
  }

  document.body.appendChild(svg);

  const pixels = svg.querySelectorAll('rect');
  const pixelArray = Array.from(pixels);

  // Randomize pixel reveal order
  pixelArray.sort(() => Math.random() - 0.5);

  pixelArray.forEach((pixel, idx) => {
    gsap.to(pixel, {
      attr: { opacity: 0 },
      duration: duration * 0.7,
      delay: (idx / pixelArray.length) * duration * 0.5,
      ease: 'power2.out',
    });
  });

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(svg);
  }, duration * 1000 + 500);
}

/**
 * Staggered List Animation
 * Animates list items with cascade effect
 *
 * @param {HTMLElement[]} elements - Array of elements to animate
 * @param {number} staggerDelay - Delay between items (default: 0.1)
 * @param {Object} animConfig - GSAP animation config
 */
export function createStaggeredAnimation(
  elements,
  staggerDelay = 0.1,
  animConfig = {}
) {
  if (!elements || elements.length === 0) return;

  const defaultConfig = {
    opacity: 1,
    y: 0,
    rotateX: 0,
    duration: 0.8,
    ease: 'back.out',
    stagger: staggerDelay,
  };

  const finalConfig = { ...defaultConfig, ...animConfig };

  gsap.to(elements, finalConfig);
}

/**
 * Magnetic Button Effect
 * Element follows cursor within radius
 *
 * @param {HTMLElement} element - Button element
 * @param {number} radius - Magnetic radius in pixels (default: 10)
 * @param {number} stiffness - Spring stiffness (default: 100)
 */
export function createMagneticEffect(element, radius = 10, stiffness = 100) {
  if (!element) return;

  const bounds = element.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;

  const handleMouseMove = (e) => {
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < radius) {
      const angle = Math.atan2(dy, dx);
      const force = (radius - distance) / radius;
      const moveX = Math.cos(angle) * force * (radius / 2);
      const moveY = Math.sin(angle) * force * (radius / 2);

      gsap.to(element, {
        x: moveX,
        y: moveY,
        duration: 0.3,
        ease: `power${stiffness / 50}.out`,
        overwrite: 'auto',
      });
    } else {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const handleMouseLeave = () => {
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: 0.4,
      ease: 'power2.out',
    });
  };

  window.addEventListener('mousemove', handleMouseMove);
  element.addEventListener('mouseleave', handleMouseLeave);

  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    element.removeEventListener('mouseleave', handleMouseLeave);
  };
}

/**
 * Scroll-Triggered Entry Animation
 * Element animates when it enters viewport
 *
 * @param {HTMLElement} element - Target element
 * @param {Object} config - ScrollTrigger + animation config
 */
export function createScrollTriggerAnimation(element, config = {}) {
  if (!element) return;

  const {
    start = 'top 80%',
    end = 'top 20%',
    scrub = false,
    once = true,
    markers = false,
    ...animConfig
  } = config;

  const defaults = {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'back.out',
  };

  gsap.to(element, {
    ...defaults,
    ...animConfig,
    scrollTrigger: {
      trigger: element,
      start,
      end,
      scrub,
      once,
      markers,
      onEnter: () => {
        gsap.to(element, {
          ...defaults,
          ...animConfig,
        });
      },
    },
  });
}

/**
 * Clear all GSAP animations and ScrollTriggers
 * Useful for cleanup
 */
export function clearAllAnimations() {
  gsap.globalTimeline.clear();
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
}

/**
 * Utility to check if motion is preferred
 * Returns true if user prefers animations, false for reduced motion
 */
export function prefersMotion() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Utility to check if device supports GPU acceleration
 */
export function supportsGPU() {
  const canvas = document.createElement('canvas');
  const gl =
    canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return !!gl;
}

export default {
  createBlurToFocusEffect,
  createParallaxDivider,
  createTextScramble,
  createScreenShake,
  createPixelGateTransition,
  createStaggeredAnimation,
  createMagneticEffect,
  createScrollTriggerAnimation,
  clearAllAnimations,
  prefersMotion,
  supportsGPU,
};
