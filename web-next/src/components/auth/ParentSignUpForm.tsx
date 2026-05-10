"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import type { GametimeAuthState } from "@/app/providers";
import { saveAuth } from "./persistAuth";
import { syncDashboardSessionCookies } from "@/lib/auth/syncWebSession";
import styles from "@/styles/auth.module.css";

const AGES = ["Under 1", ...Array.from({ length: 18 }, (_, i) => `${i + 1}`), "18+"];
const GRADES = [
  "Pre-K",
  "Kindergarten",
  ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
  "Not in school",
];
const NUM_CHILDREN_OPTS = ["None (just setting up)", "1", "2", "3", "4", "5 or more"];
const CONCERN_OPTS = [
  "Too much screen time",
  "Inappropriate game content",
  "In-app purchases / spending",
  "Online social interactions",
  "Other",
];
const REFERRAL_OPTS = [
  "Social media",
  "Friend or family recommendation",
  "App store or search",
  "Blog, podcast, or article",
  "Other",
];

type SignupAnswers = {
  name: string;
  email: string;
  numChildren: string;
  children: { age: string; grade: string }[];
  primaryConcern: string;
  referralSource: string;
};

type SignupResponse = { token: string; parent: unknown };

function PasswordStep({
  answers,
  onCreated,
}: {
  answers: SignupAnswers;
  onCreated: (data: { token: string; parent: unknown }) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest<SignupResponse>("/auth/signup", {
        method: "POST",
        body: { name: answers.name, email: answers.email, password },
      });
      localStorage.setItem(
        "gametime_signup_context",
        JSON.stringify({
          numChildren: answers.numChildren || "",
          children: answers.children || [],
          primaryConcern: answers.primaryConcern || "",
          referralSource: answers.referralSource || "",
        })
      );
      localStorage.setItem("gametime_new_parent", "1");
      onCreated({ token: data.token, parent: data.parent });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account. Please check your email and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.signupStep}>
      <div className={styles.signupStepQuestion}>
        <p className={styles.signupStepNum}>Final step</p>
        <h2 className={styles.signupStepLabel}>Create a secure password</h2>
        <p className={styles.signupStepHint}>At least 8 characters.</p>
      </div>
      <form onSubmit={handleSubmit} className={styles.signupPasswordFields}>
        <label className={styles.signupFieldLabel}>
          Password
          <input
            type="password"
            className={styles.signupTextInput}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label className={styles.signupFieldLabel}>
          Confirm password
          <input
            type="password"
            className={styles.signupTextInput}
            placeholder="Re-enter password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>
        {error && (
          <p className={styles.signupFieldError} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={styles.signupNextBtn} disabled={busy}>
          {busy ? "Creating your account..." : "Create My Account"}
        </button>
      </form>
    </div>
  );
}

function ChildrenTable({
  data,
  onChange,
  onContinue,
}: {
  data: { age: string; grade: string }[];
  onChange: (rows: { age: string; grade: string }[]) => void;
  onContinue: () => void;
}) {
  function update(idx: number, field: "age" | "grade", val: string) {
    const next = data.map((row, i) => (i === idx ? { ...row, [field]: val } : row));
    onChange(next);
  }

  const allAgesSet = data.every((row) => row.age !== "");
  const canAdd = data.length < 10;

  return (
    <div className={styles.signupStep}>
      <div className={styles.signupStepQuestion}>
        <p className={styles.signupStepNum}>Step 4 of 6</p>
        <h2 className={styles.signupStepLabel}>Tell us about your children</h2>
        <p className={styles.signupStepHint}>Age is required. Grade is optional.</p>
      </div>

      <div className={styles.signupChildrenTableWrap}>
        <table className={styles.signupChildrenTable}>
          <thead>
            <tr>
              <th>Child</th>
              <th>
                Age <span className={styles.requiredStar}>*</span>
              </th>
              <th>
                Grade <span className={styles.optionalLabel}>(optional)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td className={styles.signupChildLabel}>Child {idx + 1}</td>
                <td>
                  <select
                    className={styles.signupTableSelect}
                    value={row.age}
                    onChange={(e) => update(idx, "age", e.target.value)}
                  >
                    <option value="">Select age</option>
                    {AGES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className={styles.signupTableSelect}
                    value={row.grade}
                    onChange={(e) => update(idx, "grade", e.target.value)}
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {canAdd && (
          <button type="button" className={styles.signupAddChildBtn} onClick={() => onChange([...data, { age: "", grade: "" }])}>
            + Add Another Child
          </button>
        )}
      </div>

      <button type="button" className={styles.signupNextBtn} disabled={!allAgesSet} onClick={onContinue}>
        Continue
      </button>
      {!allAgesSet && <p className={styles.signupFieldError}>Please select an age for each child to continue.</p>}
    </div>
  );
}

function McqStep({
  stepNum,
  label,
  hint,
  options,
  value,
  otherText,
  onChange,
  onOtherText,
  onContinue,
}: {
  stepNum: string;
  label: string;
  hint?: string;
  options: string[];
  value: string;
  otherText: string;
  onChange: (v: string) => void;
  onOtherText: (v: string) => void;
  onContinue: () => void;
}) {
  const showOther = value === "Other";
  const canContinue = Boolean(value && (value !== "Other" || otherText.trim()));

  return (
    <div className={styles.signupStep}>
      <div className={styles.signupStepQuestion}>
        <p className={styles.signupStepNum}>{stepNum}</p>
        <h2 className={styles.signupStepLabel}>{label}</h2>
        {hint && <p className={styles.signupStepHint}>{hint}</p>}
      </div>

      <div className={styles.signupChoices}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`${styles.signupChoiceBtn}${value === opt ? ` ${styles.signupChoiceBtnSelected}` : ""}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}

        {showOther && (
          <input
            autoFocus
            type="text"
            className={`${styles.signupTextInput} ${styles.signupOtherInput}`}
            placeholder="Please specify..."
            value={otherText}
            onChange={(e) => onOtherText(e.target.value)}
          />
        )}

        {value && (
          <button type="button" className={styles.signupNextBtn} disabled={!canContinue} onClick={onContinue}>
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

function buildInitialChildren(numStr: string) {
  const counts: Record<string, number> = {
    "None (just setting up)": 0,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5 or more": 5,
  };
  const n = counts[numStr] ?? 1;
  return Array.from({ length: n }, () => ({ age: "", grade: "" }));
}

function resolveValue(selected: string, otherText: string) {
  return selected === "Other" ? otherText.trim() || "Other" : selected;
}

export function ParentSignUpForm() {
  const { replace } = useAppRouter();
  const { setAuth } = useGametimeAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const STEPS = ["name", "email", "numChildren", "children", "concern", "referral", "password"] as const;

  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [numChildren, setNumChildren] = useState("");
  const [childrenData, setChildrenData] = useState<{ age: string; grade: string }[]>([]);
  const [concern, setConcern] = useState("");
  const [concernOther, setConcernOther] = useState("");
  const [referral, setReferral] = useState("");
  const [referralOther, setReferralOther] = useState("");
  const [textVal, setTextVal] = useState("");
  const [textErr, setTextErr] = useState("");
  const [animating, setAnimating] = useState(false);

  const stepId = STEPS[stepIdx];
  const isDone = stepId === "password";
  const isNoChildren = numChildren === "None (just setting up)";
  const totalSteps = isNoChildren ? 6 : 7;
  const displayStep = stepIdx + 1;
  const pct = isDone ? 100 : Math.round((stepIdx / (STEPS.length - 1)) * 100);

  useEffect(() => {
    setTextVal(stepId === "name" ? name : stepId === "email" ? email : "");
    setTextErr("");
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps -- sync text field on step change only

  function advance() {
    setAnimating(true);
    setTimeout(() => {
      setStepIdx((prev) => {
        let next = prev + 1;
        if (STEPS[next] === "children" && isNoChildren) next += 1;
        return next;
      });
      setAnimating(false);
    }, 200);
  }

  function handleTextNext(e: React.FormEvent) {
    e.preventDefault();
    const val = textVal.trim();
    if (!val) {
      setTextErr("Please fill in this field to continue.");
      return;
    }
    if (stepId === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setTextErr("Please enter a valid email address.");
      return;
    }
    if (stepId === "name") setName(val);
    if (stepId === "email") setEmail(val);
    setTextErr("");
    advance();
  }

  function handleNumChildrenSelect(opt: string) {
    setNumChildren(opt);
    const rows = buildInitialChildren(opt);
    setChildrenData(rows);
    setAnimating(true);
    setTimeout(() => {
      setStepIdx((p) => p + 1);
      setAnimating(false);
    }, 200);
  }

  async function handleAuth(data: { token: string; parent: unknown }) {
    const next: GametimeAuthState = {
      token: data.token,
      role: "parent",
      user: data.parent as GametimeAuthState["user"],
    };
    saveAuth({ token: data.token, role: "parent", user: data.parent });
    setAuth(next);
    await syncDashboardSessionCookies(data.token);
    replace("/parent/dashboard");
  }

  const answers: SignupAnswers = {
    name,
    email,
    numChildren,
    children: childrenData,
    primaryConcern: resolveValue(concern, concernOther),
    referralSource: resolveValue(referral, referralOther),
  };

  return (
    <div className={styles.signupRoot}>
      <div className={styles.signupPromo}>
        <div className={styles.signupBrandBlock}>
          <div className={styles.signupBrandLogo} aria-hidden="true">
            <Image
              src="/gametime-mark.svg"
              alt=""
              width={32}
              height={32}
              className={styles.signupBrandLogoImg}
              draggable={false}
            />
          </div>
          <h1 className={styles.signupBrandName}>Gametime</h1>
          <p className={styles.signupBrandTagline}>Family gaming, fairly managed.</p>
        </div>
        <ul className={styles.signupFeatureList} aria-label="Key features">
          <li>
            <span className={styles.signupFeatureDot} aria-hidden="true" />
            6 quick questions, then your account is ready
          </li>
          <li>
            <span className={styles.signupFeatureDot} aria-hidden="true" />
            Tailored quests and rewards built around your family
          </li>
          <li>
            <span className={styles.signupFeatureDot} aria-hidden="true" />
            Full control over gaming time, rules, and settings
          </li>
        </ul>
      </div>

      <div className={styles.signupFormColumn}>
        <div className={styles.signupFormInner}>
          <div className={styles.signupProgressBar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={styles.signupProgressFill} style={{ width: `${pct}%` }} />
          </div>

          {!isDone && <p className={styles.signupStepCounter}>Question {displayStep} of {totalSteps}</p>}

          <div className={`${styles.signupStepContent}${animating ? ` ${styles.signupStepContentFade}` : ""}`}>
            {stepId === "name" && (
              <div className={styles.signupStep}>
                <div className={styles.signupStepQuestion}>
                  <p className={styles.signupStepNum}>Step 1 of {totalSteps}</p>
                  <h2 className={styles.signupStepLabel}>What is your full name?</h2>
                  <p className={styles.signupStepHint}>We will use this to personalise your dashboard.</p>
                </div>
                <form className={styles.signupTextForm} onSubmit={handleTextNext}>
                  <input
                    ref={inputRef}
                    type="text"
                    className={styles.signupTextInput}
                    placeholder="e.g. Jane Smith"
                    value={textVal}
                    onChange={(e) => {
                      setTextVal(e.target.value);
                      setTextErr("");
                    }}
                    autoComplete="name"
                  />
                  {textErr && (
                    <p className={styles.signupFieldError} role="alert">
                      {textErr}
                    </p>
                  )}
                  <button type="submit" className={styles.signupNextBtn} disabled={!textVal.trim()}>
                    Continue
                  </button>
                </form>
              </div>
            )}

            {stepId === "email" && (
              <div className={styles.signupStep}>
                <div className={styles.signupStepQuestion}>
                  <p className={styles.signupStepNum}>Step 2 of {totalSteps}</p>
                  <h2 className={styles.signupStepLabel}>What is your email address?</h2>
                  <p className={styles.signupStepHint}>Your login email. We never share it.</p>
                </div>
                <form className={styles.signupTextForm} onSubmit={handleTextNext}>
                  <input
                    ref={inputRef}
                    type="email"
                    className={styles.signupTextInput}
                    placeholder="e.g. jane@example.com"
                    value={textVal}
                    onChange={(e) => {
                      setTextVal(e.target.value);
                      setTextErr("");
                    }}
                    autoComplete="email"
                  />
                  {textErr && (
                    <p className={styles.signupFieldError} role="alert">
                      {textErr}
                    </p>
                  )}
                  <button type="submit" className={styles.signupNextBtn} disabled={!textVal.trim()}>
                    Continue
                  </button>
                </form>
              </div>
            )}

            {stepId === "numChildren" && (
              <div className={styles.signupStep}>
                <div className={styles.signupStepQuestion}>
                  <p className={styles.signupStepNum}>Step 3 of {totalSteps}</p>
                  <h2 className={styles.signupStepLabel}>How many children will use Gametime?</h2>
                  <p className={styles.signupStepHint}>You can add more later in Settings.</p>
                </div>
                <div className={styles.signupChoices}>
                  {NUM_CHILDREN_OPTS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`${styles.signupChoiceBtn}${numChildren === opt ? ` ${styles.signupChoiceBtnSelected}` : ""}`}
                      onClick={() => handleNumChildrenSelect(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stepId === "children" && (
              <ChildrenTable data={childrenData} onChange={setChildrenData} onContinue={advance} />
            )}

            {stepId === "concern" && (
              <McqStep
                stepNum={`Step ${isNoChildren ? 4 : 5} of ${totalSteps}`}
                label="What is your biggest concern about your kids' gaming?"
                options={CONCERN_OPTS}
                value={concern}
                otherText={concernOther}
                onChange={setConcern}
                onOtherText={setConcernOther}
                onContinue={advance}
              />
            )}

            {stepId === "referral" && (
              <McqStep
                stepNum={`Step ${isNoChildren ? 5 : 6} of ${totalSteps}`}
                label="How did you hear about Gametime?"
                options={REFERRAL_OPTS}
                value={referral}
                otherText={referralOther}
                onChange={setReferral}
                onOtherText={setReferralOther}
                onContinue={advance}
              />
            )}

            {isDone && <PasswordStep answers={answers} onCreated={handleAuth} />}
          </div>

          <div className={styles.legalFooterRow}>
            <Link href="/privacy" className={styles.legalFooterLink}>
              Privacy Policy
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms" className={styles.legalFooterLink}>
              Terms of Service
            </Link>
          </div>

          <p className={styles.signupLoginLink}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
