"use client";

import { motion, useReducedMotion } from "framer-motion";
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

function IconAI() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path
        d="M12 2a5 5 0 0 1 5 5c0 1.5-.66 2.85-1.7 3.77L17 17H7l1.7-6.23A5 5 0 0 1 12 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 17v1a3 3 0 0 0 6 0v-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7v10M9.5 9.5C9.5 8.4 10.6 7 12 7s2.5 1.4 2.5 2.5c0 2.5-5 2.5-5 5 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 12.5l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
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

        <section id="bento" className={landingStyles.bentoSection} aria-label="Features">
          <div className={landingStyles.parallaxWord} aria-hidden="true">
            GAMETIME
          </div>

          <div className={landingStyles.bentoInner}>
            <div className={landingStyles.bentoHeadingWrap}>
              <h2 className={landingStyles.bentoHeading}>How it works.</h2>
            </div>

            <div className={landingStyles.bentoGrid}>
              <article className={`${landingStyles.bentoCard} ${landingStyles.bentoCardTall}`}>
                <div className={landingStyles.bentoIcon}>
                  <IconAI />
                </div>
                <div className={landingStyles.bentoLabel}>Card 1</div>
                <h3 className={landingStyles.bentoTitle}>AI Evidence</h3>
                <p className={landingStyles.bentoDesc}>Simple photo proof.</p>
                <div className={landingStyles.bentoProgress}>
                  <div className={landingStyles.bentoProgressFill} style={{ width: "78%" }} />
                </div>
              </article>

              <article className={landingStyles.bentoCard}>
                <div className={landingStyles.bentoIcon}>
                  <IconCoin />
                </div>
                <div className={landingStyles.bentoLabel}>Card 2</div>
                <h3 className={landingStyles.bentoTitle}>Points</h3>
                <p className={landingStyles.bentoDesc}>Earn Gold &amp; RP.</p>
                <div className={landingStyles.bentoProgress}>
                  <div className={landingStyles.bentoProgressFill} style={{ width: "54%" }} />
                </div>
              </article>

              <article className={`${landingStyles.bentoCard} ${landingStyles.bentoCardWide}`}>
                <div className={landingStyles.bentoIcon}>
                  <IconShield />
                </div>
                <div className={landingStyles.bentoLabel}>Card 3</div>
                <h3 className={landingStyles.bentoTitle}>Controls</h3>
                <p className={landingStyles.bentoDesc}>Stop gaming instantly.</p>
                <div className={landingStyles.bentoProgress}>
                  <div className={landingStyles.bentoProgressFill} style={{ width: "92%" }} />
                </div>
              </article>
            </div>
          </div>
        </section>

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
