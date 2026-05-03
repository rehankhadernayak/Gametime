"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import { ParentTheme, GTCard, GTButton, GTBadge } from "@/components/ui";
import styles from "./family.module.css";

type ParentFamilyRole = "admin" | "co-parent";

type MockParent = {
  id: string;
  name: string;
  email: string;
  role: ParentFamilyRole;
};

type MockChild = {
  id: string;
  name: string;
  ageLabel: string;
};

const MOCK_PARENTS: MockParent[] = [
  { id: "p1", name: "Alex Tan", email: "alex@example.com", role: "admin" },
  { id: "p2", name: "Jordan Lee", email: "jordan@example.com", role: "co-parent" },
];

const MOCK_CHILDREN: MockChild[] = [
  { id: "c1", name: "Sam", ageLabel: "Age 9" },
  { id: "c2", name: "Riley", ageLabel: "Age 12" },
  { id: "c3", name: "Morgan", ageLabel: "Age 6" },
];

function roleBadgeTone(role: ParentFamilyRole): "accent" | "info" {
  return role === "admin" ? "accent" : "info";
}

function roleLabel(role: ParentFamilyRole): string {
  return role === "admin" ? "Admin" : "Co-parent";
}

function randomSixDigitCode(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

function FamilySettingsInner() {
  const router = useRouter();
  const { auth, authHydrated } = useGametimeAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpires, setInviteExpires] = useState<string | null>(null);

  useEffect(() => {
    if (!authHydrated) return;
    if (auth.role !== "parent") router.replace("/login");
  }, [auth.role, authHydrated, router]);

  const parents = useMemo(() => MOCK_PARENTS, []);
  const children = useMemo(() => MOCK_CHILDREN, []);

  const handleGenerateInvite = useCallback(() => {
    const code = randomSixDigitCode();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    setInviteCode(code);
    setInviteExpires(expires.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));
    toast.success("Invite code ready", {
      description: "Share this code on the child device to join this family (mock).",
    });
  }, []);

  if (auth.role !== "parent") return null;

  return (
    <ParentTheme>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <p className={styles.heroEyebrow}>Household</p>
          <h1 className={styles.heroTitle}>Family account</h1>
          <p className={styles.heroSub}>
            Two parent seats (admin and co-parent) and unlimited children. Data below is mock UI until the
            API is wired.
          </p>
        </header>

        <div className={styles.stack}>
          <GTCard title="Parents" description="Up to two adults on this family account.">
            <div>
              {parents.map((p) => (
                <div key={p.id} className={styles.row}>
                  <div className={styles.nameBlock}>
                    <p className={styles.name}>{p.name}</p>
                    <p className={styles.meta}>{p.email}</p>
                  </div>
                  <GTBadge tone={roleBadgeTone(p.role)}>{roleLabel(p.role)}</GTBadge>
                </div>
              ))}
            </div>
          </GTCard>

          <GTCard title="Children" description="Everyone linked to this family can use their own device.">
            <div>
              {children.map((c) => (
                <div key={c.id} className={styles.row}>
                  <div className={styles.nameBlock}>
                    <p className={styles.name}>{c.name}</p>
                    <p className={styles.meta}>{c.ageLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </GTCard>

          <GTCard
            title="Add a child device"
            description="Generate a short code for pairing a new tablet or phone with this family."
          >
            <div className={styles.actions}>
              <GTButton type="button" variant="primary" onClick={handleGenerateInvite}>
                Generate invite code
              </GTButton>
            </div>
            {inviteCode ? (
              <div className={styles.invitePanel}>
                <p className={styles.inviteLabel}>Active code</p>
                <p className={styles.code}>{inviteCode}</p>
                {inviteExpires ? (
                  <p className={styles.inviteHint}>Expires {inviteExpires} (mock expiry — 24 hours from generation).</p>
                ) : null}
              </div>
            ) : (
              <p className={styles.inviteHint}>No code yet. Generate one when you are ready to pair a device.</p>
            )}
          </GTCard>
        </div>
      </div>
    </ParentTheme>
  );
}

export default function ParentFamilySettingsPage() {
  return (
    <Suspense fallback={null}>
      <FamilySettingsInner />
    </Suspense>
  );
}
