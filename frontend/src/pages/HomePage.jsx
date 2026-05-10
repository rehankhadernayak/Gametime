import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import ScrollTrigger from 'gsap/ScrollTrigger';
import HeroGlassmorphicCard from '../components/HeroAssets/HeroGlassmorphicCard';
import { ParallaxDivider } from '../components/ParallaxDivider';
import { initializeHeroPinning } from '../components/HeroAssets/HeroPinningAnimation';
import LayoutLanding from '../layouts/LayoutLanding';
import '../styles/kinetic-landing-hero.css';
import '../styles/hero-glassmorphic.css';
import './HomePage.css';

gsap.registerPlugin(ScrollTrigger);

/* ── Inline SVG Icons ───────────────────────────────────────────────────── */
function IconQuest() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconShieldCheck() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12.5l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const HOW_IT_WORKS = [
  {
    number: '01',
    icon: <IconQuest />,
    title: 'Set Quests',
    description:
      'Parents create tasks - clean your room, finish homework, read for 20 minutes - each worth a set number of RP points.',
  },
  {
    number: '02',
    icon: <IconCamera />,
    title: 'Kids Submit Proof',
    description: 'Children complete the quest and upload a photo or short video as evidence directly from the app.',
  },
  {
    number: '03',
    icon: <IconShieldCheck />,
    title: 'AI Reviews, Parent Approves',
    description:
      'Claude Vision analyses the evidence for completeness. Parent gets a smart summary and one-tap approve - child earns their RP.',
  },
];

function scrollToHowItWorks() {
  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── NavBar ─────────────────────────────────────────────────────────────── */
function NavBar({ auth }) {
  if (auth.token) return null;
  return (
    <nav className="hp-nav" aria-label="Site navigation">
      <div className="hp-nav-inner">
        <Link to="/" className="hp-nav-logo hp-load-reveal hp-motion-hover" aria-label="Gametime home">
          Gametime
        </Link>
        <div className="hp-nav-actions">
          <Link to="/login" className="hp-nav-link hp-load-reveal hp-motion-hover">
            Parent Login
          </Link>
          <Link to="/signup" className="hp-nav-cta hp-load-reveal hp-motion-hover">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

const HOVER_EASE = 'expo.out';
const HOVER_IN = 0.65;
const HOVER_OUT = 0.75;

/* ── HomePage ───────────────────────────────────────────────────────────── */
export default function HomePage({ auth }) {
  const navigate = useNavigate();
  const pageRootRef = useRef(null);
  const pinWrapperRef = useRef(null);
  const glassCardWrapperRef = useRef(null);
  const textHeadingRef = useRef(null);

  useEffect(() => {
    if (!pinWrapperRef.current || !glassCardWrapperRef.current || !textHeadingRef.current) {
      return undefined;
    }
    return initializeHeroPinning(
      pinWrapperRef.current,
      glassCardWrapperRef.current,
      textHeadingRef.current
    );
  }, []);

  useGSAP(
    () => {
      const root = pageRootRef.current;
      if (!root) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(root.querySelectorAll('.hp-load-reveal'), { opacity: 1, y: 0, clearProps: 'all' });
        return;
      }

      gsap.from('.hp-load-reveal', {
        opacity: 0,
        y: 28,
        duration: 0.8,
        stagger: 0.09,
        ease: 'power3.out',
        clearProps: 'transform',
      });
    },
    { scope: pageRootRef }
  );

  useGSAP(
    () => {
      const root = pageRootRef.current;
      if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return undefined;
      }

      const bentoSection = root.querySelector('.hp-features-bento');
      const bgText = root.querySelector('.massive-bg-text');
      const bentoCards = root.querySelectorAll('.bento-card');

      if (!bentoSection) return undefined;

      if (bgText) {
        gsap.fromTo(
          bgText,
          { x: '10%' },
          {
            x: '-50%',
            ease: 'none',
            scrollTrigger: {
              trigger: bentoSection,
              start: 'top center',
              end: 'bottom center',
              scrub: 1,
            },
          }
        );
      }

      bentoCards.forEach((card) => {
        const speed = parseFloat(card.dataset.speed) || 1;
        gsap.to(card, {
          y: 100 * (speed - 1),
          ease: 'none',
          scrollTrigger: {
            trigger: bentoSection,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        });
      });

      const dividerInner = root.querySelector('.hp-parallax-divider-inner');
      if (dividerInner) {
        gsap.from(dividerInner.querySelectorAll('.hp-scroll-reveal'), {
          opacity: 0,
          y: 32,
          duration: 0.85,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: dividerInner,
            start: 'top 86%',
            toggleActions: 'play none none none',
          },
        });
      }

      const howSection = root.querySelector('.hp-how');
      if (howSection) {
        const howHeader = howSection.querySelector('.hp-section-header');
        if (howHeader) {
          gsap.from(howHeader.querySelectorAll('.hp-scroll-reveal'), {
            opacity: 0,
            y: 28,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: howSection,
              start: 'top 82%',
              toggleActions: 'play none none none',
            },
          });
        }
        const howGrid = howSection.querySelector('.hp-how-grid');
        if (howGrid) {
          gsap.from(howGrid.querySelectorAll('.hp-how-card'), {
            opacity: 0,
            y: 36,
            duration: 0.8,
            stagger: 0.11,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: howGrid,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          });
        }
      }

      const social = root.querySelector('.hp-social-proof');
      if (social) {
        gsap.from(social.querySelectorAll('.hp-social-label, .hp-social-pill'), {
          opacity: 0,
          y: 24,
          duration: 0.75,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: social,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      }

      const featIntro = bentoSection.querySelector('.hp-section-header');
      if (featIntro) {
        gsap.from(featIntro.querySelectorAll('.hp-scroll-reveal'), {
          opacity: 0,
          y: 30,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: featIntro,
            start: 'top 86%',
            toggleActions: 'play none none none',
          },
        });
      }

      const cta = root.querySelector('.hp-cta-section');
      if (cta) {
        gsap.from(cta.querySelectorAll('.hp-scroll-reveal'), {
          opacity: 0,
          y: 28,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cta,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      }
    },
    { scope: pageRootRef }
  );

  useGSAP(
    (ctx, contextSafe) => {
      const root = pageRootRef.current;
      if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return undefined;
      }

      const nodes = root.querySelectorAll('.hp-motion-hover');
      const disposers = [];

      nodes.forEach((el) => {
        const onEnter = contextSafe(() => {
          gsap.to(el, {
            y: -5,
            scale: 1.014,
            duration: HOVER_IN,
            ease: HOVER_EASE,
            overwrite: 'auto',
          });
        });
        const onLeave = contextSafe(() => {
          gsap.to(el, {
            y: 0,
            scale: 1,
            duration: HOVER_OUT,
            ease: 'power3.out',
            overwrite: 'auto',
          });
        });

        el.addEventListener('pointerenter', onEnter);
        el.addEventListener('pointerleave', onLeave);
        disposers.push(() => {
          el.removeEventListener('pointerenter', onEnter);
          el.removeEventListener('pointerleave', onLeave);
        });
      });

      return () => {
        disposers.forEach((fn) => fn());
      };
    },
    { scope: pageRootRef }
  );

  return (
    <LayoutLanding>
      <div ref={pageRootRef} className="hp-root">
        <NavBar auth={auth} />

        <main role="main">
          <div ref={pinWrapperRef} className="hero-pin-wrapper hp-hero-pin">
            <div className="hp-hero-bg-word hp-load-reveal" string="parallax" string-parallax="0.8" aria-hidden="true">
              GAMETIME
            </div>

            <div ref={glassCardWrapperRef} className="hp-hero-glass-wrap">
              <HeroGlassmorphicCard />
            </div>

            <div className="hp-hero-fly hp-hero-fly--left hp-load-reveal" string="parallax" string-parallax="0.85">
              <h2 className="hp-hero-fly-title hp-hero-fly-title--cyan">Screen Time</h2>
            </div>

            <div className="hp-hero-fly hp-hero-fly--right hp-load-reveal" string="parallax" string-parallax="-0.85">
              <h2 className="hp-hero-fly-title hp-hero-fly-title--magenta">Earned.</h2>
            </div>

            <div ref={textHeadingRef} className="hp-hero-text-pane">
              <p className="hp-hero-lede">
                Gametime helps Singapore families turn gaming into a reward kids actually work for. Set quests, review
                evidence with AI, and let children redeem real gift cards.
              </p>

              <div className="hero-cta-group">
                {auth.token ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(auth.role === 'parent' ? '/parent/ai' : '/child/dashboard')
                    }
                    className="hero-cta-primary hp-motion-hover"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => navigate('/signup')} className="hero-cta-primary hp-motion-hover">
                      Get Started Free
                    </button>
                    <button type="button" onClick={scrollToHowItWorks} className="hero-cta-secondary hp-motion-hover">
                      See How It Works
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <ParallaxDivider
            text="CONCENTRATE"
            bgSpeedRatio={0.3}
            fgSpeedRatio={0.6}
            accentColor="var(--neon-blue)"
          >
            <div className="hp-parallax-divider-inner">
              <h2 className="hp-scroll-reveal hp-divider-heading">Why Gametime Works</h2>
            </div>
          </ParallaxDivider>

          <section className="hp-social-proof" aria-label="Social proof">
            <div className="hp-social-proof-inner">
              <span className="hp-social-label">Trusted by Singapore families</span>
              <div className="hp-social-pills">
                <div className="hp-social-pill hp-motion-hover">
                  <span className="hp-pill-number">2,000+</span>
                  <span className="hp-pill-label">tasks completed</span>
                </div>
                <div className="hp-social-divider" aria-hidden="true" />
                <div className="hp-social-pill hp-motion-hover">
                  <span className="hp-pill-number">500+</span>
                  <span className="hp-pill-label">families</span>
                </div>
                <div className="hp-social-divider" aria-hidden="true" />
                <div className="hp-social-pill hp-motion-hover">
                  <span className="hp-pill-number">4.9★</span>
                  <span className="hp-pill-label">rating</span>
                </div>
              </div>
            </div>
          </section>

          <section id="how-it-works" className="hp-how" aria-labelledby="hp-how-heading">
            <div className="hp-section-inner">
              <div className="hp-section-header">
                <div className="hp-section-kicker hp-scroll-reveal">How It Works</div>
                <h2 id="hp-how-heading" className="hp-section-h2 hp-scroll-reveal">
                  Simple for parents.
                  <br />
                  Exciting for kids.
                </h2>
              </div>

              <div className="hp-how-grid">
                {HOW_IT_WORKS.map((step) => (
                  <article key={step.number} className="hp-how-card hp-motion-hover">
                    <div className="hp-how-number" aria-hidden="true">
                      {step.number}
                    </div>
                    <div className="hp-how-icon">{step.icon}</div>
                    <h3 className="hp-how-title">{step.title}</h3>
                    <p className="hp-how-desc">{step.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="hp-features-bento" aria-labelledby="hp-features-heading">
            <div className="massive-bg-text" aria-hidden="true">
              EARN YOUR TIME
            </div>

            <div className="hp-section-inner hp-features-bento-inner">
              <div className="hp-section-header">
                <div className="hp-section-kicker hp-scroll-reveal">Features</div>
                <h2 id="hp-features-heading" className="hp-section-h2 hp-scroll-reveal">
                  Everything a family needs.
                </h2>
              </div>

              <div className="bento-grid">
                <article className="bento-card bento-card--cyan hp-motion-hover" data-speed="0.8">
                  <div className="bento-emoji" aria-hidden="true">
                    📋
                  </div>
                  <h3 className="bento-card-title">Set Quests</h3>
                  <p className="bento-card-desc">
                    Parents create tasks - clean your room, finish homework, read for 20 minutes - each worth a set
                    number of RP points.
                  </p>
                </article>

                <article className="bento-card bento-card--purple bento-card--offset hp-motion-hover" data-speed="1.2">
                  <div className="bento-emoji" aria-hidden="true">
                    📸
                  </div>
                  <h3 className="bento-card-title">Kids Submit Proof</h3>
                  <p className="bento-card-desc">
                    Children complete the quest and upload a photo or short video as evidence directly from the app.
                  </p>
                </article>

                <article className="bento-card bento-card--blue hp-motion-hover" data-speed="1.5">
                  <div className="bento-emoji" aria-hidden="true">
                    🤖
                  </div>
                  <h3 className="bento-card-title">AI Reviews, Parent Approves</h3>
                  <p className="bento-card-desc">
                    Claude Vision analyses the evidence for completeness. Parent gets a smart summary and one-tap
                    approve - child earns their RP.
                  </p>
                </article>

                <article className="bento-card bento-card--gradient bento-card--offset hp-motion-hover" data-speed="0.9">
                  <div className="bento-emoji" aria-hidden="true">
                    🎁
                  </div>
                  <h3 className="bento-card-title">Real Rewards</h3>
                  <p className="bento-card-desc">
                    Kids redeem GP for actual gift cards - Roblox, Steam, Razer Gold - delivered instantly.
                  </p>
                </article>
              </div>
            </div>
          </section>

          {!auth.token && (
            <section className="hp-cta-section" aria-labelledby="hp-cta-heading">
              <div className="hp-cta-bg" aria-hidden="true">
                <div className="hp-cta-orb hp-cta-orb--1" />
                <div className="hp-cta-orb hp-cta-orb--2" />
              </div>
              <div className="hp-cta-inner">
                <h2 id="hp-cta-heading" className="hp-cta-h2 hp-scroll-reveal">
                  Ready to make gaming fair?
                </h2>
                <p className="hp-cta-sub hp-scroll-reveal">Join Singapore families already using Gametime.</p>
                <Link to="/signup" className="hp-btn-white hp-btn-lg hp-scroll-reveal hp-motion-hover">
                  Create Free Account
                </Link>
              </div>
            </section>
          )}

          <footer className="hp-footer" role="contentinfo">
            <div className="hp-footer-inner">
              <div className="hp-footer-brand">
                <span className="hp-footer-logo">Gametime</span>
                <p className="hp-footer-tagline">Screen time, earned. Singapore's family gaming platform.</p>
              </div>

              <nav className="hp-footer-links" aria-label="Footer navigation">
                <div className="hp-footer-col">
                  <div className="hp-footer-col-title">Product</div>
                  <Link to="/signup" className="hp-footer-link hp-motion-hover">
                    Get Started
                  </Link>
                  <Link to="/login" className="hp-footer-link hp-motion-hover">
                    Parent Login
                  </Link>
                  <Link to="/child-login" className="hp-footer-link hp-motion-hover">
                    Child Login
                  </Link>
                </div>
                <div className="hp-footer-col">
                  <div className="hp-footer-col-title">Company</div>
                  <span className="hp-footer-link hp-footer-link--muted">About</span>
                  <span className="hp-footer-link hp-footer-link--muted">Blog</span>
                  <span className="hp-footer-link hp-footer-link--muted">Contact</span>
                </div>
                <div className="hp-footer-col">
                  <div className="hp-footer-col-title">Legal</div>
                  <span className="hp-footer-link hp-footer-link--muted">Privacy (PDPA)</span>
                  <span className="hp-footer-link hp-footer-link--muted">Terms of Use</span>
                  <span className="hp-footer-link hp-footer-link--muted">Cookie Policy</span>
                </div>
              </nav>
            </div>

            <div className="hp-footer-bottom">
              <span>© 2026 Gametime · Singapore</span>
            </div>
          </footer>
        </main>
      </div>
    </LayoutLanding>
  );
}
