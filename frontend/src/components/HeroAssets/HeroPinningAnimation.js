/**
 * HeroPinningAnimation
 *
 * Full-viewport hero: pins for 300vh, scroll-driven glass card + copy reveal.
 */

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * @param {HTMLElement} pinWrapper
 * @param {HTMLElement | null} glassCard
 * @param {HTMLElement | null} textContainer
 * @returns {() => void}
 */
export const initializeHeroPinning = (pinWrapper, glassCard, textContainer) => {
  if (!pinWrapper) {
    return () => {};
  }

  ScrollTrigger.getAll().forEach((trigger) => {
    if (trigger.trigger === pinWrapper) {
      trigger.kill();
    }
  });

  if (glassCard) {
    gsap.set(glassCard, {
      opacity: 0,
      scale: 0.7,
      y: 60,
    });
  }

  if (textContainer) {
    gsap.set(textContainer, {
      filter: 'blur(40px)',
      opacity: 0,
      scale: 1.5,
    });
  }

  const questPills = glassCard?.querySelectorAll('.quest-pill');
  if (questPills?.length) {
    gsap.set(questPills, {
      opacity: 0,
      x: 50,
    });
  }

  const progressBar = glassCard?.querySelector('.progress-bar-fill');
  if (progressBar) {
    gsap.set(progressBar, {
      scaleX: 0,
      transformOrigin: 'left center',
    });
  }

  const tl = gsap.timeline();

  if (glassCard) {
    tl.to(
      glassCard,
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.8,
        ease: 'power4.out',
      },
      0
    );
  }

  if (textContainer) {
    tl.to(
      textContainer,
      {
        filter: 'blur(0px)',
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
      },
      0.2
    );
  }

  if (questPills?.length) {
    tl.to(
      questPills,
      {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power3.out',
      },
      0.3
    );
  }

  if (progressBar) {
    tl.to(
      progressBar,
      {
        scaleX: 1,
        duration: 0.6,
        ease: 'power3.inOut',
      },
      0.6
    );
  }

  const st = ScrollTrigger.create({
    trigger: pinWrapper,
    pin: true,
    start: 'top top',
    end: '+=300%',
    animation: tl,
    scrub: 1,
  });

  return () => {
    st.kill();
    tl.kill();
  };
};

export default initializeHeroPinning;
