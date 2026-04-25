"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import ParentDashboard from "@gametime/frontend/pages/ParentDashboard.jsx";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";

function ParentTasksInner() {
  const router = useRouter();
  const { auth, authHydrated, switchToChild } = useGametimeAuth();

  useEffect(() => {
    if (!authHydrated) return;
    if (auth.role !== "parent") router.replace("/login");
  }, [auth.role, authHydrated, router]);

  if (!authHydrated || auth.role !== "parent") return null;

  return (
    <ParentDashboard
      token={auth.token}
      onSwitchToChild={switchToChild}
      parentName={auth.user?.name}
    />
  );
}

export default function ParentTasksPage() {
  return (
    <Suspense fallback={null}>
      <ParentTasksInner />
    </Suspense>
  );
}
