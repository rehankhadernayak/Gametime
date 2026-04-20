/**
 * Parent Onboarding Kinetic Component
 * 7-step horizontal carousel with blur-to-focus animations
 * Reference: String Tune kinetic storytelling
 */

import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/kinetic-onboarding.css';

gsap.registerPlugin(ScrollTrigger);

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: 'Welcome to Gametime',
    subtitle: 'Turn chores into gaming rewards',
    description: 'Enable screen time as a reward for completing tasks, homework, and family milestones.',
    color: '#1a1a2e',
    accentTop: '#00D9FF',
    accentBot: '#FF2E5A',
  },
  {
    step: 2,
    title: 'Step 1: Create Your Children',
    subtitle: 'Add kids aged 6–13 to your family',
    description: 'Set up profiles for each child with personalized task preferences and gaming credits.',
    color: '#16213e',
    accentTop: '#FF2E5A',
    accentBot: '#00D9FF',
  },
  {
    step: 3,
    title: 'Step 2: Set Tasks',
    subtitle: 'Define chores, homework, and milestones',
    description: 'Create custom tasks like "clean bedroom" or "complete math assignment" with point values.',
    color: '#0f3460',
    accentTop: '#00D9FF',
    accentBot: '#FF2E5A',
  },
  {
    step: 4,
    title: 'Step 3: AI Reviews Evidence',
    subtitle: 'Claude Vision verifies completions',
    description: 'Children submit photos or videos. AI instantly gives a confidence score before parent approval.',
    color: '#1a1a2e',
    accentTop: '#FF2E5A',
    accentBot: '#00D9FF',
  },
  {
    step: 5,
    title: 'Step 4: Approve & Reward',
    subtitle: 'Give final approval and award points',
    description: 'Review AI scores, approve or request re-submission, then award Reward Points (RP).',
    color: '#16213e',
    accentTop: '#00D9FF',
    accentBot: '#FF2E5A',
  },
  {
    step: 6,
    title: 'Step 5: Gaming Sessions',
    subtitle: 'Children redeem time blocks',
    description: 'Kids use RP to unlock 30, 60, or 90-minute gaming sessions on approved platforms.',
    color: '#0f3460',
    accentTop: '#FF2E5A',
    accentBot: '#00D9FF',
  },
  {
    step: 7,
    title: 'Step 6: Manage Rewards',
    subtitle: 'Create custom unlockables and gift cards',
    description: 'Set up exclusive rewards like gift cards, allowance, or special privileges.',
    color: '#1a1a2e',
    accentTop: '#00D9FF',
    accentBot: '#FF2E5A',
  },
];

/**
 * ParentOnboardingKinetic Component
 * Horizontal slide-and-lock carousel with blur-to-focus
 *
 * @param {Object} props - Component props
 * @param {Function} props.onComplete - Callback when onboarding finishes
 * @param {boolean} props.showSkip - Whether to show skip button (default: false)
 */
export function ParentOnboardingKinetic({ onComplete, showSkip = false }) {
  const [currentStep, setCurrentStep] = useState(0);
  const carouselRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    // Slide carousel horizontally
    gsap.to(carousel, {
      x: () => -(currentStep * window.innerWidth),
      duration: 0.8,
      ease: 'power2.inOut',
    });
  }, [currentStep]);

  useEffect(() => {
    if (!titleRef.current) return;

    // Blur-to-focus effect on title
    gsap.fromTo(
      titleRef.current,
      {
        filter: 'blur(10px)',
        opacity: 0.5,
        scale: 0.95,
      },
      {
        filter: 'blur(0px)',
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
      }
    );
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDotClick = (idx) => {
    setCurrentStep(idx);
  };

  const currentData = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="onboarding-kinetic-container">
      {/* Gradient background that transitions per step */}
      <div
        className="onboarding-bg"
        style={{
          background: `linear-gradient(135deg, ${currentData.color} 0%, rgba(0, 0, 0, 0.5) 100%)`,
          transition: 'background 0.6s ease',
        }}
      />

      {/* Main content section */}
      <div className="onboarding-content">
        {/* Step indicator on left */}
        <div className="onboarding-step-badge">
          <span className="badge-number">{currentStep + 1}</span>
          <span className="badge-divider" />
          <span className="badge-total">{ONBOARDING_STEPS.length}</span>
        </div>

        {/* Main carousel */}
        <div className="onboarding-carousel-wrapper">
          <div className="onboarding-carousel" ref={carouselRef}>
            {ONBOARDING_STEPS.map((step, idx) => (
              <div key={idx} className="onboarding-slide" style={{ width: '100vw' }}>
                <div className="slide-inner">
                  {/* Title with blur-to-focus */}
                  <h1 ref={idx === currentStep ? titleRef : null} className="slide-title">
                    {step.title}
                  </h1>

                  {/* Subtitle */}
                  <p className="slide-subtitle">{step.subtitle}</p>

                  {/* Description */}
                  <p className="slide-description">{step.description}</p>

                  {/* Visual indicator: gradient bar */}
                  <div className="slide-accent-bar">
                    <div
                      className="accent-fill"
                      style={{
                        background: `linear-gradient(90deg, ${step.accentTop} 0%, ${step.accentBot} 100%)`,
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation bar at bottom */}
      <div className="onboarding-nav-bar">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="nav-btn nav-btn-prev"
          aria-label="Previous step"
        >
          ← Back
        </button>

        {/* Progress dots */}
        <div className="progress-dots-container">
          {ONBOARDING_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`progress-dot ${idx === currentStep ? 'active' : ''}`}
              aria-label={`Go to step ${idx + 1}`}
              aria-pressed={idx === currentStep}
            />
          ))}
        </div>

        {/* Next/Complete button */}
        <button
          onClick={handleNext}
          className="nav-btn nav-btn-next"
          aria-label={currentStep === ONBOARDING_STEPS.length - 1 ? 'Start' : 'Next step'}
        >
          {currentStep === ONBOARDING_STEPS.length - 1 ? 'Start →' : 'Next →'}
        </button>
      </div>

      {/* Optional skip button */}
      {showSkip && (
        <button
          onClick={() => onComplete?.()}
          className="skip-button"
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      )}
    </div>
  );
}

export default ParentOnboardingKinetic;
