import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MasterController from '../components/MasterController.jsx';
import { ParentLayout } from '../components/Layouts.jsx';
import './HomePage.css';

gsap.registerPlugin(ScrollTrigger);

/* ── Inline icons ─────────────────────────────────────────────────────── */
function IconArrow() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconAI() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M12 2a5 5 0 0 1 5 5c0 1.5-.66 2.85-1.7 3.77L17 17H7l1.7-6.23A5 5 0 0 1 12 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M9 17v1a3 3 0 0 0 6 0v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
    </svg>
  );
}
function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M12 7v10M9.5 9.5C9.5 8.4 10.6 7 12 7s2.5 1.4 2.5 2.5c0 2.5-5 2.5-5 5 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M9 12.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── NavBar ───────────────────────────────────────────────────────────── */
function NavBar({ auth }) {
  if (auth.token) return null;
  return (
    <nav className="hp-nav" aria-label="Site navigation">
      <div className="hp-nav-inner">
        <Link to="/" className="hp-nav-logo" aria-label="Gametime home">
          Gametime
        </Link>
        <div className="hp-nav-actions">
          <Link to="/login" className="hp-nav-link">Parent Login</Link>
          <Link to="/signup" className="hp-nav-cta">Get Started</Link>
        </div>
      </div>
    </nav>
  );
}

/* ── HomePage ─────────────────────────────────────────────────────────── */
export default function HomePage({ auth }) {
  const heroPinRef = useRef(null);
  const heroStageRef = useRef(null);
  const heroH1Ref = useRef(null);
  const heroSubRef = useRef(null);
  const heroCtaRef = useRef(null);
  const controllerRef = useRef(null);
  const scrollHintRef = useRef(null);
  const bentoRef = useRef(null);
  const parallaxWordRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined;

    const ctx = gsap.context(() => {
      /* ── Master Controller: position layers off-screen at start ──── */
      const layers = {
        outer: '#hp-ctrl-outer-frame',
        core: '#hp-ctrl-core',
        buttons: '#hp-ctrl-buttons',
        cells: '#hp-ctrl-cells',
      };

      gsap.set(layers.outer,   { xPercent: -120, yPercent: -10, rotate: -8,  opacity: 0, transformOrigin: '50% 50%' });
      gsap.set(layers.core,    { yPercent: -140,                opacity: 0, transformOrigin: '50% 50%' });
      gsap.set(layers.buttons, { xPercent: 120,  yPercent: 20,  rotate: 12, opacity: 0, transformOrigin: '50% 50%' });
      gsap.set(layers.cells,   { yPercent: 140,                 opacity: 0, transformOrigin: '50% 50%' });
      gsap.set('#hp-ctrl-telemetry', { scaleX: 0.05, transformOrigin: 'left center' });

      /* ── Hero text: hidden, blurred, BELOW center (emerges upward) ─ */
      gsap.set(heroH1Ref.current,  { autoAlpha: 0, filter: 'blur(20px)', y: 120 });
      gsap.set(heroSubRef.current, { autoAlpha: 0, filter: 'blur(20px)', y: 80 });
      gsap.set(heroCtaRef.current, { autoAlpha: 0, y: 40 });

      /* Controller starts perfectly centered. */
      gsap.set(controllerRef.current, { y: 0, scale: 1, transformOrigin: '50% 50%' });

      /* ── Pinned timeline: 4x viewport scrub (was 2.5x) ───────────── */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroPinRef.current,
          start: 'top top',
          end: '+=400%',          // 4x viewport — buttery slow, impossible to miss
          pin: heroStageRef.current,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      /* Phase 1 (0 → 0.30) — Controller assembles into formation. */
      tl.to(layers.outer,   { xPercent: 0, yPercent: 0, rotate: 0, opacity: 1, ease: 'power3.out', duration: 0.30 }, 0)
        .to(layers.core,    { yPercent: 0,              opacity: 1, ease: 'power3.out', duration: 0.30 }, 0.06)
        .to(layers.buttons, { xPercent: 0, yPercent: 0, rotate: 0, opacity: 1, ease: 'power3.out', duration: 0.30 }, 0.12)
        .to(layers.cells,   { yPercent: 0,              opacity: 1, ease: 'power3.out', duration: 0.30 }, 0.18);

      /* Phase 2 (0.30 → 0.50) — Telemetry charges to full. */
      tl.to('#hp-ctrl-telemetry', { scaleX: 1, ease: 'power1.inOut', duration: 0.20 }, 0.30);

      /* Phase 3 (0.50 → 0.80) — SPATIAL CHOREOGRAPHY:
         Controller scales to 0.8 and translates UP -150px,
         clearing the center stage for the headline to emerge. */
      tl.to(controllerRef.current, {
        y: -150,
        scale: 0.8,
        ease: 'power2.inOut',
        duration: 0.30,
      }, 0.50);

      /* Hide the scroll hint as soon as the user starts scrolling. */
      tl.to(scrollHintRef.current, { autoAlpha: 0, y: 20, duration: 0.10 }, 0);

      /* Phase 4 (0.60 → 0.95) — Hero copy blurs in from the bottom,
         translating UP into the space the controller just vacated. */
      tl.to(heroH1Ref.current,  { autoAlpha: 1, filter: 'blur(0px)', y: 0, ease: 'power3.out', duration: 0.25 }, 0.60)
        .to(heroSubRef.current, { autoAlpha: 1, filter: 'blur(0px)', y: 0, ease: 'power3.out', duration: 0.22 }, 0.72)
        .to(heroCtaRef.current, { autoAlpha: 1, y: 0,                ease: 'power2.out', duration: 0.20 }, 0.82);

      /* ── Horizontal parallax giant word behind the bento grid ────── */
      gsap.fromTo(
        parallaxWordRef.current,
        { xPercent: -30 },
        {
          xPercent: 30,
          ease: 'none',
          scrollTrigger: {
            trigger: bentoRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );

      /* ── Floating Bento cards: each card has a different y offset ── */
      const cards = gsap.utils.toArray('.hp-bento-card');
      const offsets = [120, 60, 180];
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { y: offsets[i] || 100 },
          {
            y: -((offsets[i] || 100) * 0.6),
            ease: 'none',
            scrollTrigger: {
              trigger: bentoRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1,
            },
          }
        );
      });

      /* ── Bento heading kinetic reveal ─────────────────────────────── */
      gsap.fromTo(
        '.hp-bento-heading',
        { autoAlpha: 0, filter: 'blur(20px)', y: 40 },
        {
          autoAlpha: 1,
          filter: 'blur(0px)',
          y: 0,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.hp-bento-heading',
            start: 'top 85%',
            end: 'top 50%',
            scrub: 1,
          },
        }
      );

      /* ── Cinematic footer: massive headline blurs in on approach ──── */
      gsap.fromTo(
        '.hp-cinema-h2',
        { autoAlpha: 0, filter: 'blur(28px)', y: 80, scale: 0.96 },
        {
          autoAlpha: 1,
          filter: 'blur(0px)',
          y: 0,
          scale: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.hp-cinema',
            start: 'top 80%',
            end: 'top 30%',
            scrub: 1,
          },
        }
      );
    }, heroPinRef);

    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 100);

    return () => {
      window.clearTimeout(refreshId);
      ctx.revert();
    };
  }, []);

  return (
    <ParentLayout>
      <div className="hp-root">
        <NavBar auth={auth} />

        <main role="main">
          {/* ── Pinned Hero ────────────────────────────────────────── */}
          <section
            ref={heroPinRef}
            id="hero-pinnable"
            className="hp-pin-section"
            aria-labelledby="hp-hero-heading"
          >
            <div ref={heroStageRef} className="hp-pin-stage">
              {/* Static base layer */}
              <div className="hp-stage-bg" aria-hidden="true" />

              {/* Pulsating ambient glow that sits BEHIND the controller */}
              <div className="hp-ambient-glow" aria-hidden="true">
                <div className="hp-ambient-glow-inner" />
              </div>

              <div className="hp-controller-wrap" aria-hidden="true">
                <MasterController ref={controllerRef} />
              </div>

              <div className="hp-hero-copy">
                <h1
                  id="hp-hero-heading"
                  ref={heroH1Ref}
                  className="hp-hero-h1"
                >
                  Screen time, earned.
                </h1>
                <p ref={heroSubRef} className="hp-hero-sub">
                  Do chores. Get gaming time.
                </p>
                <div ref={heroCtaRef} className="hp-hero-ctas">
                  {auth.token ? (
                    <Link
                      to={auth.role === 'parent' ? '/parent/ai' : '/child/dashboard'}
                      className="hp-btn-primary"
                    >
                      Go to Dashboard <IconArrow />
                    </Link>
                  ) : (
                    <>
                      <Link to="/signup" className="hp-btn-primary">
                        Get Started <IconArrow />
                      </Link>
                      <a href="#bento" className="hp-btn-ghost">
                        How it works
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Scroll indicator at the bottom of the viewport */}
              <div ref={scrollHintRef} className="hp-scroll-hint" aria-hidden="true">
                <span className="hp-scroll-hint-bracket">[</span>
                <span className="hp-scroll-hint-label">Scroll to Initiate</span>
                <span className="hp-scroll-hint-bracket">]</span>
                <span className="hp-scroll-hint-chevron">
                  <IconChevronDown />
                </span>
              </div>
            </div>
          </section>

          {/* ── Bento Grid (12-col) with floating cards + parallax ─── */}
          <section
            id="bento"
            ref={bentoRef}
            className="hp-bento-section"
            aria-label="Features"
          >
            <div
              ref={parallaxWordRef}
              className="hp-parallax-word"
              aria-hidden="true"
            >
              GAMETIME
            </div>

            <div className="hp-bento-inner">
              <h2 className="hp-bento-heading">How it works.</h2>

              <div className="hp-bento-grid">
                <article className="hp-bento-card hp-bento-card--tall">
                  <div className="hp-bento-icon"><IconAI /></div>
                  <div className="hp-bento-label">Step 01</div>
                  <h3 className="hp-bento-title">AI Evidence</h3>
                  <p className="hp-bento-desc">Snap a photo. Our AI verifies the chore is done.</p>
                  <div className="hp-bento-progress">
                    <div className="hp-bento-progress-fill" style={{ width: '78%' }} />
                  </div>
                </article>

                <article className="hp-bento-card">
                  <div className="hp-bento-icon"><IconCoin /></div>
                  <div className="hp-bento-label">Step 02</div>
                  <h3 className="hp-bento-title">Earn Points</h3>
                  <p className="hp-bento-desc">Approved chores convert to Gold &amp; RP.</p>
                  <div className="hp-bento-progress">
                    <div className="hp-bento-progress-fill" style={{ width: '54%' }} />
                  </div>
                </article>

                <article className="hp-bento-card hp-bento-card--wide">
                  <div className="hp-bento-icon"><IconShield /></div>
                  <div className="hp-bento-label">Step 03</div>
                  <h3 className="hp-bento-title">Parent Controls</h3>
                  <p className="hp-bento-desc">Pause sessions and adjust limits in one tap.</p>
                  <div className="hp-bento-progress">
                    <div className="hp-bento-progress-fill" style={{ width: '92%' }} />
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* ── Cinematic dark footer ──────────────────────────────── */}
          {!auth.token && (
            <section className="hp-cinema" aria-labelledby="hp-cinema-heading">
              <div className="hp-cinema-grid" aria-hidden="true" />
              <div className="hp-cinema-glow" aria-hidden="true" />
              <div className="hp-cinema-inner">
                <h2
                  id="hp-cinema-heading"
                  className="hp-cinema-h2"
                >
                  Ready to make<br />gaming fair?
                </h2>
                <Link to="/signup" className="hp-cinema-cta">
                  Create Free Account <IconArrow />
                </Link>
                <p className="hp-cinema-subnote">
                  No credit card. Cancel anytime.
                </p>
              </div>
            </section>
          )}

          {/* ── Footer meta ────────────────────────────────────────── */}
          <footer className="hp-footer" role="contentinfo">
            <div className="hp-footer-inner">
              <span className="hp-footer-logo">Gametime</span>
              <span className="hp-footer-meta">© 2026 · Singapore</span>
            </div>
          </footer>
        </main>
      </div>
    </ParentLayout>
  );
}
