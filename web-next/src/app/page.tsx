"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { GametimeLink } from "@/components/GametimeLink";
import landingStyles from "@/styles/landing.module.css";
import gtBtn from "@/components/ui/GTButton.module.css";
import heroStyles from "./page.module.css";

type AuthState = { token: string | null };

const HEADLINE = "Screen time, earned.";
const WORDS = HEADLINE.split(" ");
const HEADLINE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const HEADLINE_DURATION = 0.8;
const WORD_STAGGER = 0.12;

const UNSPLASH = {
  mission:
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  scan: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
  rewards:
    "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80",
} as const;

function IconArrow() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M4 10h12M11 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavBar({ auth }: { auth: AuthState }) {
  if (auth.token) return null;
  return (
    <nav className={landingStyles.nav} aria-label="Site navigation">
      <div className={landingStyles.navInner}>
        <GametimeLink to="/" className={landingStyles.navLogo} aria-label="Gametime home">
          Gametime
        </GametimeLink>
        <div className={landingStyles.navActions}>
          <GametimeLink to="/login" className={landingStyles.navLink}>
            Parent Login
          </GametimeLink>
          <GametimeLink to="/signup" className={landingStyles.navCta}>
            Get Started
          </GametimeLink>
        </div>
      </div>
    </nav>
  );
}

function PremiumHero() {
  const reduceMotion = useReducedMotion();
  const headlineEnd = (WORDS.length - 1) * WORD_STAGGER + HEADLINE_DURATION;
  const ctaDelay = reduceMotion ? 0 : headlineEnd + 0.2;

  const wordTransition = reduceMotion
    ? { duration: 0.25, ease: HEADLINE_EASE }
    : { duration: HEADLINE_DURATION, ease: HEADLINE_EASE };

  const wordInitial = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 30, filter: "blur(10px)" };

  const wordAnimate = reduceMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, filter: "blur(0px)" };

  const ctaTransition = reduceMotion
    ? { duration: 0.2, ease: HEADLINE_EASE }
    : { duration: 0.55, ease: HEADLINE_EASE, delay: ctaDelay };

  const ctaClass = `${gtBtn.button} ${gtBtn.secondary} ${gtBtn.lg} ${heroStyles.ctaGlass}`;

  return (
    <section className={heroStyles.hero} aria-label="Welcome">
      <div className={heroStyles.meshLayer} aria-hidden="true" />
      <div className={`${heroStyles.meshOrb} ${heroStyles.meshOrbA}`} aria-hidden="true" />
      <div className={`${heroStyles.meshOrb} ${heroStyles.meshOrbB}`} aria-hidden="true" />
      <div className={`${heroStyles.meshOrb} ${heroStyles.meshOrbC}`} aria-hidden="true" />

      <div className={heroStyles.heroInner}>
        <h1 className={heroStyles.heroTitle}>
          {WORDS.map((word, i) => (
            <motion.span
              key={`${word}-${i}`}
              className={heroStyles.word}
              initial={wordInitial}
              animate={wordAnimate}
              transition={{
                ...wordTransition,
                delay: reduceMotion ? 0 : i * WORD_STAGGER,
              }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.div
          className={heroStyles.ctaRow}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ctaTransition}
        >
          <GametimeLink to="/login" className={ctaClass}>
            Parent Sign In
          </GametimeLink>
          <GametimeLink to="/child-login" className={ctaClass}>
            Child Login
          </GametimeLink>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesBentoSection() {
  const reduceMotion = useReducedMotion();

  const reveal = (delay = 0) =>
    ({
      initial: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-100px" } as const,
      transition: reduceMotion
        ? { duration: 0 }
        : { duration: 0.55, ease: HEADLINE_EASE, delay },
    }) as const;

  return (
    <section className="hp-features" aria-labelledby="hp-features-heading">
      <style>{`
        .hp-features {
          background: var(--gt-bg-soft, #f4f4f5);
          color: var(--gt-ink, #0a0a0a);
          border-top: 1px solid var(--gt-line, rgba(0,0,0,0.08));
        }
        @media (prefers-color-scheme: dark) {
          .hp-features {
            background: #141416;
            color: var(--foreground, #ededed);
            border-top-color: rgba(255,255,255,0.08);
          }
        }
        .hp-features__inner {
          max-width: 80rem;
          margin-left: auto;
          margin-right: auto;
          padding: 6rem 1.5rem;
        }
        .hp-features__title {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.15;
          text-align: center;
          max-width: 42rem;
          margin: 0 auto 3rem;
        }
        .hp-features__grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 768px) {
          .hp-features__grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .hp-features__card--wide {
            grid-column: span 2;
          }
          .hp-features__card--full {
            grid-column: span 3;
          }
        }
        .hp-features__card {
          display: flex;
          flex-direction: column;
          border-radius: 1rem;
          padding: 1.25rem;
          background: var(--gt-bg, #fff);
          border: 1px solid var(--gt-line, rgba(0,0,0,0.08));
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        @media (prefers-color-scheme: dark) {
          .hp-features__card {
            background: #18181b;
            border-color: rgba(255,255,255,0.1);
            box-shadow: none;
          }
        }
        .hp-features__media {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          margin-bottom: 1.25rem;
          border-radius: 0.5rem;
          overflow: hidden;
          background: var(--gt-bg-soft, #f4f4f5);
        }
        .hp-features__media img {
          object-fit: cover;
        }
        .hp-features__card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }
        .hp-features__card p {
          font-size: 0.9375rem;
          line-height: 1.55;
          color: var(--gt-ink-soft, #52525b);
          margin: 0;
        }
        @media (prefers-color-scheme: dark) {
          .hp-features__card p {
            color: #a1a1aa;
          }
        }
      `}</style>

      <div className="hp-features__inner">
        <h2 id="hp-features-heading" className="hp-features__title">
          Manage the chaos. Reward the effort.
        </h2>

        <div className="hp-features__grid">
          <motion.article
            className="hp-features__card hp-features__card--wide"
            {...reveal(0)}
          >
            <div className="hp-features__media">
              <Image
                src={UNSPLASH.mission}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 66vw"
                className="rounded-lg object-cover"
                priority={false}
              />
            </div>
            <h3>Mission Control</h3>
            <p>
              One dashboard for chores, homework, and screen time—so nothing slips through the cracks.
            </p>
          </motion.article>

          <motion.article className="hp-features__card" {...reveal(0.08)}>
            <div className="hp-features__media">
              <Image
                src={UNSPLASH.scan}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="rounded-lg object-cover"
              />
            </div>
            <h3>Scan Evidence</h3>
            <p>Kids submit a quick photo or clip; you review proof in seconds, not nagging sessions.</p>
          </motion.article>

          <motion.article className="hp-features__card hp-features__card--full" {...reveal(0.16)}>
            <div className="hp-features__media">
              <Image
                src={UNSPLASH.rewards}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 100vw"
                className="rounded-lg object-cover"
              />
            </div>
            <h3>Instant Rewards</h3>
            <p>
              Turn completed tasks into credits they care about—fair, visible, and ready the moment you approve.
            </p>
          </motion.article>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [auth, setAuth] = useState<AuthState>({ token: null });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: { token?: string | null }) => {
        if (!cancelled) setAuth({ token: data?.token ?? null });
      })
      .catch(() => {
        if (!cancelled) setAuth({ token: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={landingStyles.root}>
      <NavBar auth={auth} />

      <main role="main">
        <PremiumHero />

        <FeaturesBentoSection />

        {!auth.token && (
          <section className={landingStyles.closing} aria-labelledby="hp-closing-heading">
            <div className={landingStyles.closingInner}>
              <h2 id="hp-closing-heading" className={landingStyles.closingH2}>
                Ready to start?
              </h2>
              <GametimeLink to="/signup" className={`${landingStyles.btnPrimary} ${landingStyles.btnLg}`}>
                Get Started <IconArrow />
              </GametimeLink>
            </div>
          </section>
        )}

        <footer className={landingStyles.footer} role="contentinfo">
          <div className={landingStyles.footerInner}>
            <span className={landingStyles.footerLogo}>Gametime</span>
            <span className={landingStyles.footerMeta}>© 2026 · Singapore</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
