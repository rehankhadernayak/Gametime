"use client";

import { LegacyAuthShell } from "@/components/LegacyAuthShell";
import { ParentSignUpForm } from "@/components/auth/ParentSignUpForm";

export default function SignUpPage() {
  return (
    <LegacyAuthShell>
      <ParentSignUpForm />
    </LegacyAuthShell>
  );
}
