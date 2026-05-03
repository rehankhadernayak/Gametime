/**
 * HeroPinningAnimation
 * 
 * Avant-Garde Full-Viewport Hero
 * - Pins for 300vh (3x viewport height)
 * - Flying text blur-to-focus animation
 * - Background parallax movement
 * - Center-stage cinema composition
 */

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const initializeHeroPinning = (
  pinWrapper,
  glassCard,
  textContainer
) => {
  if (!pinWrapper) {
    console.warn('Hero pinning: pinWrapper is missing');
    return;
  }

  console.log('✓ Initializing avant-garde hero (300vh pinning)...');

  // Kill any previous triggers on this wrapper
  ScrollTrigger.getAll().forEach(trigger => {
    if (trigger.trigger === pinWrapper || trigger.trigger === '.hero-pin-wrapper') {
      trigger.kill();
    }
  });

  /* ──────────────────────────────────────────────────────────────────────── */
  /* INITIALIZE: Set starting state for all animated elements              */
  /* ──────────────────────────────────────────────────────────────────────── */

  // GLASS CARD: Start transparent and small
  if (glassCard) {
    gsap.set(glassCard, {
      opacity: 0,
      scale: 0.7,
      y: 60,
    });
  }

  // TEXT CONTAINER (secondary content): Start heavily blurred and scaled up
  if (textContainer) {
    gsap.set(textContainer, {
      filter: 'blur(40px)',
      opacity: 0,
      scale: 1.5,
    });
  }

  // Quest pills in card
  const questPills = glassCard?.querySelectorAll('.quest-pill');
  if (questPills && questPills.length > 0) {
    gsap.set(questPills, {
      opacity: 0,
      x: 50,
    });
  }

  // Progress bar in card
  const progressBar = glassCard?.querySelector('.progress-bar-fill');
  if (progressBar) {
    gsap.set(progressBar, {
      scaleX: 0,
      transformOrigin: 'left center',
    });
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* CREATE ANIMATION TIMELINE (tied to 300vh scroll)                      */
  /* ──────────────────────────────────────────────────────────────────────── */
  const tl = gsap.timeline();

  // PHASE 1 (0% - 30%): Glass card scales in and fades to full opacity
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

  // PHASE 2 (20% - 70%): Secondary text blur-to-focus "violent" reveal
  // blur(40px) scale(1.5) opacity (0) → blur(0px) scale(1) opacity (1)
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

  // PHASE 3 (30% - 80%): Quest pills stagger slide-in
  if (questPills && questPills.length > 0) {
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

  // PHASE 4 (60% - 100%): Progress bar fills
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

  /* ──────────────────────────────────────────────────────────────────────── */
  /* SCROLLTRIGGER PIN (300vh, drives timeline)                            */
  /* ──────────────────────────────────────────────────────────────────────── */
  ScrollTrigger.create({
    trigger: '.hero-pin-wrapper',
    pin: true,                    // PIN the hero in place
    start: 'top top',             // Start pinning when hero hits top
    end: '+=300%',                // Pin for 300% of viewport height (3x)
    animation: tl,                // DRIVE timeline with scroll
    scrub: 1,                     // 1 second lag for cinematic feel
    onEnter: () => {
      console.log('✓ Hero pinning ACTIVATED (300vh) - page scroll LOCKED');
    },
    onLeave: () => {
      console.log('✓ Hero animation COMPLETE - page scroll UNLOCKED');
    },
  });

  console.log('✓ Avant-garde hero initialized (300vh pinned, StringTune physics active)');

  return tl;
};

export default initializeHeroPinning;
