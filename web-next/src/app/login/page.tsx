"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ParentLoginForm } from "@/components/auth/ParentLoginForm";
import { ChildLoginForm } from "@/components/auth/ChildLoginForm";
import styles from "@/styles/auth.module.css";
import meshStyles from "./mesh.module.css";

function LoginTabs() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"parent" | "child">("parent");

  useEffect(() => {
    setTab(searchParams.get("tab") === "child" ? "child" : "parent");
  }, [searchParams]);

  return (
    <div className={styles.loginInner}>
      <div className={styles.loginRoleTabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "parent"}
          className={`${styles.loginRoleTab}${tab === "parent" ? ` ${styles.loginRoleTabActive}` : ""}`}
          onClick={() => setTab("parent")}
        >
          Parent
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "child"}
          className={`${styles.loginRoleTab}${tab === "child" ? ` ${styles.loginRoleTabActive}` : ""}`}
          onClick={() => setTab("child")}
        >
          Child
        </button>
      </div>
      <div className={styles.loginFormSlot}>{tab === "parent" ? <ParentLoginForm /> : <ChildLoginForm />}</div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={meshStyles.meshRoot}>
      <div className={styles.authPage}>
        <Suspense fallback={<div className={styles.suspenseFallback} />}>
          <LoginTabs />
        </Suspense>
      </div>
    </div>
  );
}
