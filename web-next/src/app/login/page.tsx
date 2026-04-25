"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LegacyAuthShell } from "@/components/LegacyAuthShell";
import { ParentLoginForm } from "@/components/auth/ParentLoginForm";
import { ChildLoginForm } from "@/components/auth/ChildLoginForm";

function LoginTabs() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"parent" | "child">("parent");

  useEffect(() => {
    setTab(searchParams.get("tab") === "child" ? "child" : "parent");
  }, [searchParams]);

  return (
    <div className="login-page-wrap">
      <div className="login-role-tabs al-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "parent"}
          className={`al-tab${tab === "parent" ? " al-tab--active" : ""}`}
          onClick={() => setTab("parent")}
        >
          Parent
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "child"}
          className={`al-tab${tab === "child" ? " al-tab--active" : ""}`}
          onClick={() => setTab("child")}
        >
          Child
        </button>
      </div>
      <div className="login-page-form-slot">
        {tab === "parent" ? <ParentLoginForm /> : <ChildLoginForm />}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <LegacyAuthShell>
      <Suspense fallback={<div className="al-root" style={{ minHeight: "60vh" }} />}>
        <LoginTabs />
      </Suspense>
    </LegacyAuthShell>
  );
}
