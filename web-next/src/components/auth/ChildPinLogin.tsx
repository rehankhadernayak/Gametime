"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";

const NUMPAD: (number | "del" | null)[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [null, 0, "del"],
];

function BackspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        d="M21 4H7l-6 8 6 8h14V4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 9l-4 6m0-6l4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export type PinChildProfile = {
  id: string | null;
  name: string;
  parentEmail: string;
  avatarUrl: string | null;
  avatarColor: string;
};

type ChildPinLoginProps = {
  child: PinChildProfile;
  onSuccess: (token: string) => void;
  onSwitchUser: () => void;
  token?: string;
};

export function ChildPinLogin({ child, onSuccess, onSwitchUser, token }: ChildPinLoginProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [phase, setPhase] = useState<
    "idle" | "entering" | "verifying" | "shaking" | "locked" | "success"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);
  const lockoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (phase !== "locked") {
      if (lockoutRef.current) clearInterval(lockoutRef.current);
      return;
    }
    if (lockoutSecondsLeft <= 0) {
      setPhase("idle");
      setDigits([]);
      setAttemptsRemaining(3);
      setErrorMessage(null);
      return;
    }
    lockoutRef.current = setInterval(() => {
      setLockoutSecondsLeft((s) => {
        if (s <= 1) {
          if (lockoutRef.current) clearInterval(lockoutRef.current);
          setPhase("idle");
          setDigits([]);
          setAttemptsRemaining(3);
          setErrorMessage(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (lockoutRef.current) clearInterval(lockoutRef.current);
    };
  }, [phase, lockoutSecondsLeft]);

  const appendDigit = useCallback(
    (digit: number) => {
      if (["verifying", "locked", "shaking", "success"].includes(phase)) return;
      setDigits((prev) => {
        if (prev.length >= 4) return prev;
        return [...prev, String(digit)];
      });
      setPhase("entering");
    },
    [phase]
  );

  const deleteDigit = useCallback(() => {
    if (["verifying", "locked", "shaking", "success"].includes(phase)) return;
    setDigits((prev) => {
      const next = prev.slice(0, -1);
      if (next.length === 0) setPhase("idle");
      return next;
    });
  }, [phase]);

  const verify = useCallback(
    async (pin: string) => {
      setPhase("verifying");
      try {
        const res = await apiRequest<{ token: string }>("/auth/child-login-pin", {
          method: "POST",
          body: { parentEmail: child.parentEmail, childName: child.name, pin },
          token,
        });
        setPhase("success");
        setTimeout(() => onSuccess(res.token), 300);
      } catch (e: unknown) {
        const details = (e as { details?: { attemptsRemaining?: number } })?.details;
        const remaining = details?.attemptsRemaining ?? attemptsRemaining - 1;
        setAttemptsRemaining(remaining);

        if (remaining <= 0) {
          setPhase("locked");
          setLockoutSecondsLeft(30);
          setErrorMessage("Too many tries. Wait 30s and try again.");
          setDigits([]);
        } else {
          setErrorMessage(`Wrong PIN - ${remaining} tr${remaining === 1 ? "y" : "ies"} left`);
          setPhase("shaking");
          setTimeout(() => {
            setPhase("idle");
            setDigits([]);
            setErrorMessage(null);
          }, 600);
        }
      }
    },
    [attemptsRemaining, child.name, child.parentEmail, onSuccess, token]
  );

  useEffect(() => {
    if (digits.length === 4 && phase === "entering") {
      void verify(digits.join(""));
    }
  }, [digits, phase, verify]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") appendDigit(Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete") deleteDigit();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [appendDigit, deleteDigit]);

  const disabled = phase === "verifying" || phase === "locked" || phase === "success";

  return (
    <div className="cpl-wrap">
      <button type="button" className="cpl-back-btn" onClick={onSwitchUser} aria-label="Switch to a different user">
        ← Switch user
      </button>

      <div className="cpl-avatar-wrap">
        {child.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- runtime avatar URL from API
          <img src={child.avatarUrl} alt={`${child.name}'s avatar`} className="cpl-avatar-img" />
        ) : (
          <div
            className="cpl-avatar-fallback"
            style={{ background: child.avatarColor || "var(--bg-muted-action)" }}
            aria-hidden="true"
          >
            {child.name[0]}
          </div>
        )}
      </div>

      <h1 className="cpl-name">{child.name}</h1>

      <div
        className={`cpl-dots ${
          phase === "shaking" ? (reduceMotion ? "cpl-dots-error" : "cpl-dots-shake") : ""
        } ${phase === "verifying" ? "cpl-dots-verifying" : ""} ${phase === "success" ? "cpl-dots-success" : ""}`}
        aria-label={`PIN entry: ${digits.length} of 4 digits entered`}
        aria-live="polite"
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`cpl-dot ${i < digits.length ? "cpl-dot-filled" : ""} ${
              phase === "shaking" || (phase === "idle" && errorMessage) ? "cpl-dot-error" : ""
            } ${phase === "success" ? "cpl-dot-success" : ""} ${phase === "verifying" ? "cpl-dot-pulse" : ""}`}
          />
        ))}
      </div>

      {(phase === "shaking" || errorMessage) && phase !== "locked" && errorMessage && (
        <p className="cpl-error" role="alert">
          {errorMessage}
        </p>
      )}

      {phase === "locked" && (
        <p className="cpl-lockout" role="alert">
          Too many tries. Wait{" "}
          <span aria-live={lockoutSecondsLeft % 5 === 0 ? "polite" : "off"}>{lockoutSecondsLeft}s</span> and try again.
        </p>
      )}

      <div className="cpl-numpad" role="group" aria-label="PIN keypad">
        {NUMPAD.map((row, ri) => (
          <div key={ri} className="cpl-numpad-row">
            {row.map((key, ci) => {
              if (key === null) {
                return <div key={ci} className="cpl-numpad-spacer" />;
              }
              if (key === "del") {
                return (
                  <button
                    key="del"
                    type="button"
                    className="cpl-key cpl-key-del"
                    onClick={deleteDigit}
                    disabled={disabled || digits.length === 0}
                    aria-label="Delete last digit"
                  >
                    <BackspaceIcon />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  className="cpl-key cpl-key-digit"
                  onClick={() => appendDigit(key)}
                  disabled={disabled}
                  aria-label={String(key)}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
