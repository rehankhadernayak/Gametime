"use client";

import Link from "next/link";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import type { GametimeAuthState } from "@/app/providers";
import { ChildPinLogin, type PinChildProfile } from "./ChildPinLogin";
import { saveAuth } from "./persistAuth";
import styles from "@/styles/auth.module.css";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

type ChildDirectResponse = { token: string; child: unknown };

export function ChildLoginForm() {
  const { replace } = useAppRouter();
  const { setAuth } = useGametimeAuth();
  const [mode, setMode] = useState<"email" | "pin">("email");
  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [pinForm, setPinForm] = useState({ parentEmail: "", childName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pinStep, setPinStep] = useState<"form" | "numpad">("form");
  const [pinChildProfile, setPinChildProfile] = useState<PinChildProfile | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "email") {
        const email = emailForm.email.trim();
        const password = emailForm.password.trim();
        if (!email || !password) throw new Error("Email and password are required.");
        if (!isValidEmail(email)) throw new Error("Enter a valid child email address.");

        const data = await apiRequest<ChildDirectResponse>("/auth/child-login-direct", {
          method: "POST",
          body: { email, password: emailForm.password },
        });
        const next: GametimeAuthState = {
          token: data.token,
          role: "child",
          user: data.child as GametimeAuthState["user"],
        };
        saveAuth({ token: next.token, role: "child", user: data.child });
        setAuth(next);
        replace("/child/dashboard");
      } else {
        const parentEmail = pinForm.parentEmail.trim();
        const childName = pinForm.childName.trim();
        if (!parentEmail || !childName) throw new Error("Parent email and child name are required.");
        if (!isValidEmail(parentEmail)) throw new Error("Enter a valid parent email address.");

        setPinChildProfile({
          id: null,
          name: childName,
          parentEmail,
          avatarUrl: null,
          avatarColor: "var(--gt-bg-soft)",
        });
        setPinStep("numpad");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  function handlePinSuccess(token: string) {
    if (!pinChildProfile) return;
    const next: GametimeAuthState = {
      token,
      role: "child",
      user: pinChildProfile as GametimeAuthState["user"],
    };
    saveAuth({ token, role: "child", user: pinChildProfile });
    setAuth(next);
    replace("/child/dashboard");
  }

  if (mode === "pin" && pinStep === "numpad" && pinChildProfile) {
    return (
      <ChildPinLogin
        child={pinChildProfile}
        onSuccess={handlePinSuccess}
        onSwitchUser={() => {
          setPinStep("form");
          setPinChildProfile(null);
          setError("");
        }}
      />
    );
  }

  return (
    <div className={styles.splitRoot}>
      <div className={`${styles.splitPromo} ${styles.splitPromoChild}`}>
        <div className={styles.splitPromoInner}>
          <div className={styles.splitLogoRow}>
            <div className={styles.splitLogoMark} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z"
                  fill="white"
                  fillOpacity="0.9"
                />
              </svg>
            </div>
            <span className={styles.splitBrandName}>Gametime</span>
          </div>

          <h2 className={styles.splitTagline}>
            Complete quests.
            <br />
            Earn your play time.
          </h2>
          <p className={styles.splitTaglineSub}>
            Finish tasks, collect RP, and unlock the gaming time you&apos;ve worked for.
          </p>

          <ul className={styles.splitFeatureList} aria-label="Child features">
            <li className={styles.splitFeatureItem}>
              <span className={styles.splitFeatureIcon} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 1.5L9.8 6H14.5L10.5 8.8L12 13.5L8 10.8L4 13.5L5.5 8.8L1.5 6H6.2L8 1.5Z"
                    stroke="white"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    fill="rgba(255,255,255,0.15)"
                  />
                </svg>
              </span>
              <span className={styles.splitFeatureText}>
                <strong>Earn RP for every quest</strong>
                <span>Photos prove you finished the job</span>
              </span>
            </li>
            <li className={styles.splitFeatureItem}>
              <span className={styles.splitFeatureIcon} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1.5" y="4" width="13" height="9" rx="1.5" stroke="white" strokeWidth="1.25" />
                  <path d="M5 4V3a3 3 0 0 1 6 0v1" stroke="white" strokeWidth="1.25" strokeLinecap="round" />
                  <circle cx="8" cy="8.5" r="1.5" fill="white" fillOpacity="0.85" />
                </svg>
              </span>
              <span className={styles.splitFeatureText}>
                <strong>Unlock real gift cards</strong>
                <span>Roblox, Steam, Razer Gold &amp; more</span>
              </span>
            </li>
            <li className={styles.splitFeatureItem}>
              <span className={styles.splitFeatureIcon} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.25" />
                  <path
                    d="M8 5v3.5l2 1.5"
                    stroke="white"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className={styles.splitFeatureText}>
                <strong>Track your gaming time</strong>
                <span>See sessions and daily caps clearly</span>
              </span>
            </li>
          </ul>
        </div>

        <p className={styles.splitTrust}>
          <span className={styles.splitTrustDot} aria-hidden="true" />
          Trusted by Singapore families
        </p>
      </div>

      <div className={styles.splitFormPanel}>
        <div className={styles.splitFormInner}>
          <h1 className={styles.splitHeading}>Child sign in</h1>
          <p className={styles.splitSubheading}>Choose how you want to sign in</p>

          <div className={styles.modeTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "email"}
              className={`${styles.modeTab}${mode === "email" ? ` ${styles.modeTabActive}` : ""}`}
              onClick={() => {
                setMode("email");
                setError("");
              }}
            >
              Sign in with password
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "pin"}
              className={`${styles.modeTab}${mode === "pin" ? ` ${styles.modeTabActive}` : ""}`}
              onClick={() => {
                setMode("pin");
                setError("");
                setPinStep("form");
              }}
            >
              Sign in with PIN
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {mode === "email" ? (
              <>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="cl-email">
                    Child Email
                  </label>
                  <div className={styles.inputWrap}>
                    <input
                      id="cl-email"
                      className={styles.input}
                      type="email"
                      placeholder="child@email.com"
                      autoComplete="email"
                      required
                      value={emailForm.email}
                      onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="cl-password">
                    Password
                  </label>
                  <div className={styles.inputWrap}>
                    <input
                      id="cl-password"
                      className={`${styles.input} ${styles.inputHasToggle}`}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className={styles.togglePw}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path
                            d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4.2 4.3C2.8 5.2 1.8 6.5 1.5 8c.8 3 3.9 5 6.5 5 1.3 0 2.5-.4 3.5-1.1M6.5 3.1C7 3 7.5 3 8 3c2.6 0 5.7 2 6.5 5-.3 1-.8 1.9-1.5 2.6"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <ellipse cx="8" cy="8" rx="6.5" ry="4" stroke="currentColor" strokeWidth="1.3" />
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" className={`${styles.btn} ${styles.btnChild}`} disabled={loading}>
                  {loading ? (
                    <>
                      <svg className={styles.spinner} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                        <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </>
            ) : (
              <>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="cl-parent-email">
                    Parent Email
                  </label>
                  <div className={styles.inputWrap}>
                    <input
                      id="cl-parent-email"
                      className={styles.input}
                      type="email"
                      placeholder="parent@email.com"
                      autoComplete="off"
                      required
                      value={pinForm.parentEmail}
                      onChange={(e) => setPinForm({ ...pinForm, parentEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="cl-child-name">
                    Your Name
                  </label>
                  <div className={styles.inputWrap}>
                    <input
                      id="cl-child-name"
                      className={styles.input}
                      type="text"
                      placeholder="What your parents call you"
                      autoComplete="off"
                      required
                      value={pinForm.childName}
                      onChange={(e) => setPinForm({ ...pinForm, childName: e.target.value })}
                    />
                  </div>
                </div>

                <p className={styles.pinHint}>You&apos;ll enter your 4-digit PIN on the next screen.</p>

                {error && (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" className={`${styles.btn} ${styles.btnChild}`} disabled={loading}>
                  {loading ? (
                    <>
                      <svg className={styles.spinner} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                        <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Looking up…
                    </>
                  ) : (
                    <>Continue →</>
                  )}
                </button>
              </>
            )}
          </form>

          <div className={styles.footerLinks}>
            <span className={styles.footerText}>
              Parent?{" "}
              <Link href="/login" className={styles.link}>
                Use parent login
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
